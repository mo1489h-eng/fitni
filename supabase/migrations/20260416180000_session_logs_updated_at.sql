-- Accurate sync ordering: updated_at bumps on every write; created_at stays immutable after first insert.

ALTER TABLE public.session_logs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.session_logs
SET updated_at = COALESCE(updated_at, created_at, now());

ALTER TABLE public.session_logs
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

COMMENT ON COLUMN public.session_logs.updated_at IS 'Last mutation time; use for last-write-wins (merge)';

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

CREATE OR REPLACE FUNCTION public.sync_session_log_to_session_exercises()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_id uuid;
  v_ts timestamptz;
BEGIN
  SELECT pe.day_id INTO v_day_id FROM public.program_exercises pe WHERE pe.id = NEW.exercise_id;
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
    weight_used = EXCLUDED.weight_used,
    reps_completed = EXCLUDED.reps_completed,
    completed_at = EXCLUDED.completed_at;
  RETURN NEW;
END;
$$;
