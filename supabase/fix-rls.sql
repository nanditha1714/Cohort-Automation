-- FIXING ROW LEVEL SECURITY FOR GOOGLE FORMS
-- Explanation: The Google Apps Script uses the Supabase 'anon' key. 
-- By default, Supabase blocks all inserts until you explicitly create a policy allowing them.

-- 1. Database Policy: Allow incoming form submissions to insert new rows.
-- We are granting the 'anon' role the ability to INSERT into the form_submissions table.
CREATE POLICY "Allow anonymous form submissions"
  ON public.form_submissions
  FOR INSERT
  WITH CHECK (true); -- 'true' means any incoming insert is accepted

-- 2. Storage Bucket Policy: Allow incoming files to be uploaded to 'form-uploads'.
-- Storage buckets in Supabase have their own RLS policies.
-- Let's make sure the bucket exists and create an insert policy for it.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('form-uploads', 'form-uploads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public file uploads"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    -- Allow insert if they are targeting the 'form-uploads' bucket
    bucket_id = 'form-uploads' 
  );

-- Note: You might also need a SELECT policy if you want the public URL to instantly resolve,
-- but since the bucket is explicitly created as "public: true" above, read access is usually implicit.
CREATE POLICY "Allow public file viewing"
  ON storage.objects
  FOR SELECT
  USING ( bucket_id = 'form-uploads' );

