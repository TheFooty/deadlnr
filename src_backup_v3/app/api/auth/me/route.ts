import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const userEmailCookie = request.cookies.get('deadlnr_user_email')?.value;

    if (session?.user?.email) {
      return NextResponse.json({
        isLoggedIn: true,
        email: session.user.email,
        id: session.user.id,
      });
    }

    if (userEmailCookie) {
      return NextResponse.json({
        isLoggedIn: true,
        email: userEmailCookie,
      });
    }

    return NextResponse.json({ isLoggedIn: false, email: null });
  } catch (err: any) {
    return NextResponse.json({ isLoggedIn: false, email: null });
  }
}
