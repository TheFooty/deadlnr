-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard -> SQL Editor -> New Query):

-- 1. Drop old foreign key constraints linked to auth.users (which blocked email OTP logins)
ALTER TABLE IF EXISTS public.canvas_credentials DROP CONSTRAINT IF EXISTS canvas_credentials_user_id_fkey;
ALTER TABLE IF EXISTS public.user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;
ALTER TABLE IF EXISTS public.swipe_history DROP CONSTRAINT IF EXISTS swipe_history_user_id_fkey;

-- 2. Ensure columns exist and user_id is nullable
ALTER TABLE IF EXISTS public.canvas_credentials ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE IF EXISTS public.canvas_credentials ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.user_settings ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE IF EXISTS public.user_settings ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.swipe_history ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE IF EXISTS public.swipe_history ALTER COLUMN user_id DROP NOT NULL;

-- 3. Recreate user_settings table cleanly if needed
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

-- 4. Recreate canvas_credentials table cleanly if needed
CREATE TABLE IF NOT EXISTS public.canvas_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  encrypted_feed_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Recreate swipe_history table cleanly if needed
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

-- 6. Notification logs table for cron emails
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  assignment_id TEXT NOT NULL,
  milestone TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Add unique constraints on user_email for seamless syncing
ALTER TABLE public.canvas_credentials DROP CONSTRAINT IF EXISTS canvas_credentials_user_email_key;
ALTER TABLE public.canvas_credentials ADD CONSTRAINT canvas_credentials_user_email_key UNIQUE (user_email);

ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS user_settings_user_email_key;
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_email_key UNIQUE (user_email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_logs_milestone ON public.notification_logs(user_email, assignment_id, milestone);

-- 8. Enable Row Level Security & permissive access for backend operations
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipe_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Public access for canvas_credentials" ON public.canvas_credentials;
DROP POLICY IF EXISTS "Public access for swipe_history" ON public.swipe_history;
DROP POLICY IF EXISTS "Public access for notification_logs" ON public.notification_logs;

CREATE POLICY "Public access for user_settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for canvas_credentials" ON public.canvas_credentials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for swipe_history" ON public.swipe_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for notification_logs" ON public.notification_logs FOR ALL USING (true) WITH CHECK (true);
