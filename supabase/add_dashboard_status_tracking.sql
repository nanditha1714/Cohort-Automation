-- Migration: Add dashboard status tracking columns
-- This adds boolean flags to track the status of applications beyond AI analysis.

ALTER TABLE public.form_submissions
ADD COLUMN IF NOT EXISTS is_internal_reviewed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_jury_reviewed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_rejected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_payment_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE;

-- Optional: Add indexes if we plan to filter heavily by these in the future
CREATE INDEX IF NOT EXISTS idx_is_internal_reviewed ON public.form_submissions(is_internal_reviewed);
CREATE INDEX IF NOT EXISTS idx_is_jury_reviewed ON public.form_submissions(is_jury_reviewed);
CREATE INDEX IF NOT EXISTS idx_is_rejected ON public.form_submissions(is_rejected);
