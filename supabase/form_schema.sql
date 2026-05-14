-- Create a table specifically designed to handle flexible form submissions
CREATE TABLE public.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- We use JSONB so it automatically scales from 1 field to 100 fields
    -- without needing manual column creation.
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- If your user uploads multiple files, you might want to store URLs in jsonb too,
    -- but storing the first/primary file URL in a dedicated column is helpful for sorting.
    file_url TEXT,
    email_notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Optional, but good practice).
-- Note: Forms submitted via the Next.js API use the Service Role Key, which bypasses RLS.
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Allow Admins to read submissions from the client dashboard
CREATE POLICY "Admins can view form submissions"
  ON public.form_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'ADMIN'
    )
  );

-- No public insert policy needed, inputs are handled securely by Next.js Server Route

-- Migration query to run on an existing table:
-- ALTER TABLE public.form_submissions ADD COLUMN email_notified BOOLEAN DEFAULT false;
