import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    });

    if (error) {
      console.error('Supabase Verify OTP Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: data.user, session: data.session });
  } catch (err: any) {
    console.error('API Verify OTP Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to verify OTP code.' },
      { status: 500 }
    );
  }
}
