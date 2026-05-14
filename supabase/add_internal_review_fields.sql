-- Migration: Add Internal Review text fields
-- This adds text columns to allow the internal team to leave notes on an application and provide a reason for their decision.

ALTER TABLE public.form_submissions
ADD COLUMN IF NOT EXISTS internal_review_notes TEXT,
ADD COLUMN IF NOT EXISTS internal_review_reason TEXT;
