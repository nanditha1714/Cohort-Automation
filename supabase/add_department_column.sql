-- Migration: Add department column to user_profiles
-- This adds a text column to track which department a user belongs to (iPreneur, Digital, Investments).

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'None';

-- Optional: Add an index on department if we plan to filter heavily by it
CREATE INDEX IF NOT EXISTS idx_user_profiles_department ON public.user_profiles(department);
