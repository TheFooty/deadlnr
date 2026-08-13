-- =========================================================
-- Deadlnr Supabase Complete Database Schema & Migration Script
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- =========================================================

-- 1. Create or update user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  preferred_ai TEXT DEFAULT 'gemini',
  theme TEXT DEFAULT 'default',
  show_demo_data BOOLEAN DEFAULT false,
  custom_assignments JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist for user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS preferred_ai TEXT DEFAULT 'gemini';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'default';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS show_demo_data BOOLEAN DEFAULT false;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS custom_assignments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create unique index on user_email for user_settings
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_email ON public.user_settings(user_email) WHERE user_email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id) WHERE user_id IS NOT NULL;

-- 2. Create or update canvas_credentials table
CREATE TABLE IF NOT EXISTS public.canvas_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  encrypted_feed_url TEXT,
  encrypted_api_token TEXT,
  canvas_base_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist for canvas_credentials
ALTER TABLE public.canvas_credentials ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.canvas_credentials ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.canvas_credentials ADD COLUMN IF NOT EXISTS encrypted_feed_url TEXT;
ALTER TABLE public.canvas_credentials ADD COLUMN IF NOT EXISTS encrypted_api_token TEXT;
ALTER TABLE public.canvas_credentials ADD COLUMN IF NOT EXISTS canvas_base_url TEXT;
ALTER TABLE public.canvas_credentials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create unique index on user_email for canvas_credentials
CREATE UNIQUE INDEX IF NOT EXISTS idx_canvas_credentials_email ON public.canvas_credentials(user_email) WHERE user_email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_canvas_credentials_user_id ON public.canvas_credentials(user_id) WHERE user_id IS NOT NULL;

-- 3. Create or update swipe_history table
CREATE TABLE IF NOT EXISTS public.swipe_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  assignment_id TEXT NOT NULL,
  assignment_title TEXT,
  course TEXT,
  direction TEXT CHECK (direction IN ('left', 'right')),
  swiped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure user_email column exists on swipe_history
ALTER TABLE public.swipe_history ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.swipe_history ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 4. Create or update notification_logs table (prevents spamming duplicate emails during background cron runs)
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  assignment_id TEXT NOT NULL,
  milestone TEXT NOT NULL, -- '3days', '1day', '12h', '3h', 'past_due'
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_logs_milestone ON public.notification_logs(user_email, assignment_id, milestone);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipe_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Public access for user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Public access for canvas_credentials" ON public.canvas_credentials;
DROP POLICY IF EXISTS "Public access for swipe_history" ON public.swipe_history;
DROP POLICY IF EXISTS "Public access for notification_logs" ON public.notification_logs;

-- Permissive policies for anonymous & authenticated operations (secured by backend encryption & session validation)
CREATE POLICY "Public access for user_settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for canvas_credentials" ON public.canvas_credentials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for swipe_history" ON public.swipe_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for notification_logs" ON public.notification_logs FOR ALL USING (true) WITH CHECK (true);
