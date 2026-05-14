-- Fix foreign key to allow proper joins with user_profiles table
ALTER TABLE public.jury_assignments 
DROP CONSTRAINT IF EXISTS jury_assignments_jury_id_fkey;

ALTER TABLE public.jury_assignments
ADD CONSTRAINT jury_assignments_jury_id_fkey 
FOREIGN KEY (jury_id) 
REFERENCES public.user_profiles(id) 
ON DELETE CASCADE;
