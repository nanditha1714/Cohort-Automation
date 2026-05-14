-- Add admin_jury_decision column to form_submissions
ALTER TABLE public.form_submissions ADD COLUMN IF NOT EXISTS admin_jury_decision TEXT;

-- Update comments for clarity
COMMENT ON COLUMN public.form_submissions.admin_jury_decision IS 'Final verdict recorded by Admin post-jury review: ACCEPTED, REJECTED, or NULL (Pending)';
