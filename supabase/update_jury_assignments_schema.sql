-- Add scheduled_date and scheduled_time to jury_assignments
ALTER TABLE jury_assignments 
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_time TIME;
