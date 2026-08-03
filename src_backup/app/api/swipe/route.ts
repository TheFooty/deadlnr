import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ history: [] });
    }

    const { data: history, error } = await supabase
      .from('swipe_history')
      .select('*')
      .eq('user_id', session.user.id)
      .order('swiped_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ history });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const body = await request.json();
    const { assignment_id, assignment_title, course, direction } = body;

    if (!assignment_id || !direction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (session?.user) {
      await supabase.from('swipe_history').insert({
        user_id: session.user.id,
        assignment_id,
        assignment_title: assignment_title || 'Untitled Assignment',
        course: course || 'Canvas',
        direction,
        swiped_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error logging swipe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
