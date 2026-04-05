
-- Add client_type column to clients table (online or in_person)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_type text NOT NULL DEFAULT 'online';

-- Add sessions_per_month to track total sessions for in-person clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sessions_per_month integer NOT NULL DEFAULT 0;

-- Add sessions_used to track completed sessions this period
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sessions_used integer NOT NULL DEFAULT 0;

-- Add confirmation_status and is_completed to trainer_sessions
ALTER TABLE public.trainer_sessions ADD COLUMN IF NOT EXISTS confirmation_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.trainer_sessions ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false;
