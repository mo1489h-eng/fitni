
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
  -- Get client by portal token
  SELECT id, program_id, week_number INTO v_client
  FROM public.clients
  WHERE portal_token = p_token
    AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;

  IF v_client IS NULL OR v_client.program_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get program
  SELECT id, name, weeks INTO v_program
  FROM public.programs
  WHERE id = v_client.program_id;

  IF v_program IS NULL THEN
    RETURN NULL;
  END IF;

  -- Build full program JSON with days and exercises
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
                'exercise_library_id', e.exercise_library_id
              ) ORDER BY e.exercise_order
            )
            FROM public.program_exercises e
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
