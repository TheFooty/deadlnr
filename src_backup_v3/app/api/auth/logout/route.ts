import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    const response = NextResponse.json({ success: true });

    // Clear all auth cookies
    response.cookies.set('deadlnr_user_email', '', { path: '/', maxAge: 0 });
    response.cookies.set('deadlnr_session', '', { path: '/', maxAge: 0 });
    response.cookies.set('sb-access-token', '', { path: '/', maxAge: 0 });
    response.cookies.set('sb-refresh-token', '', { path: '/', maxAge: 0 });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}
