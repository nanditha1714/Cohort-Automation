-- Migration: Add needs_admin_review column to form_submissions
ALTER TABLE public.form_submissions ADD COLUMN IF NOT EXISTS needs_admin_review BOOLEAN DEFAULT FALSE;
