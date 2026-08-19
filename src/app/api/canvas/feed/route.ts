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
    let encryptedFeedFromDb = '';
    let encryptedApiTokenDb = '';
    let canvasDomainDb = '';

    // 1. Try reading feed URL from cookie fallback first
    if (cookieFeedUrlEnc) {
      try {
        const decrypted = decryptText(cookieFeedUrlEnc);
        if (decrypted.startsWith('http')) {
          feedUrl = decrypted;
        }
      } catch {}
    }

    let session: any = null;
    let supabase: any = null;

    try {
      supabase = await createClient();
      const { data } = await supabase.auth.getSession();
      session = data.session;
    } catch (e) {
      console.error('Supabase client/session error:', e);
    }

    const rawEmail = session?.user?.email || userEmailCookie;
    const userEmail = rawEmail ? rawEmail.trim().toLowerCase() : null;
    const userId = session?.user?.id;

    let userWantsDemo = showDemoData;

    // 2. Fetch encrypted feed URL from Supabase (by user_email or user_id)
    if ((userEmail || userId) && supabase) {
      try {
        if (userEmail) {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('show_demo_data')
            .ilike('user_email', userEmail)
            .maybeSingle();

          if (settings?.show_demo_data !== undefined) {
            userWantsDemo = !!settings.show_demo_data;
          }

          const { data: creds } = await supabase
            .from('canvas_credentials')
            .select('encrypted_feed_url, encrypted_api_token, canvas_domain')
            .ilike('user_email', userEmail)
            .maybeSingle();

          if (creds?.encrypted_feed_url) {
            try {
              const dbDecrypted = decryptText(creds.encrypted_feed_url);
              if (dbDecrypted.startsWith('http')) {
                feedUrl = dbDecrypted;
                encryptedFeedFromDb = creds.encrypted_feed_url;
              }
            } catch {}
          }
          
          if (creds?.encrypted_api_token) {
             encryptedApiTokenDb = creds.encrypted_api_token;
          }
          if (creds?.canvas_domain) {
             canvasDomainDb = creds.canvas_domain;
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
            .select('encrypted_feed_url, encrypted_api_token, canvas_domain')
            .eq('user_id', userId)
            .maybeSingle();

          if (creds?.encrypted_feed_url) {
            try {
              const dbDecrypted = decryptText(creds.encrypted_feed_url);
              if (dbDecrypted.startsWith('http')) {
                feedUrl = dbDecrypted;
                encryptedFeedFromDb = creds.encrypted_feed_url;
              }
            } catch {}
          }
          
          if (creds?.encrypted_api_token) {
             encryptedApiTokenDb = creds.encrypted_api_token;
          }
          if (creds?.canvas_domain) {
             canvasDomainDb = creds.canvas_domain;
          }
        }
      } catch (dbError) {
        console.error('Supabase DB fetch failed, falling back to cookies:', dbError);
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

    // Filter out submitted assignments using Canvas API
    let filteredAssignments = assignments;
    
    let apiToken = '';
    let canvasDomain = '';

    const cookieApiTokenEnc = cookieStore.get('deadlnr_api_token')?.value;
    const cookieCanvasDomain = cookieStore.get('deadlnr_canvas_domain')?.value;

    if (cookieApiTokenEnc) {
      try { apiToken = decryptText(cookieApiTokenEnc); } catch {}
    } else if (encryptedApiTokenDb) {
      try { apiToken = decryptText(encryptedApiTokenDb); } catch {}
    }
    
    if (cookieCanvasDomain) {
      canvasDomain = cookieCanvasDomain;
    } else if (canvasDomainDb) {
      canvasDomain = canvasDomainDb;
    }

    // Also try extracting domain from feedUrl if not set
    if (!canvasDomain && feedUrl) {
      try { canvasDomain = new URL(feedUrl).hostname; } catch {}
    }

    if (apiToken && canvasDomain) {
      try {
        // Step 1: Fetch active courses
        const coursesRes = await fetch(
          `https://${canvasDomain}/api/v1/courses?enrollment_state=active&per_page=50`,
          {
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Accept': 'application/json',
            },
            cache: 'no-store',
          }
        );

        if (coursesRes.ok) {
          const courses = await coursesRes.json();
          const submittedIds = new Set<string>();
          const submittedTitles = new Set<string>();

          // Step 2: For each course, fetch assignments with submission status
          const coursePromises = courses.map(async (course: any) => {
            try {
              const assignRes = await fetch(
                `https://${canvasDomain}/api/v1/courses/${course.id}/assignments?include[]=submission&per_page=100`,
                {
                  headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Accept': 'application/json',
                  },
                  cache: 'no-store',
                }
              );

              if (assignRes.ok) {
                const canvasAssignments = await assignRes.json();
                for (const ca of canvasAssignments) {
                  const state = ca.submission?.workflow_state;
                  if (state === 'submitted' || state === 'graded') {
                    submittedIds.add(String(ca.id));
                    if (ca.name) {
                      submittedTitles.add(ca.name.trim().toLowerCase());
                    }
                  }
                }
              }
            } catch {}
          });

          await Promise.all(coursePromises);

          console.log(`[Canvas API] Found ${submittedIds.size} submitted assignments across ${courses.length} courses`);

          // Step 3: Filter out submitted assignments
          if (submittedIds.size > 0) {
            filteredAssignments = assignments.filter(a => {
              // Try to extract Canvas assignment ID from the URL
              const urlIdMatch = a.canvasUrl?.match(/\/assignments\/(\d+)/);
              if (urlIdMatch && submittedIds.has(urlIdMatch[1])) {
                return false; // Submitted, hide it
              }

              // Try to extract assignment ID from iCal UID
              // Canvas UIDs are often like: event-assignment-123456@canvas
              const uidMatch = (a.uid || '').match(/assignment[_-](\d+)/i);
              if (uidMatch && submittedIds.has(uidMatch[1])) {
                return false; // Submitted, hide it
              }

              // Fallback: match by title (case-insensitive)
              if (submittedTitles.has(a.title.trim().toLowerCase())) {
                return false; // Submitted, hide it
              }

              return true; // Keep it
            });
          }
        } else {
          console.error(`[Canvas API] Failed to fetch courses: HTTP ${coursesRes.status}`);
        }
      } catch (apiErr) {
        console.error('[Canvas API] Check failed, showing all assignments:', apiErr);
        // On error, show all assignments (graceful fallback)
      }
    }

    const jsonRes = NextResponse.json({
      assignments: filteredAssignments,
      isMock: false,
    });

    // If feed was fetched from DB, cache to cookie for fast subsequent requests on this device
    if (encryptedFeedFromDb && !cookieFeedUrlEnc) {
      jsonRes.cookies.set('deadlnr_feed_url', encryptedFeedFromDb, {
        path: '/',
        maxAge: 31536000,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    return jsonRes;
  } catch (error: any) {
    console.error('Error fetching calendar feed:', error);
    return NextResponse.json({ assignments: [], isMock: false, error: error.message }, { status: 500 });
  }
}
