import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim();
    const cleanToken = token.trim();

    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email',
    });

    if (error) {
      console.error('Supabase Verify OTP Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    });

    // Set persistent cookies for 1 year (31,536,000 seconds)
    const maxAge = 31536000;

    response.cookies.set('deadlnr_user_email', cleanEmail, {
      path: '/',
      maxAge,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    if (data.session?.access_token) {
      response.cookies.set('deadlnr_session', data.session.access_token, {
        path: '/',
        maxAge,
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });

      response.cookies.set('sb-access-token', data.session.access_token, {
        path: '/',
        maxAge,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    if (data.session?.refresh_token) {
      response.cookies.set('sb-refresh-token', data.session.refresh_token, {
        path: '/',
        maxAge,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    return response;
  } catch (err: any) {
    console.error('API Verify OTP Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to verify OTP code.' },
      { status: 500 }
    );
  }
}
