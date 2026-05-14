-- Migration: Add foreign key relationship between startup_reviews and user_profiles
-- This allows us to fetch reviewer names when displaying reviews

ALTER TABLE public.startup_reviews 
DROP CONSTRAINT IF EXISTS startup_reviews_reviewer_id_fkey;

ALTER TABLE public.startup_reviews
ADD CONSTRAINT startup_reviews_reviewer_id_fkey 
FOREIGN KEY (reviewer_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
