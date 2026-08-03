import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error('Supabase OTP Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Verification code sent to ${email}` });
  } catch (err: any) {
    console.error('API Send OTP Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to connect to authentication server. Please check Supabase project status.' },
      { status: 500 }
    );
  }
}
