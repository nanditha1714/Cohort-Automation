-- Migration: Create startup_reviews table for multi-department reviews
-- This adds a table to track individual reviews from the 'iPreneur', 'Digital', and 'Investments' departments

CREATE TABLE IF NOT EXISTS public.startup_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department TEXT NOT NULL CHECK (department IN ('iPreneur', 'Digital', 'Investments')),
  evaluation TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure a department can only leave one review per startup
  CONSTRAINT unique_department_review UNIQUE (submission_id, department)
);

-- Enable RLS
ALTER TABLE public.startup_reviews ENABLE ROW LEVEL SECURITY;

-- Allow users to read all reviews
CREATE POLICY "Users can read all reviews"
  ON public.startup_reviews
  FOR SELECT
  USING (true);

-- Allow users to create reviews (the API backend handles the logic, but this allows direct DB inserts if authenticated)
CREATE POLICY "Users can create reviews"
  ON public.startup_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- Allow users to update their own reviews
CREATE POLICY "Users can update own reviews"
  ON public.startup_reviews
  FOR UPDATE
  USING (auth.uid() = reviewer_id);

-- Ensure admins/service roles can do everything
CREATE POLICY "Admins can manage all reviews"
  ON public.startup_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Create an index to quickly find reviews for a submission
CREATE INDEX IF NOT EXISTS idx_startup_reviews_submission_id ON public.startup_reviews(submission_id);
