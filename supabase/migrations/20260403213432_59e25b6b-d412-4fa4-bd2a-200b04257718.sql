
-- RPC for clients to view their challenges via portal token
CREATE OR REPLACE FUNCTION public.get_portal_challenges(p_token text)
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

  SELECT COALESCE(jsonb_agg(challenge_data ORDER BY c_created DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT 
      jsonb_build_object(
        'challenge_id', c.id,
        'title', c.title,
        'description', c.description,
        'challenge_type', c.challenge_type,
        'kpi_unit', c.kpi_unit,
        'start_date', c.start_date,
        'end_date', c.end_date,
        'status', c.status,
        'prize_description', c.prize_description,
        'entry_fee', c.entry_fee,
        'my_current_value', cp.current_value,
        'my_best_value', cp.best_value,
        'my_rank', cp.rank,
        'my_badges', cp.badges,
        'participant_id', cp.id,
        'leaderboard', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'participant_id', p2.id,
              'client_name', cl.name,
              'current_value', p2.current_value,
              'best_value', p2.best_value,
              'rank', p2.rank,
              'badges', p2.badges,
              'is_me', (p2.client_id = v_client_id)
            ) ORDER BY 
              CASE WHEN c.challenge_type = 'weight_loss' THEN p2.current_value END ASC,
              CASE WHEN c.challenge_type != 'weight_loss' THEN p2.current_value END DESC
          )
          FROM public.challenge_participants p2
          JOIN public.clients cl ON cl.id = p2.client_id
          WHERE p2.challenge_id = c.id
        ), '[]'::jsonb)
      ) as challenge_data,
      c.created_at as c_created
    FROM public.challenge_participants cp
    JOIN public.challenges c ON c.id = cp.challenge_id
    WHERE cp.client_id = v_client_id
  ) sub;

  RETURN v_result;
END;
$$;
