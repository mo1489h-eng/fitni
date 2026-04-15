-- Live per-set sync: session_logs is the write path; trigger mirrors to workout_session_exercises (last write wins).

CREATE TABLE IF NOT EXISTS public.session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.program_exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  reps integer,
  weight numeric,
  completed boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, exercise_id, set_number)
);

CREATE INDEX IF NOT EXISTS idx_session_logs_session_id ON public.session_logs (session_id);

COMMENT ON TABLE public.session_logs IS 'Per-set live state for trainer/trainee sync; upsert = last write wins';

ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;

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

-- Mirror into workout_session_exercises for analytics / legacy readers (SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.sync_session_log_to_session_exercises()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_id uuid;
BEGIN
  SELECT pe.day_id INTO v_day_id FROM public.program_exercises pe WHERE pe.id = NEW.exercise_id;
  IF v_day_id IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.workout_session_exercises (
    session_id, exercise_id, program_day_id, set_number,
    weight_used, reps_completed, completed_at
  )
  VALUES (
    NEW.session_id, NEW.exercise_id, v_day_id, NEW.set_number,
    NEW.weight, NEW.reps, NEW.created_at
  )
  ON CONFLICT (session_id, exercise_id, set_number)
  DO UPDATE SET
    weight_used = EXCLUDED.weight_used,
    reps_completed = EXCLUDED.reps_completed,
    completed_at = EXCLUDED.completed_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_session_log_to_wse ON public.session_logs;
CREATE TRIGGER trg_sync_session_log_to_wse
  AFTER INSERT OR UPDATE ON public.session_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_session_log_to_session_exercises();

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
