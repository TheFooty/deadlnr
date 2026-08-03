import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const trimmedEmail = email.trim();
    const supabase = await createClient();

    // Trigger Supabase OTP auth flow
    const { data, error: supabaseError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    if (supabaseError) {
      console.error('Supabase OTP Error:', supabaseError);
      return NextResponse.json({ error: supabaseError.message }, { status: 400 });
    }

    // Direct Resend API integration fallback if key is provided
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'auth@villageprep.net';

        // Fetch recent OTP code or send notification
        await resend.emails.send({
          from: `Deadlnr Auth <${fromEmail}>`,
          to: [trimmedEmail],
          subject: 'Your Deadlnr Verification Code',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background-color: #080a0f; color: #ffffff; border-radius: 20px; border: 1px solid #1e293b;">
              <h2 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-bottom: 8px;">Deadlnr Verification</h2>
              <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">A sign-in request was initiated for ${trimmedEmail}.</p>
              <div style="background-color: #111622; border: 1px solid #00e599; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; font-family: monospace;">Verification Code Sent via Supabase & Resend</p>
                <p style="color: #00e599; font-size: 14px; font-weight: 600; margin: 0;">Check your email inbox or enter the code sent to your account.</p>
              </div>
              <p style="color: #64748b; font-size: 12px;">If you did not request this code, you can safely ignore this email.</p>
            </div>
          `,
        });
      } catch (resendErr) {
        console.error('Direct Resend SDK Send Warning:', resendErr);
      }
    }

    return NextResponse.json({ success: true, message: `Verification code sent to ${trimmedEmail}` });
  } catch (err: any) {
    console.error('API Send OTP Exception:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to connect to authentication server.' },
      { status: 500 }
    );
  }
}
