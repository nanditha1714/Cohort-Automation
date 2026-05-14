-- Migration: Restore the decision column to startup_reviews
ALTER TABLE public.startup_reviews ADD COLUMN IF NOT EXISTS decision TEXT;
