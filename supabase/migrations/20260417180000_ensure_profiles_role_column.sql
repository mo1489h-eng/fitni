-- Some remote projects never applied earlier migrations; app requires public.profiles.role.
-- Safe to run multiple times.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text;

UPDATE public.profiles
SET role = 'coach'
WHERE role IS NULL OR btrim(role) = '';

UPDATE public.profiles p
SET role = 'trainee'
WHERE EXISTS (
  SELECT 1 FROM public.clients c
  WHERE c.auth_user_id = p.user_id
)
AND p.role IS DISTINCT FROM 'trainee';

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'coach';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('coach', 'trainee'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ALTER COLUMN role SET NOT NULL;

COMMENT ON COLUMN public.profiles.role IS 'Fitni app role: coach (trainer) or trainee (client app user)';
