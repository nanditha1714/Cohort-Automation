-- Table for startup-specific documents
CREATE TABLE IF NOT EXISTS public.startup_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table for department-specific documents
CREATE TABLE IF NOT EXISTS public.department_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department TEXT NOT NULL, -- e.g., 'iPreneur'
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.startup_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_documents ENABLE ROW LEVEL SECURITY;

-- Policies for startup_documents
CREATE POLICY "Admins and iPreneur can view startup documents"
    ON public.startup_documents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND (role = 'ADMIN' OR (role = 'INTERNAL_TEAM' AND department = 'iPreneur'))
        )
    );

CREATE POLICY "Admins and iPreneur can manage startup documents"
    ON public.startup_documents
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND (role = 'ADMIN' OR (role = 'INTERNAL_TEAM' AND department = 'iPreneur'))
        )
    );

-- Policies for department_documents
CREATE POLICY "Admins and iPreneur can view department documents"
    ON public.department_documents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND (role = 'ADMIN' OR (role = 'INTERNAL_TEAM' AND department = 'iPreneur'))
        )
    );

CREATE POLICY "Admins and iPreneur can manage department documents"
    ON public.department_documents
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND (role = 'ADMIN' OR (role = 'INTERNAL_TEAM' AND department = 'iPreneur'))
        )
    );
