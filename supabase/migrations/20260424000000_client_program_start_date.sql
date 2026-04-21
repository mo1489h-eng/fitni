-- Coach-controlled program start date
-- ---------------------------------------------------------------------------
-- 1. Add clients.program_start_date (DATE, nullable, defaults today).
-- 2. Back-fill rows that already have a program_id.
-- 3. Update get_portal_program() RPC to return start_date in its JSON payload.

-- 1. Column ---------------------------------------------------------------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS program_start_date DATE;

COMMENT ON COLUMN public.clients.program_start_date IS
  'Date the currently assigned program officially starts for this client. '
  'Used to derive "اليوم X من Y" and to pick today''s program day in rotation.';

-- 2. Back-fill: any existing assignment without a start_date → today ------
UPDATE public.clients
   SET program_start_date = CURRENT_DATE
 WHERE program_id IS NOT NULL
   AND program_start_date IS NULL;

-- 3. Update the portal RPC to expose start_date ---------------------------
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
    SELECT id, program_id, week_number, program_start_date INTO v_client
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
        'start_date', v_client.program_start_date,
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

NOTIFY pgrst, 'reload schema';
