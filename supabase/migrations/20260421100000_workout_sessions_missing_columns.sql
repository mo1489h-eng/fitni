-- Consolidated fix: make sure workout_sessions has all columns the app
-- reads/writes. Previous migrations (20260410213000, 20260413095733) added
-- these, but may not have been applied on all environments.

ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS current_exercise_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trainer_id            UUID;

-- Ensure FK to profiles(user_id) exists (idempotent: create only if missing).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workout_sessions_trainer_id_fkey'
      AND conrelid = 'public.workout_sessions'::regclass
  ) THEN
    ALTER TABLE public.workout_sessions
      ADD CONSTRAINT workout_sessions_trainer_id_fkey
      FOREIGN KEY (trainer_id)
      REFERENCES public.profiles(user_id)
      ON DELETE SET NULL;
  END IF;
END$$;

-- Partial index used by TrainerLiveSession / session-engine lookups.
CREATE INDEX IF NOT EXISTS idx_workout_sessions_client_active
  ON public.workout_sessions (client_id) WHERE is_active = true;

-- Helpful indexes for the new compliance / history queries.
CREATE INDEX IF NOT EXISTS idx_workout_sessions_client_created_at
  ON public.workout_sessions (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_trainer_started_at
  ON public.workout_sessions (trainer_id, started_at DESC)
  WHERE trainer_id IS NOT NULL;

COMMENT ON COLUMN public.workout_sessions.current_exercise_index IS
  '0-based index of the exercise the client is currently on (live coach view).';
COMMENT ON COLUMN public.workout_sessions.is_active IS
  'True while the client is in an in-progress workout.';
COMMENT ON COLUMN public.workout_sessions.trainer_id IS
  'Denormalized from clients.trainer_id at session start; FK profiles(user_id).';

-- Force PostgREST (Supabase REST) to reload schema cache so the new columns
-- become visible to the client immediately.
NOTIFY pgrst, 'reload schema';
