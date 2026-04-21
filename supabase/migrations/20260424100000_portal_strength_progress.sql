-- Per-exercise strength progress for the trainee portal / mobile "تقدمي" tab.
-- Groups completed sets by normalized (trimmed, lower-cased) exercise name and
-- returns the first vs latest top-weight per training day, plus the number of
-- sessions recorded for that movement. Used to render rows like:
--   "بنش برس: 60kg → 80kg ↑33%".

CREATE OR REPLACE FUNCTION public.get_portal_strength_progress(p_token text)
RETURNS TABLE(
  exercise_name text,
  first_weight numeric,
  latest_weight numeric,
  first_date date,
  latest_date date,
  sessions_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE portal_token = p_token
    AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH daily AS (
    SELECT
      LOWER(TRIM(pe.name)) AS norm_name,
      pe.name              AS display_name,
      DATE(wl.logged_at)   AS day,
      MAX(wl.actual_weight) AS top_weight
    FROM public.workout_logs wl
    JOIN public.program_exercises pe ON pe.id = wl.exercise_id
    WHERE wl.client_id = v_client_id
      AND wl.actual_weight IS NOT NULL
      AND wl.actual_weight > 0
      AND pe.name IS NOT NULL
      AND TRIM(pe.name) <> ''
    GROUP BY LOWER(TRIM(pe.name)), pe.name, DATE(wl.logged_at)
  )
  SELECT
    (array_agg(display_name ORDER BY day DESC))[1] AS exercise_name,
    (array_agg(top_weight    ORDER BY day ASC))[1] AS first_weight,
    (array_agg(top_weight    ORDER BY day DESC))[1] AS latest_weight,
    MIN(day)          AS first_date,
    MAX(day)          AS latest_date,
    COUNT(*)::integer AS sessions_count
  FROM daily
  GROUP BY norm_name
  HAVING COUNT(*) >= 2
  ORDER BY MAX(day) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_portal_strength_progress(text)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
