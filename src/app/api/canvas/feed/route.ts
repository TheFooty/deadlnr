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

    // Filter out submitted assignments
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

    if (apiToken && canvasDomain) {
      try {
        const todoRes = await fetch(`https://${canvasDomain}/api/v1/users/self/todo?per_page=100`, {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Accept': 'application/json',
          },
          cache: 'no-store',
        });

        if (todoRes.ok) {
          const todoItems = await todoRes.json();
          const unsubmittedUrls = new Set<string>();
          const unsubmittedIds = new Set<string>();
          
          for (const item of todoItems) {
            if (item.assignment) {
              if (item.assignment.html_url) {
                unsubmittedUrls.add(item.assignment.html_url);
              }
              if (item.assignment.id) {
                unsubmittedIds.add(String(item.assignment.id));
              }
            }
          }

          filteredAssignments = assignments.filter(a => {
            if (!a.canvasUrl || !a.canvasUrl.includes('/courses/')) {
              return true; 
            }
            
            const assignmentIdMatch = a.canvasUrl.match(/\/assignments\/(\d+)/);
            if (assignmentIdMatch) {
              const assignmentId = assignmentIdMatch[1];
              if (unsubmittedIds.has(assignmentId)) {
                return true; 
              }
            }
            
            if (unsubmittedUrls.has(a.canvasUrl)) {
              return true;
            }
            
            return false;
          });
        }
      } catch (apiErr) {
        console.error('Canvas API check failed, showing all assignments:', apiErr);
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
