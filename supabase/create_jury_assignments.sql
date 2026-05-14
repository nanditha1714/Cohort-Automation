-- Create a table to track Jury assignments
CREATE TABLE IF NOT EXISTS public.jury_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
    jury_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(submission_id, jury_id)
);

-- Enable RLS
ALTER TABLE public.jury_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and Internal Team can view all assignments
CREATE POLICY "Admins and Internal Team can view all jury assignments"
    ON public.jury_assignments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('ADMIN', 'INTERNAL_TEAM')
        )
    );

-- Policy: Jury can view their own assignments
CREATE POLICY "Jury members can view their own assignments"
    ON public.jury_assignments
    FOR SELECT
    USING (jury_id = auth.uid());

-- Policy: Admins and iPreneur members can manage jury assignments
CREATE POLICY "Admins and iPreneur can manage jury assignments"
    ON public.jury_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND (role = 'ADMIN' OR (role = 'INTERNAL_TEAM' AND department = 'iPreneur'))
        )
    );
