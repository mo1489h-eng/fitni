-- Add per-set personal-record flag to workout_logs.
-- Used by the new workout session screen (Hevy / Strong–style PR badges).

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS is_pr BOOLEAN NOT NULL DEFAULT false;

-- Fast "best weight ever for this exercise before X" lookups.
CREATE INDEX IF NOT EXISTS idx_workout_logs_client_exercise_weight
  ON public.workout_logs (client_id, exercise_id, actual_weight DESC)
  WHERE actual_weight IS NOT NULL;

-- Fast "historical PRs" scans by client.
CREATE INDEX IF NOT EXISTS idx_workout_logs_client_is_pr
  ON public.workout_logs (client_id, logged_at DESC)
  WHERE is_pr = true;

COMMENT ON COLUMN public.workout_logs.is_pr IS
  'True when this set beat the client''s previous best weight for this exercise at the time it was logged.';

NOTIFY pgrst, 'reload schema';
