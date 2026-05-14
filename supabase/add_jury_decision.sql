ALTER TABLE public.form_submissions ADD COLUMN IF NOT EXISTS is_jury_accepted BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_is_jury_accepted ON public.form_submissions(is_jury_accepted);
