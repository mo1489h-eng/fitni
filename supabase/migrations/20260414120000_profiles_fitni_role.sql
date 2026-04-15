-- Fitni: app-level role for coach vs trainee (separate from auth metadata)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'coach'
  CHECK (role IN ('coach', 'trainee'));

COMMENT ON COLUMN public.profiles.role IS 'Fitni app role: coach (trainer) or trainee (client app user)';
