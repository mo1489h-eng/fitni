
-- RPC: Get portal workout stats (real data instead of hardcoded)
CREATE OR REPLACE FUNCTION public.get_portal_workout_stats(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_total_workouts integer;
  v_current_streak integer;
  v_result jsonb;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
  IF v_client_id IS NULL THEN RETURN '{}'::jsonb; END IF;

  -- Total completed workouts
  SELECT count(*) INTO v_total_workouts
  FROM public.workout_sessions
  WHERE client_id = v_client_id AND completed_at IS NOT NULL;

  -- Calculate streak (consecutive days with completed workouts)
  WITH daily_workouts AS (
    SELECT DISTINCT DATE(completed_at) as workout_date
    FROM public.workout_sessions
    WHERE client_id = v_client_id AND completed_at IS NOT NULL
    ORDER BY workout_date DESC
  ),
  streak AS (
    SELECT workout_date,
           workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC))::integer * interval '1 day' as grp
    FROM daily_workouts
  )
  SELECT count(*) INTO v_current_streak
  FROM streak
  WHERE grp = (SELECT grp FROM streak LIMIT 1);

  RETURN jsonb_build_object(
    'total_workouts', COALESCE(v_total_workouts, 0),
    'current_streak', COALESCE(v_current_streak, 0)
  );
END;
$$;

-- RPC: Get portal upcoming sessions
CREATE OR REPLACE FUNCTION public.get_portal_upcoming_sessions(p_token text, p_limit integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
  IF v_client_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.session_date, s.start_time), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT ts.id, ts.session_date, ts.start_time, ts.duration_minutes, ts.session_type, ts.notes
    FROM public.trainer_sessions ts
    WHERE ts.client_id = v_client_id AND ts.session_date >= CURRENT_DATE
    ORDER BY ts.session_date, ts.start_time
    LIMIT p_limit
  ) s;

  RETURN v_result;
END;
$$;

-- RPC: Get portal client achievements
CREATE OR REPLACE FUNCTION public.get_portal_achievements(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
  IF v_client_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT ca.id, ca.achievement_type, ca.achievement_value, ca.achievement_detail,
           ca.is_approved, ca.is_visible_on_page, ca.created_at
    FROM public.client_achievements ca
    WHERE ca.client_id = v_client_id
    ORDER BY ca.created_at DESC
  ) a;

  RETURN v_result;
END;
$$;
