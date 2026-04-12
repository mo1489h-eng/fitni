-- Per-set rows for workout sessions + live session fields + portal program muscle metadata

-- 1) Extend workout_sessions
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS trainer_id uuid,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_exercise_index integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.workout_sessions.trainer_id IS 'Denormalized from clients.trainer_id at session start';
COMMENT ON COLUMN public.workout_sessions.is_active IS 'True while client is in an in-progress workout';
COMMENT ON COLUMN public.workout_sessions.current_exercise_index IS '0-based index in program day for live coach view';

CREATE INDEX IF NOT EXISTS idx_workout_sessions_client_active
  ON public.workout_sessions (client_id) WHERE is_active = true;

-- 2) workout_session_exercises
CREATE TABLE IF NOT EXISTS public.workout_session_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.program_exercises(id) ON DELETE CASCADE,
  program_day_id uuid NOT NULL REFERENCES public.program_days(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  weight_used numeric,
  reps_completed integer,
  completed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, exercise_id, set_number)
);

ALTER TABLE public.workout_session_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage own session exercises"
ON public.workout_session_exercises
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    JOIN public.clients c ON c.id = ws.client_id
    WHERE ws.id = workout_session_exercises.session_id AND c.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    JOIN public.clients c ON c.id = ws.client_id
    WHERE ws.id = workout_session_exercises.session_id AND c.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Trainers read session exercises for clients"
ON public.workout_session_exercises
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    JOIN public.clients c ON c.id = ws.client_id
    WHERE ws.id = workout_session_exercises.session_id AND c.trainer_id = auth.uid()
  )
);

CREATE POLICY "Trainers insert session exercises for clients"
ON public.workout_session_exercises
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    JOIN public.clients c ON c.id = ws.client_id
    WHERE ws.id = workout_session_exercises.session_id AND c.trainer_id = auth.uid()
  )
);

CREATE POLICY "Trainers update session exercises for clients"
ON public.workout_session_exercises
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    JOIN public.clients c ON c.id = ws.client_id
    WHERE ws.id = workout_session_exercises.session_id AND c.trainer_id = auth.uid()
  )
);

-- 3) Trainers can send encouragement notifications to clients
CREATE POLICY "Trainers can insert notifications for their clients"
ON public.client_notifications
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_notifications.client_id AND c.trainer_id = auth.uid()
  )
);

-- 4) Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_session_exercises; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 5) Enrich get_portal_program with muscle_group + instructions from exercise_library
CREATE OR REPLACE FUNCTION public.get_portal_program(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_client record;
    v_program record;
    v_result jsonb;
BEGIN
    SELECT id, program_id, week_number INTO v_client
    FROM public.clients
    WHERE portal_token = p_token
      AND portal_token IS NOT NULL
      AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
    LIMIT 1;

    IF v_client IS NULL OR v_client.program_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT id, name, weeks INTO v_program
    FROM public.programs
    WHERE id = v_client.program_id;

    IF v_program IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_build_object(
        'id', v_program.id,
        'name', v_program.name,
        'weeks', v_program.weeks,
        'week_number', v_client.week_number,
        'days', COALESCE((
            SELECT jsonb_agg(day_data ORDER BY d.day_order)
            FROM public.program_days d
            CROSS JOIN LATERAL (
                SELECT jsonb_build_object(
                    'id', d.id,
                    'day_name', d.day_name,
                    'day_order', d.day_order,
                    'exercises', COALESCE((
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'id', e.id,
                                'name', e.name,
                                'sets', e.sets,
                                'reps', e.reps,
                                'weight', e.weight,
                                'video_url', e.video_url,
                                'exercise_order', e.exercise_order,
                                'rest_seconds', e.rest_seconds,
                                'tempo', e.tempo,
                                'rpe', e.rpe,
                                'notes', e.notes,
                                'is_warmup', e.is_warmup,
                                'superset_group', e.superset_group,
                                'exercise_library_id', e.exercise_library_id,
                                'muscle_group', COALESCE(el.muscle_group, 'عام'),
                                'instructions_ar', el.instructions_ar
                            ) ORDER BY e.exercise_order
                        )
                        FROM public.program_exercises e
                        LEFT JOIN public.exercise_library el ON el.id = e.exercise_library_id
                        WHERE e.day_id = d.id
                    ), '[]'::jsonb)
                ) AS day_data
            ) sub
            WHERE d.program_id = v_program.id
        ), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$;
