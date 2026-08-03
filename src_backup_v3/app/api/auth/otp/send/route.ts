import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Generate clean 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Encrypt payload into challenge cookie (valid for 10 minutes)
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const payload = JSON.stringify({ email: trimmedEmail, code, expiresAt });
    const secretKey = process.env.ENCRYPTION_KEY || 'deadlnr_secret_key_32_bytes_len_1234';

    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const iv = Buffer.alloc(16, 0);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(payload, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 3. Send EXACTLY 1 branded email via Resend SDK
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'auth@villageprep.net';

      await resend.emails.send({
        from: `Deadlnr <${fromEmail}>`,
        to: [trimmedEmail],
        subject: `Your Deadlnr verification code is: ${code}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 440px; margin: 0 auto; padding: 32px 24px; background-color: #080a0f; color: #ffffff; border-radius: 24px; border: 1px solid #1e293b; text-align: center;">
            <h2 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; font-family: sans-serif;">Deadlnr</h2>
            <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px 0;">Your 6-digit verification code is:</p>
            <div style="background-color: #111622; border: 1px solid #00e599; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
              <span style="font-family: monospace; font-size: 36px; font-weight: 800; color: #00e599; letter-spacing: 2px;">${code}</span>
            </div>
            <p style="color: #64748b; font-size: 12px; margin: 0;">Enter this code in Deadlnr to sign in. Code expires in 10 minutes.</p>
          </div>
        `,
      });
    }

    const response = NextResponse.json({ success: true, message: `Verification code sent to ${trimmedEmail}` });

    response.cookies.set('deadlnr_otp_challenge', encrypted, {
      path: '/',
      maxAge: 600,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (err: any) {
    console.error('API Send OTP Exception:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send verification code.' },
      { status: 500 }
    );
  }
}
