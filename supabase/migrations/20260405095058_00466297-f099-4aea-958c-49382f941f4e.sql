
-- Add sessions_total to trainer_packages for session-based billing
ALTER TABLE public.trainer_packages ADD COLUMN IF NOT EXISTS sessions_total integer NOT NULL DEFAULT 0;
