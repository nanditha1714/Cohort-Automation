-- Migration: Update department constraint to allow 'Admin'
ALTER TABLE public.startup_reviews DROP CONSTRAINT IF EXISTS startup_reviews_department_check;

ALTER TABLE public.startup_reviews ADD CONSTRAINT startup_reviews_department_check check (
  (
    department = any (
      array[
        'iPreneur'::text,
        'Digital'::text,
        'Investments'::text,
        'Admin'::text
      ]
    )
  )
);
