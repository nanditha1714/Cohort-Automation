-- Create a table designed to keep a historical log of AI evaluation criteria
CREATE TABLE public.evaluation_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    criteria_text TEXT NOT NULL,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;

-- Allow Admins to read and insert criteria
CREATE POLICY "Admins can view and manage criteria"
  ON public.evaluation_criteria
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'ADMIN'
    )
  );

-- Function to ensure only ONE criteria is active at a time
-- When a new active criteria is inserted or updated to active,
-- automatically set all other criteria to inactive.
CREATE OR REPLACE FUNCTION public.ensure_single_active_criteria()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.evaluation_criteria
    SET is_active = false
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS single_active_criteria_trigger ON public.evaluation_criteria;

CREATE TRIGGER single_active_criteria_trigger
BEFORE INSERT OR UPDATE ON public.evaluation_criteria
FOR EACH ROW EXECUTE PROCEDURE public.ensure_single_active_criteria();
