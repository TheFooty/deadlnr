import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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

    // Verification successful! Set persistent user cookies for 1 year
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

    return response;
  } catch (err: any) {
    console.error('API Verify OTP Exception:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to verify OTP code.' },
      { status: 500 }
    );
  }
}
