-- Deadlnr Supabase Schema Definition
-- Run this script in your Supabase SQL Editor (Database -> SQL Editor)

-- 1. Canvas Credentials (stores AES-256 encrypted iCal URL)
CREATE TABLE IF NOT EXISTS public.canvas_credentials (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_feed_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.canvas_credentials ENABLE ROW LEVEL SECURITY;

-- Canvas Credentials Policies
CREATE POLICY "Users can manage their own canvas credentials"
    ON public.canvas_credentials
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. User Settings (preferred AI tool: gemini, chatgpt, claude)
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_ai TEXT NOT NULL DEFAULT 'gemini' CHECK (preferred_ai IN ('gemini', 'chatgpt', 'claude')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- User Settings Policies
CREATE POLICY "Users can manage their own settings"
    ON public.user_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Swipe History (records left/right swipes for assignments)
CREATE TABLE IF NOT EXISTS public.swipe_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assignment_id TEXT NOT NULL,
    assignment_title TEXT NOT NULL,
    course TEXT,
    direction TEXT NOT NULL CHECK (direction IN ('left', 'right')),
    swiped_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.swipe_history ENABLE ROW LEVEL SECURITY;

-- Swipe History Policies
CREATE POLICY "Users can view and record their own swipe history"
    ON public.swipe_history
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_swipe_history_user_id ON public.swipe_history(user_id);
CREATE INDEX IF NOT EXISTS idx_swipe_history_swiped_at ON public.swipe_history(swiped_at DESC);
