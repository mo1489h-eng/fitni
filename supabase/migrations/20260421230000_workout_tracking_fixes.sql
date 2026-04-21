-- Workout tracking fixes:
--   1. Repair session_logs schema (wrong FK → sessions, bad CHECK on updated_by,
--      missing unique + updated_at + RLS, missing realtime) left behind by an
--      old pre-existing table that the earlier CREATE TABLE IF NOT EXISTS
--      migration could not amend.
--   2. Add get_portal_recent_workouts RPC (trainee mobile "تقدمي" tab).
--   3. Backfill program_exercises.exercise_library_id by name match so the
--      muscle heatmap join chain resolves to exercise_library.muscle_group.
--
-- ALTERs only; never drops existing data.

-- ── 1. session_logs schema repair ────────────────────────────────────────────

-- 1a. session_id → workout_sessions(id)
ALTER TABLE public.session_logs
  DROP CONSTRAINT IF EXISTS session_logs_session_id_fkey;
ALTER TABLE public.session_logs
  ADD CONSTRAINT session_logs_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.workout_sessions(id) ON DELETE CASCADE;

-- 1b. drop the bad CHECK (("trainer","trainee")) and coerce updated_by to uuid
ALTER TABLE public.session_logs
  DROP CONSTRAINT IF EXISTS session_logs_updated_by_check;

DO $$
DECLARE
  v_type text;
BEGIN
  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'session_logs'
    AND column_name  = 'updated_by';

  IF v_type IS NOT NULL AND v_type <> 'uuid' THEN
    EXECUTE 'ALTER TABLE public.session_logs '
         || 'ALTER COLUMN updated_by TYPE uuid '
         || 'USING NULLIF(updated_by::text, '''')::uuid';
  END IF;
END $$;

-- 1c. FK updated_by → auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.session_logs'::regclass
      AND conname  = 'session_logs_updated_by_fkey'
  ) THEN
    ALTER TABLE public.session_logs
      ADD CONSTRAINT session_logs_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 1d. UNIQUE (session_id, exercise_id, set_number) — required for ON CONFLICT upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.session_logs'::regclass
      AND c.contype  = 'u'
      AND (
        SELECT array_agg(a.attname ORDER BY a.attname)
        FROM unnest(c.conkey) k
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k
      ) = ARRAY['exercise_id','session_id','set_number']::name[]
  ) THEN
    ALTER TABLE public.session_logs
      ADD CONSTRAINT session_logs_session_exercise_set_key
      UNIQUE (session_id, exercise_id, set_number);
  END IF;
END $$;

-- 1e. updated_at column + last-write-wins trigger
ALTER TABLE public.session_logs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.session_logs
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public.session_logs
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.session_logs_set_timestamps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := COALESCE(NEW.updated_at, now());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.created_at := OLD.created_at;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_session_logs_timestamps ON public.session_logs;
CREATE TRIGGER trg_session_logs_timestamps
  BEFORE INSERT OR UPDATE ON public.session_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.session_logs_set_timestamps();

-- 1f. mirror → workout_session_exercises (for analytics / legacy readers)
CREATE OR REPLACE FUNCTION public.sync_session_log_to_session_exercises()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_id uuid;
  v_ts     timestamptz;
BEGIN
  SELECT pe.day_id INTO v_day_id
  FROM public.program_exercises pe
  WHERE pe.id = NEW.exercise_id;

  IF v_day_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_ts := COALESCE(NEW.updated_at, NEW.created_at);

  INSERT INTO public.workout_session_exercises (
    session_id, exercise_id, program_day_id, set_number,
    weight_used, reps_completed, completed_at
  )
  VALUES (
    NEW.session_id, NEW.exercise_id, v_day_id, NEW.set_number,
    NEW.weight, NEW.reps, v_ts
  )
  ON CONFLICT (session_id, exercise_id, set_number)
  DO UPDATE SET
    weight_used    = EXCLUDED.weight_used,
    reps_completed = EXCLUDED.reps_completed,
    completed_at   = EXCLUDED.completed_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_session_log_to_wse ON public.session_logs;
CREATE TRIGGER trg_sync_session_log_to_wse
  AFTER INSERT OR UPDATE ON public.session_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_session_log_to_session_exercises();

-- 1g. RLS — participants (trainee or trainer) only
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_logs_select_participants" ON public.session_logs;
CREATE POLICY "session_logs_select_participants"
ON public.session_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    JOIN public.clients c ON c.id = ws.client_id
    WHERE ws.id = session_logs.session_id
      AND (c.auth_user_id = auth.uid() OR c.trainer_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "session_logs_insert_participants" ON public.session_logs;
CREATE POLICY "session_logs_insert_participants"
ON public.session_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    JOIN public.clients c ON c.id = ws.client_id
    WHERE ws.id = session_logs.session_id
      AND (c.auth_user_id = auth.uid() OR c.trainer_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "session_logs_update_participants" ON public.session_logs;
CREATE POLICY "session_logs_update_participants"
ON public.session_logs FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    JOIN public.clients c ON c.id = ws.client_id
    WHERE ws.id = session_logs.session_id
      AND (c.auth_user_id = auth.uid() OR c.trainer_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    JOIN public.clients c ON c.id = ws.client_id
    WHERE ws.id = session_logs.session_id
      AND (c.auth_user_id = auth.uid() OR c.trainer_id = auth.uid())
  )
);

-- 1h. realtime publication (idempotent)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_session_logs_session_id
  ON public.session_logs (session_id);

-- ── 2. RPC: trainee mobile "تقدمي" recent workouts ───────────────────────────

CREATE OR REPLACE FUNCTION public.get_portal_recent_workouts(
  p_token text,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id               uuid,
  completed_at     timestamptz,
  duration_minutes integer,
  total_volume     numeric,
  total_sets       integer,
  created_at       timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client uuid;
BEGIN
  SELECT c.id INTO v_client
  FROM public.clients c
  WHERE c.portal_token = p_token
    AND c.portal_token IS NOT NULL
    AND (c.portal_token_expires_at IS NULL OR c.portal_token_expires_at > now())
  LIMIT 1;

  IF v_client IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ws.id,
         ws.completed_at,
         ws.duration_minutes,
         ws.total_volume,
         ws.total_sets,
         ws.created_at
  FROM public.workout_sessions ws
  WHERE ws.client_id = v_client
    AND ws.completed_at IS NOT NULL
  ORDER BY ws.completed_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_portal_recent_workouts(text, integer)
  TO anon, authenticated;

-- ── 3. Backfill program_exercises.exercise_library_id by name match ──────────
--
-- Case-insensitive match against name_en / name_ar. Only updates rows that are
-- currently NULL (so trainer-authored mappings are preserved).

UPDATE public.program_exercises pe
SET exercise_library_id = el.id
FROM public.exercise_library el
WHERE pe.exercise_library_id IS NULL
  AND (
    LOWER(TRIM(pe.name)) = LOWER(TRIM(el.name_en))
    OR LOWER(TRIM(pe.name)) = LOWER(TRIM(el.name_ar))
  );

NOTIFY pgrst, 'reload schema';
