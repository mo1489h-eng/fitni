
CREATE OR REPLACE FUNCTION public.get_portal_upcoming_sessions(p_token text, p_limit integer DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    SELECT ts.id, ts.session_date, ts.start_time, ts.duration_minutes, ts.session_type, ts.notes, ts.confirmation_status, ts.is_completed
    FROM public.trainer_sessions ts
    WHERE ts.client_id = v_client_id AND ts.session_date >= CURRENT_DATE AND ts.is_completed = false
    ORDER BY ts.session_date, ts.start_time
    LIMIT p_limit
  ) s;

  RETURN v_result;
END;
$$;
