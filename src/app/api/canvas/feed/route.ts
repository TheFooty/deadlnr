import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decryptText } from '@/lib/crypto';
import { parseCanvasICalFeed } from '@/lib/ical-parser';
import { MOCK_ASSIGNMENTS } from '@/lib/mock-data';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceMock = searchParams.get('mock') === 'true';

    const cookieStore = await cookies();
    const showDemoData = cookieStore.get('deadlnr_show_demo_data')?.value === 'true';

    if (forceMock) {
      return NextResponse.json({ assignments: MOCK_ASSIGNMENTS, isMock: true });
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    let userWantsDemo = showDemoData;

    // Check DB user_settings if logged in
    if (session?.user) {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('show_demo_data')
        .eq('user_id', session.user.id)
        .single();

      if (settings?.show_demo_data !== undefined) {
        userWantsDemo = !!settings.show_demo_data;
      }
    }

    // If user is not logged in
    if (!session?.user) {
      if (userWantsDemo) {
        return NextResponse.json({
          assignments: MOCK_ASSIGNMENTS,
          isMock: true,
          message: 'Using demo dataset.',
        });
      }
      return NextResponse.json({
        assignments: [],
        isMock: false,
        noFeedUrl: true,
      });
    }

    // Fetch encrypted feed URL for user
    const { data: creds, error: credsError } = await supabase
      .from('canvas_credentials')
      .select('encrypted_feed_url')
      .eq('user_id', session.user.id)
      .single();

    if (credsError || !creds?.encrypted_feed_url) {
      if (userWantsDemo) {
        return NextResponse.json({
          assignments: MOCK_ASSIGNMENTS,
          isMock: true,
          noFeedUrl: true,
          message: 'No Canvas feed URL found. Showing demo mode.',
        });
      }
      return NextResponse.json({
        assignments: [],
        isMock: false,
        noFeedUrl: true,
      });
    }

    // Decrypt feed URL server-side
    const feedUrl = decryptText(creds.encrypted_feed_url);

    // Fetch .ics file from Canvas
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Deadlnr-Canvas-App/1.0',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      if (userWantsDemo) {
        return NextResponse.json({
          assignments: MOCK_ASSIGNMENTS,
          isMock: true,
          error: `Failed to fetch Canvas feed (HTTP ${response.status})`,
        });
      }
      return NextResponse.json({
        assignments: [],
        isMock: false,
        error: `Failed to fetch Canvas feed (HTTP ${response.status})`,
      });
    }

    const icsText = await response.text();
    const assignments = await parseCanvasICalFeed(icsText);

    return NextResponse.json({
      assignments,
      isMock: false,
    });
  } catch (error: any) {
    console.error('Error fetching Canvas feed:', error);
    return NextResponse.json({ assignments: [], isMock: false, error: error.message }, { status: 500 });
  }
}
