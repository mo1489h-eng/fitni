
CREATE OR REPLACE FUNCTION public.get_portal_attendance(p_token text, p_days integer DEFAULT 84)
RETURNS TABLE(workout_date date, day_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
  IF v_client_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT DATE(ws.completed_at) as workout_date,
         COALESCE(pd.day_name, '') as day_name
  FROM public.workout_sessions ws
  LEFT JOIN public.program_days pd ON pd.id = ws.program_day_id
  WHERE ws.client_id = v_client_id
    AND ws.completed_at IS NOT NULL
    AND ws.completed_at >= (CURRENT_DATE - (p_days || ' days')::interval)
  ORDER BY workout_date;
END;
$$;
