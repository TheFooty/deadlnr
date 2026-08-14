import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    const challengeCookie = request.cookies.get('deadlnr_otp_challenge')?.value;
    if (!challengeCookie) {
      return NextResponse.json({ error: 'Verification code expired or not found. Please request a new code.' }, { status: 400 });
    }

    // Decrypt challenge payload
    const secretKey = process.env.ENCRYPTION_KEY || 'deadlnr_secret_key_32_bytes_len_1234';
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const iv = Buffer.alloc(16, 0);

    let decrypted = '';
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      decrypted = decipher.update(challengeCookie, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
    } catch (decryptErr) {
      return NextResponse.json({ error: 'Invalid verification token.' }, { status: 400 });
    }

    const payload = JSON.parse(decrypted);

    if (Date.now() > payload.expiresAt) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new code.' }, { status: 400 });
    }

    if (payload.email !== cleanEmail || payload.code !== cleanToken) {
      return NextResponse.json({ error: 'Invalid verification code. Please check your email and try again.' }, { status: 400 });
    }

    // Verification successful!
    const response = NextResponse.json({
      success: true,
      email: cleanEmail,
    });

    const maxAge = 31536000; // 1 year

    response.cookies.set('deadlnr_user_email', cleanEmail, {
      path: '/',
      maxAge,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    response.cookies.set('deadlnr_session', 'authenticated', {
      path: '/',
      maxAge,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    // Clear challenge cookie
    response.cookies.set('deadlnr_otp_challenge', '', { path: '/', maxAge: 0 });

    // Sync credentials & settings between local device and Supabase account
    try {
      const supabase = await createClient();

      const localFeedEnc = request.cookies.get('deadlnr_feed_url')?.value;
      const localAi = request.cookies.get('deadlnr_preferred_ai')?.value;
      const localTheme = request.cookies.get('deadlnr_theme')?.value;

      // 1. Check existing DB credentials for this email
      const { data: dbCreds } = await supabase
        .from('canvas_credentials')
        .select('encrypted_feed_url')
        .ilike('user_email', cleanEmail)
        .maybeSingle();

      if (dbCreds?.encrypted_feed_url) {
        // Feed exists in DB -> Sync to this device's cookies!
        response.cookies.set('deadlnr_feed_url', dbCreds.encrypted_feed_url, {
          path: '/',
          maxAge,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        });
      } else if (localFeedEnc) {
        // Feed exists locally -> Resiliently save to DB for this account!
        const { data: existing } = await supabase
          .from('canvas_credentials')
          .select('user_email')
          .ilike('user_email', cleanEmail)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('canvas_credentials')
            .update({
              encrypted_feed_url: localFeedEnc,
              updated_at: new Date().toISOString(),
            })
            .ilike('user_email', cleanEmail);
        } else {
          await supabase
            .from('canvas_credentials')
            .insert({
              user_email: cleanEmail,
              encrypted_feed_url: localFeedEnc,
              updated_at: new Date().toISOString(),
            });
        }
      }

      // 2. Check existing DB settings for this email
      const { data: dbSettings } = await supabase
        .from('user_settings')
        .select('*')
        .ilike('user_email', cleanEmail)
        .maybeSingle();

      if (dbSettings) {
        if (dbSettings.preferred_ai) {
          response.cookies.set('deadlnr_preferred_ai', dbSettings.preferred_ai, {
            path: '/',
            maxAge,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          });
        }
        if (dbSettings.theme) {
          response.cookies.set('deadlnr_theme', dbSettings.theme, {
            path: '/',
            maxAge,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          });
        }
      } else {
        // Save initial local settings if any
        const settingsPayload: Record<string, any> = {
          user_email: cleanEmail,
          updated_at: new Date().toISOString(),
        };
        if (localAi) settingsPayload.preferred_ai = localAi;
        if (localTheme) settingsPayload.theme = localTheme;

        const { data: existingS } = await supabase
          .from('user_settings')
          .select('user_email')
          .ilike('user_email', cleanEmail)
          .maybeSingle();

        if (existingS) {
          await supabase
            .from('user_settings')
            .update(settingsPayload)
            .ilike('user_email', cleanEmail);
        } else {
          await supabase
            .from('user_settings')
            .insert(settingsPayload);
        }
      }
    } catch (syncErr) {
      console.error('OTP verify: Account sync error:', syncErr);
    }

    return response;
  } catch (err: any) {
    console.error('API Verify OTP Exception:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to verify OTP code.' },
      { status: 500 }
    );
  }
}
