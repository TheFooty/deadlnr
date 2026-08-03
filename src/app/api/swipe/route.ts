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
      } catch {}
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
          const dbEvents: SwipeEvent[] = dbHistory.map((item) => ({
            assignment_id: item.assignment_id,
            assignment_title: item.assignment_title,
            course: item.course,
            direction: item.direction,
            swiped_at: item.swiped_at,
          }));

          history = [...dbEvents, ...history];
        }
      }
    } catch {}

    // Deduplicate by assignment_id so no single assignment appears twice in history
    const uniqueMap = new Map<string, SwipeEvent>();
    for (const item of history) {
      if (!uniqueMap.has(item.assignment_id)) {
        uniqueMap.set(item.assignment_id, item);
      }
    }

    const uniqueHistory = Array.from(uniqueMap.values());

    return NextResponse.json({ history: uniqueHistory });
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

    // Deduplicate: filter out any existing entry for this assignment_id before adding
    history = history.filter((item) => item.assignment_id !== assignment_id);
    history.unshift(newEvent);
    if (history.length > 50) history = history.slice(0, 50);

    const response = NextResponse.json({ success: true, event: newEvent });

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
        // Delete previous entry for this assignment if exists, then insert
        await supabase
          .from('swipe_history')
          .delete()
          .eq('user_id', session.user.id)
          .eq('assignment_id', assignment_id);

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
      // Cookie already saved
    }

    return response;
  } catch (error: any) {
    console.error('Error logging swipe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE Handler to Restore / Undo task from history back to active deck
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignment_id');

    if (!assignmentId) {
      return NextResponse.json({ error: 'Missing assignment_id parameter' }, { status: 400 });
    }

    // 1. Remove from cookie history
    let history: SwipeEvent[] = [];
    const cookieHeader = request.cookies.get('deadlnr_swipe_history')?.value;
    if (cookieHeader) {
      try {
        history = JSON.parse(cookieHeader);
      } catch {}
    }

    const filtered = history.filter((item) => item.assignment_id !== assignmentId);
    const response = NextResponse.json({ success: true, restored_id: assignmentId });

    response.cookies.set('deadlnr_swipe_history', JSON.stringify(filtered), {
      path: '/',
      maxAge: 31536000,
    });

    // 2. Remove from Supabase if logged in
    try {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user?.id) {
        await supabase
          .from('swipe_history')
          .delete()
          .eq('user_id', session.user.id)
          .eq('assignment_id', assignmentId);
      }
    } catch {}

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
