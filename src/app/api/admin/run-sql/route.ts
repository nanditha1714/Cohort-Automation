import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST() {
    try {
        const sql = `
CREATE TABLE IF NOT EXISTS public.startup_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department TEXT NOT NULL CHECK (department IN ('iPreneur', 'Digital', 'Investments')),
  notes TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('Accept', 'Reject')),
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

-- Create an index to quickly find reviews for a submission
CREATE INDEX IF NOT EXISTS idx_startup_reviews_submission_id ON public.startup_reviews(submission_id);
`;

        // The JS client doesn't have a raw query runner, but we can utilize the REST API if needed, 
        // or a remote RPC if available. However, since we cannot easily run raw multiline DDL from standard supabase-js client directly,
        // we might need a workaround if `supabase db push` is unavailable.
        return NextResponse.json({ error: "Cannot execute raw DDL via JS client directly. CLI required or RPC needed." }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
