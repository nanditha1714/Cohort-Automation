-- Migration: Rename columns in startup_reviews to match the requested template
-- Changes 'notes' -> 'evaluation'
-- Changes 'decision' -> 'reason' (and removes the Accept/Reject constraint since it will be free text text)

ALTER TABLE public.startup_reviews RENAME COLUMN notes TO evaluation;

-- Drop the check constraint on decision if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'startup_reviews_decision_check'
  ) THEN
    ALTER TABLE public.startup_reviews DROP CONSTRAINT startup_reviews_decision_check;
  END IF;
END $$;

ALTER TABLE public.startup_reviews RENAME COLUMN decision TO reason;
