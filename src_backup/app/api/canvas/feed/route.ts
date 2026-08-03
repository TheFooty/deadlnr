import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decryptText } from '@/lib/crypto';
import { parseCanvasICalFeed } from '@/lib/ical-parser';
import { MOCK_ASSIGNMENTS } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceMock = searchParams.get('mock') === 'true';

    if (forceMock) {
      return NextResponse.json({ assignments: MOCK_ASSIGNMENTS, isMock: true });
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    // If user is not logged in or Supabase isn't configured yet, fallback to mock data with a flag
    if (!session?.user) {
      return NextResponse.json({
        assignments: MOCK_ASSIGNMENTS,
        isMock: true,
        message: 'Using demo dataset. Sign in & add your Canvas feed URL in Settings to sync live deadlines.',
      });
    }

    // Fetch encrypted feed URL for user
    const { data: creds, error: credsError } = await supabase
      .from('canvas_credentials')
      .select('encrypted_feed_url')
      .eq('user_id', session.user.id)
      .single();

    if (credsError || !creds?.encrypted_feed_url) {
      return NextResponse.json({
        assignments: MOCK_ASSIGNMENTS,
        isMock: true,
        noFeedUrl: true,
        message: 'No Canvas feed URL found. Configure your iCal URL in Settings.',
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
      return NextResponse.json(
        { error: `Failed to fetch Canvas feed (HTTP ${response.status})` },
        { status: 502 }
      );
    }

    const icsText = await response.text();
    const assignments = await parseCanvasICalFeed(icsText);

    return NextResponse.json({
      assignments,
      isMock: false,
    });
  } catch (error: any) {
    console.error('Error fetching Canvas feed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error', assignments: MOCK_ASSIGNMENTS, isMock: true },
      { status: 500 }
    );
  }
}
