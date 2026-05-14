-- Create a table for Jury evaluations
CREATE TABLE IF NOT EXISTS public.jury_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
    jury_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scores JSONB DEFAULT '{}'::jsonb NOT NULL,
    notes JSONB DEFAULT '{}'::jsonb NOT NULL,
    total_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(submission_id, jury_id)
);

-- Enable RLS
ALTER TABLE public.jury_evaluations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and Internal Team can view all evaluations
CREATE POLICY "Admins and Internal Team can view all jury evaluations"
    ON public.jury_evaluations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('ADMIN', 'INTERNAL_TEAM')
        )
    );

-- Policy: Jury can view and manage their own evaluations
CREATE POLICY "Jury members can manage their own evaluations"
    ON public.jury_evaluations
    FOR ALL
    USING (jury_id = auth.uid());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jury_evaluations_updated_at
    BEFORE UPDATE ON public.jury_evaluations
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
