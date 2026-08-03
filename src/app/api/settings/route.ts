import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptText } from '@/lib/crypto';
import { PreferredAI, ThemeId, CanvasAssignment } from '@/lib/types';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const cookieStore = await cookies();
    const cookieAi = cookieStore.get('deadlnr_preferred_ai')?.value as PreferredAI;
    const cookieTheme = cookieStore.get('deadlnr_theme')?.value as ThemeId;
    const cookieDemo = cookieStore.get('deadlnr_show_demo_data')?.value === 'true';

    if (!session?.user) {
      return NextResponse.json({
        preferred_ai: cookieAi || 'gemini',
        theme: cookieTheme || 'default',
        show_demo_data: cookieDemo, // OFF by default (false)
        has_feed_url: false,
        isGuest: true,
      });
    }

    const userId = session.user.id;

    // Get settings from Supabase
    const { data: settings } = await supabase
      .from('user_settings')
      .select('preferred_ai, theme, show_demo_data, custom_assignments')
      .eq('user_id', userId)
      .single();

    // Check credentials existence
    const { data: creds } = await supabase
      .from('canvas_credentials')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    const selectedAi = (settings?.preferred_ai as PreferredAI) || cookieAi || 'gemini';
    const selectedTheme = (settings?.theme as ThemeId) || cookieTheme || 'default';
    const showDemoData = settings?.show_demo_data ?? cookieDemo;

    return NextResponse.json({
      preferred_ai: selectedAi,
      theme: selectedTheme,
      show_demo_data: showDemoData, // OFF by default
      custom_assignments: settings?.custom_assignments || [],
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
    const { feed_url, preferred_ai, theme, show_demo_data, custom_assignments } = body;

    const response = NextResponse.json({
      success: true,
      preferred_ai: preferred_ai || 'gemini',
      theme: theme || 'default',
      show_demo_data: !!show_demo_data,
      isGuest: !session?.user,
    });

    // Set cookies on response for cross-page & guest fallback persistence
    if (preferred_ai) {
      response.cookies.set('deadlnr_preferred_ai', preferred_ai, {
        path: '/',
        maxAge: 31536000, // 1 year
      });
    }

    if (theme) {
      response.cookies.set('deadlnr_theme', theme, {
        path: '/',
        maxAge: 31536000,
      });
    }

    response.cookies.set('deadlnr_show_demo_data', String(!!show_demo_data), {
      path: '/',
      maxAge: 31536000,
    });

    if (Array.isArray(custom_assignments)) {
      response.cookies.set('deadlnr_custom_assignments', JSON.stringify(custom_assignments), {
        path: '/',
        maxAge: 31536000,
      });
    }

    if (!session?.user) {
      return response;
    }

    const userId = session.user.id;

    // Build upsert payload for Supabase database account persistence
    const upsertData: Record<string, any> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (preferred_ai) upsertData.preferred_ai = preferred_ai;
    if (theme) upsertData.theme = theme;
    if (typeof show_demo_data === 'boolean') upsertData.show_demo_data = show_demo_data;
    if (Array.isArray(custom_assignments)) upsertData.custom_assignments = custom_assignments;

    await supabase
      .from('user_settings')
      .upsert(upsertData);

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
