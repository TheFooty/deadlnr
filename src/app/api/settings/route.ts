import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptText } from '@/lib/crypto';
import { PreferredAI } from '@/lib/types';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const cookieStore = await cookies();
    const cookieAi = cookieStore.get('deadlnr_preferred_ai')?.value as PreferredAI;

    if (!session?.user) {
      return NextResponse.json({
        preferred_ai: cookieAi || 'gemini',
        has_feed_url: false,
        isGuest: true,
      });
    }

    const userId = session.user.id;

    // Get settings from Supabase
    const { data: settings } = await supabase
      .from('user_settings')
      .select('preferred_ai')
      .eq('user_id', userId)
      .single();

    // Check credentials existence
    const { data: creds } = await supabase
      .from('canvas_credentials')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    const selectedAi = (settings?.preferred_ai as PreferredAI) || cookieAi || 'gemini';

    return NextResponse.json({
      preferred_ai: selectedAi,
      has_feed_url: !!creds,
      isGuest: false,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const body = await request.json();
    const { feed_url, preferred_ai } = body;

    const response = NextResponse.json({
      success: true,
      preferred_ai: preferred_ai || 'gemini',
      isGuest: !session?.user,
    });

    // Set cookie on response for guest / fallback persistence
    if (preferred_ai) {
      response.cookies.set('deadlnr_preferred_ai', preferred_ai, {
        path: '/',
        maxAge: 31536000, // 1 year
      });
    }

    if (!session?.user) {
      return response;
    }

    const userId = session.user.id;

    // Save/update preferred_ai in Supabase
    if (preferred_ai) {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          preferred_ai,
          updated_at: new Date().toISOString(),
        });
    }

    // Save/update encrypted feed URL if provided
    if (feed_url && typeof feed_url === 'string' && feed_url.trim().length > 0) {
      const trimmedUrl = feed_url.trim();
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        return NextResponse.json({ error: 'Please enter a valid HTTP/HTTPS iCal feed URL.' }, { status: 400 });
      }

      const encryptedFeedUrl = encryptText(trimmedUrl);

      await supabase
        .from('canvas_credentials')
        .upsert({
          user_id: userId,
          encrypted_feed_url: encryptedFeedUrl,
          updated_at: new Date().toISOString(),
        });
    }

    return response;
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: error.message || 'Failed to save settings' }, { status: 500 });
  }
}
