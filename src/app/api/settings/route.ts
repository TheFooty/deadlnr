import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptText, decryptText } from '@/lib/crypto';
import { PreferredAI, ThemeId } from '@/lib/types';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const cookieStore = await cookies();
    const cookieAi = cookieStore.get('deadlnr_preferred_ai')?.value as PreferredAI;
    const cookieTheme = cookieStore.get('deadlnr_theme')?.value as ThemeId;
    const cookieDemo = cookieStore.get('deadlnr_show_demo_data')?.value === 'true';
    const cookieFeedUrlEnc = cookieStore.get('deadlnr_feed_url')?.value;
    const rawEmail = cookieStore.get('deadlnr_user_email')?.value || session?.user?.email;
    const userEmail = rawEmail ? rawEmail.trim().toLowerCase() : null;

    let hasFeed = false;
    let decryptedCookieFeed = '';
    if (cookieFeedUrlEnc) {
      try {
        decryptedCookieFeed = decryptText(cookieFeedUrlEnc);
        if (decryptedCookieFeed.startsWith('http')) hasFeed = true;
      } catch {}
    }

    // If completely unauthenticated guest (no Supabase session and no OTP email cookie)
    if (!session?.user && !userEmail) {
      return NextResponse.json({
        preferred_ai: cookieAi || 'gemini',
        theme: cookieTheme || 'default',
        show_demo_data: cookieDemo,
        has_feed_url: hasFeed,
        feed_url: decryptedCookieFeed || undefined,
        isGuest: true,
        userEmail: null,
      });
    }

    const userId = session?.user?.id;
    let dbSettings: any = null;
    let dbCreds: any = null;

    // 1. Fetch settings from Supabase (by user_email or user_id)
    if (userEmail) {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .ilike('user_email', userEmail)
        .maybeSingle();
      dbSettings = data;

      const { data: cData } = await supabase
        .from('canvas_credentials')
        .select('*')
        .ilike('user_email', userEmail)
        .maybeSingle();
      dbCreds = cData;
    }

    if (!dbSettings && userId) {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      dbSettings = data;
    }

    if (!dbCreds && userId) {
      const { data: cData } = await supabase
        .from('canvas_credentials')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      dbCreds = cData;
    }

    let dbFeedUrl = '';
    if (dbCreds?.encrypted_feed_url) {
      try {
        const decrypted = decryptText(dbCreds.encrypted_feed_url);
        if (decrypted.startsWith('http')) {
          dbFeedUrl = decrypted;
          hasFeed = true;
        }
      } catch {}
    }

    const selectedAi = (dbSettings?.preferred_ai as PreferredAI) || cookieAi || 'gemini';
    const selectedTheme = (dbSettings?.theme as ThemeId) || cookieTheme || 'default';
    const showDemoData = dbSettings?.show_demo_data ?? cookieDemo;

    const response = NextResponse.json({
      preferred_ai: selectedAi,
      theme: selectedTheme,
      show_demo_data: showDemoData,
      custom_assignments: dbSettings?.custom_assignments || [],
      has_feed_url: hasFeed,
      feed_url: dbFeedUrl || decryptedCookieFeed || undefined,
      isGuest: false,
      userEmail: userEmail || session?.user?.email || null,
    });

    // Cache to cookies if found in DB so this device immediately has local values
    if (dbCreds?.encrypted_feed_url && !cookieFeedUrlEnc) {
      response.cookies.set('deadlnr_feed_url', dbCreds.encrypted_feed_url, {
        path: '/',
        maxAge: 31536000,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    return response;
  } catch (error: any) {
    console.error('Error in GET /api/settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const cookieStore = await cookies();
    const userEmailCookie = cookieStore.get('deadlnr_user_email')?.value;
    const rawEmail = session?.user?.email || userEmailCookie;
    const userEmail = rawEmail ? rawEmail.trim().toLowerCase() : null;
    const userId = session?.user?.id;

    const body = await request.json();
    const { feed_url, preferred_ai, theme, show_demo_data, custom_assignments } = body;

    const response = NextResponse.json({
      success: true,
      preferred_ai: preferred_ai || 'gemini',
      theme: theme || 'default',
      show_demo_data: !!show_demo_data,
      isGuest: !userEmail && !userId,
    });

    const maxCookieAge = 31536000; // 1 year

    // Set cookies on response for cross-page & guest fallback persistence
    if (preferred_ai) {
      response.cookies.set('deadlnr_preferred_ai', preferred_ai, {
        path: '/',
        maxAge: maxCookieAge,
      });
    }

    if (theme) {
      response.cookies.set('deadlnr_theme', theme, {
        path: '/',
        maxAge: maxCookieAge,
      });
    }

    response.cookies.set('deadlnr_show_demo_data', String(!!show_demo_data), {
      path: '/',
      maxAge: maxCookieAge,
    });

    if (Array.isArray(custom_assignments)) {
      response.cookies.set('deadlnr_custom_assignments', JSON.stringify(custom_assignments), {
        path: '/',
        maxAge: maxCookieAge,
      });
    }

    // Process feed_url for ALL users (guests + logged-in)
    let trimmedUrl = '';
    if (feed_url && typeof feed_url === 'string' && feed_url.trim().length > 0) {
      trimmedUrl = feed_url.trim();
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        return NextResponse.json(
          { error: 'Please enter a valid HTTP or HTTPS iCal feed URL.' },
          { status: 400 }
        );
      }

      const encryptedUrl = encryptText(trimmedUrl);
      response.cookies.set('deadlnr_feed_url', encryptedUrl, {
        path: '/',
        maxAge: maxCookieAge,
      });
    }

    // If logged in via email or Supabase session, save to Supabase DB for cross-device sync
    if (userEmail || userId) {
      const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : null;

      // 1. Resilient save for user_settings
      const userSettingsPayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (preferred_ai) userSettingsPayload.preferred_ai = preferred_ai;
      if (theme) userSettingsPayload.theme = theme;
      if (typeof show_demo_data === 'boolean') userSettingsPayload.show_demo_data = show_demo_data;
      if (Array.isArray(custom_assignments)) userSettingsPayload.custom_assignments = custom_assignments;

      if (cleanEmail) {
        // Try update first
        const { data: existingSettings } = await supabase
          .from('user_settings')
          .select('user_email')
          .ilike('user_email', cleanEmail)
          .maybeSingle();

        if (existingSettings) {
          await supabase
            .from('user_settings')
            .update(userSettingsPayload)
            .ilike('user_email', cleanEmail);
        } else {
          await supabase
            .from('user_settings')
            .insert({ ...userSettingsPayload, user_email: cleanEmail });
        }
      } else if (userId) {
        const { data: existingSettings } = await supabase
          .from('user_settings')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingSettings) {
          await supabase
            .from('user_settings')
            .update(userSettingsPayload)
            .eq('user_id', userId);
        } else {
          await supabase
            .from('user_settings')
            .insert({ ...userSettingsPayload, user_id: userId });
        }
      }

      // 2. Resilient save for canvas_credentials
      if (trimmedUrl) {
        const encryptedFeedUrl = encryptText(trimmedUrl);
        const credsPayload: Record<string, any> = {
          encrypted_feed_url: encryptedFeedUrl,
          updated_at: new Date().toISOString(),
        };

        if (cleanEmail) {
          const { data: existingCreds } = await supabase
            .from('canvas_credentials')
            .select('user_email')
            .ilike('user_email', cleanEmail)
            .maybeSingle();

          if (existingCreds) {
            const { error: updErr } = await supabase
              .from('canvas_credentials')
              .update(credsPayload)
              .ilike('user_email', cleanEmail);
            if (updErr) console.error('Error updating canvas_credentials:', updErr);
          } else {
            const { error: insErr } = await supabase
              .from('canvas_credentials')
              .insert({ ...credsPayload, user_email: cleanEmail });
            if (insErr) console.error('Error inserting canvas_credentials:', insErr);
          }
        } else if (userId) {
          const { data: existingCreds } = await supabase
            .from('canvas_credentials')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle();

          if (existingCreds) {
            await supabase
              .from('canvas_credentials')
              .update(credsPayload)
              .eq('user_id', userId);
          } else {
            await supabase
              .from('canvas_credentials')
              .insert({ ...credsPayload, user_id: userId });
          }
        }
      }
    }

    return response;
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save settings' },
      { status: 500 }
    );
  }
}
