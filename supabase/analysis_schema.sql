-- Add columns to support automated AI analysis and queuing
ALTER TABLE public.form_submissions
ADD COLUMN ai_analysis TEXT,
ADD COLUMN analysis_status TEXT DEFAULT 'PENDING' CHECK (analysis_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
ADD COLUMN company_name TEXT DEFAULT 'Unknown Startup';

-- Create an index to speed up finding PENDING jobs in the queue
CREATE INDEX idx_analysis_status ON public.form_submissions(analysis_status);

-- Ensure Admins have access to update the status (if RLS is active)
-- Service Role keys bypass this anyway, but good measure.
