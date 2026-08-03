import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SwipeEvent } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    let history: SwipeEvent[] = [];

    // 1. Read from persistent cookie
    const cookieHeader = request.cookies.get('deadlnr_swipe_history')?.value;
    if (cookieHeader) {
      try {
        history = JSON.parse(cookieHeader);
      } catch {
        // Ignore parse error
      }
    }

    // 2. Read from Supabase if user is logged in
    try {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user?.id) {
        const { data: dbHistory } = await supabase
          .from('swipe_history')
          .select('*')
          .eq('user_id', session.user.id)
          .order('swiped_at', { ascending: false });

        if (dbHistory && dbHistory.length > 0) {
          // Merge DB history with cookie history, deduplicating by ID/timestamp
          const dbEvents: SwipeEvent[] = dbHistory.map((item) => ({
            assignment_id: item.assignment_id,
            assignment_title: item.assignment_title,
            course: item.course,
            direction: item.direction,
            swiped_at: item.swiped_at,
          }));

          const combined = [...dbEvents, ...history];
          const unique = Array.from(
            new Map(combined.map((item) => [`${item.assignment_id}_${item.swiped_at}`, item])).values()
          );

          history = unique;
        }
      }
    } catch {
      // Ignore Supabase error if table doesn't exist
    }

    return NextResponse.json({ history });
  } catch (error: any) {
    return NextResponse.json({ history: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignment_id, assignment_title, course, direction } = body;

    if (!assignment_id || !direction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newEvent: SwipeEvent = {
      assignment_id,
      assignment_title: assignment_title || 'Untitled Assignment',
      course: course || 'Canvas',
      direction,
      swiped_at: new Date().toISOString(),
    };

    // 1. Read existing cookie history
    let history: SwipeEvent[] = [];
    const cookieHeader = request.cookies.get('deadlnr_swipe_history')?.value;
    if (cookieHeader) {
      try {
        history = JSON.parse(cookieHeader);
      } catch {
        history = [];
      }
    }

    // Add new event at the beginning (max 50 items)
    history.unshift(newEvent);
    if (history.length > 50) history = history.slice(0, 50);

    const response = NextResponse.json({ success: true, event: newEvent });

    // Save updated history in cookie for 1 year
    response.cookies.set('deadlnr_swipe_history', JSON.stringify(history), {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    // 2. Try saving to Supabase if logged in
    try {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user?.id) {
        await supabase.from('swipe_history').insert({
          user_id: session.user.id,
          assignment_id,
          assignment_title: assignment_title || 'Untitled Assignment',
          course: course || 'Canvas',
          direction,
          swiped_at: newEvent.swiped_at,
        });
      }
    } catch (dbErr) {
      // Cookie already saved, so silent fallback
    }

    return response;
  } catch (error: any) {
    console.error('Error logging swipe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
