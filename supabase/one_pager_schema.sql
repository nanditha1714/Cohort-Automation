-- Add one_pager_analysis column to form_submissions table
ALTER TABLE public.form_submissions
ADD COLUMN IF NOT EXISTS one_pager_analysis JSONB;
