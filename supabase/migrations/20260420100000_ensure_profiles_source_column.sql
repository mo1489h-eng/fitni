-- Repair: public.handle_new_user() (see wallet migration) inserts into profiles.source.
-- If 20260418220000_trainee_acquisition_source was skipped but a later migration updated
-- handle_new_user, signup fails with: column "source" of relation "profiles" does not exist.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS source text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_source_check' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_source_check
      CHECK (source IS NULL OR source IN ('landing', 'invite'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.profiles.source IS 'Trainee acquisition channel: landing (self-serve) or invite (coach). NULL for coaches/legacy.';
