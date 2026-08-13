import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decryptText } from '@/lib/crypto';
import { parseCanvasICalFeed } from '@/lib/ical-parser';
import { MOCK_ASSIGNMENTS } from '@/lib/mock-data';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceMock = searchParams.get('mock') === 'true';

    const cookieStore = await cookies();
    const showDemoData = cookieStore.get('deadlnr_show_demo_data')?.value === 'true';
    const cookieFeedUrlEnc = cookieStore.get('deadlnr_feed_url')?.value;
    const userEmailCookie = cookieStore.get('deadlnr_user_email')?.value;

    if (forceMock) {
      return NextResponse.json({ assignments: MOCK_ASSIGNMENTS, isMock: true });
    }

    let feedUrl = '';

    // 1. Try reading feed URL from cookie fallback first
    if (cookieFeedUrlEnc) {
      try {
        const decrypted = decryptText(cookieFeedUrlEnc);
        if (decrypted.startsWith('http')) {
          feedUrl = decrypted;
        }
      } catch {}
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email || userEmailCookie;
    const userId = session?.user?.id;

    let userWantsDemo = showDemoData;

    // 2. Fetch encrypted feed URL from Supabase (by user_email or user_id)
    if (userEmail || userId) {
      // Check user_settings
      if (userEmail) {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('show_demo_data')
          .eq('user_email', userEmail)
          .maybeSingle();

        if (settings?.show_demo_data !== undefined) {
          userWantsDemo = !!settings.show_demo_data;
        }

        const { data: creds } = await supabase
          .from('canvas_credentials')
          .select('encrypted_feed_url')
          .eq('user_email', userEmail)
          .maybeSingle();

        if (creds?.encrypted_feed_url) {
          try {
            const dbDecrypted = decryptText(creds.encrypted_feed_url);
            if (dbDecrypted.startsWith('http')) {
              feedUrl = dbDecrypted;
            }
          } catch {}
        }
      }

      if (!feedUrl && userId) {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('show_demo_data')
          .eq('user_id', userId)
          .maybeSingle();

        if (settings?.show_demo_data !== undefined) {
          userWantsDemo = !!settings.show_demo_data;
        }

        const { data: creds } = await supabase
          .from('canvas_credentials')
          .select('encrypted_feed_url')
          .eq('user_id', userId)
          .maybeSingle();

        if (creds?.encrypted_feed_url) {
          try {
            const dbDecrypted = decryptText(creds.encrypted_feed_url);
            if (dbDecrypted.startsWith('http')) {
              feedUrl = dbDecrypted;
            }
          } catch {}
        }
      }
    }

    // 3. If still no feed URL found
    if (!feedUrl) {
      if (userWantsDemo) {
        return NextResponse.json({
          assignments: MOCK_ASSIGNMENTS,
          isMock: true,
          noFeedUrl: true,
          message: 'No calendar feed URL found. Showing demo mode.',
        });
      }
      return NextResponse.json({
        assignments: [],
        isMock: false,
        noFeedUrl: true,
      });
    }

    // 4. Fetch .ics file from Canvas / Kognity / Calendar URL
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Deadlnr-Canvas-App/1.0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (userWantsDemo) {
        return NextResponse.json({
          assignments: MOCK_ASSIGNMENTS,
          isMock: true,
          error: `Failed to fetch calendar feed (HTTP ${response.status})`,
        });
      }
      return NextResponse.json({
        assignments: [],
        isMock: false,
        error: `Failed to fetch calendar feed (HTTP ${response.status})`,
      });
    }

    const icsText = await response.text();
    const assignments = await parseCanvasICalFeed(icsText);

    return NextResponse.json({
      assignments,
      isMock: false,
    });
  } catch (error: any) {
    console.error('Error fetching calendar feed:', error);
    return NextResponse.json({ assignments: [], isMock: false, error: error.message }, { status: 500 });
  }
}
