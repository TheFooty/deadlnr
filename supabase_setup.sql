-- =========================================================
-- Deadlnr Supabase Complete Database Schema & Migration Script
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- =========================================================

-- 1. Create or update user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_ai TEXT DEFAULT 'gemini',
  theme TEXT DEFAULT 'default',
  show_demo_data BOOLEAN DEFAULT false,
  custom_assignments JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist for existing tables
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS preferred_ai TEXT DEFAULT 'gemini';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'default';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS show_demo_data BOOLEAN DEFAULT false;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS custom_assignments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create or update canvas_credentials table
CREATE TABLE IF NOT EXISTS public.canvas_credentials (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_feed_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create or update swipe_history table
CREATE TABLE IF NOT EXISTS public.swipe_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id TEXT NOT NULL,
  assignment_title TEXT,
  course TEXT,
  direction TEXT CHECK (direction IN ('left', 'right')),
  swiped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipe_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent duplication errors
DROP POLICY IF EXISTS "Users can manage user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can manage canvas_credentials" ON public.canvas_credentials;
DROP POLICY IF EXISTS "Users can manage swipe_history" ON public.swipe_history;

-- Create RLS Policies
CREATE POLICY "Users can manage user_settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage canvas_credentials" ON public.canvas_credentials
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage swipe_history" ON public.swipe_history
  FOR ALL USING (auth.uid() = user_id);
