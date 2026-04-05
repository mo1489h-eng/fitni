
-- RPC for portal clients to confirm/decline sessions via portal token
CREATE OR REPLACE FUNCTION public.update_session_confirmation(
  p_token text,
  p_session_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  -- Validate status
  IF p_status NOT IN ('confirmed', 'declined') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  -- Get client_id from portal token
  SELECT id INTO v_client_id
  FROM clients
  WHERE portal_token = p_token
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now());

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  -- Update only if the session belongs to this client
  UPDATE trainer_sessions
  SET confirmation_status = p_status
  WHERE id = p_session_id
    AND client_id = v_client_id
    AND is_completed = false;

  RETURN FOUND;
END;
$$;

-- RPC for trainers to mark session complete and increment sessions_used
CREATE OR REPLACE FUNCTION public.complete_trainer_session(
  p_session_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session record;
  v_client record;
BEGIN
  -- Get the session, verify trainer owns it
  SELECT * INTO v_session
  FROM trainer_sessions
  WHERE id = p_session_id
    AND trainer_id = auth.uid()
    AND is_completed = false;

  IF v_session IS NULL THEN
    RETURN false;
  END IF;

  -- Mark session as completed
  UPDATE trainer_sessions
  SET is_completed = true
  WHERE id = p_session_id;

  -- Get client info
  SELECT client_type, sessions_used INTO v_client
  FROM clients
  WHERE id = v_session.client_id;

  -- Increment sessions_used for in-person clients
  IF v_client.client_type = 'in_person' THEN
    UPDATE clients
    SET sessions_used = COALESCE(v_client.sessions_used, 0) + 1
    WHERE id = v_session.client_id;
  END IF;

  RETURN true;
END;
$$;
