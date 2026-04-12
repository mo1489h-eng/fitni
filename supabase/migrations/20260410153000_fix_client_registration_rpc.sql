-- Client registration from /client-register: ensure RPCs are executable from the browser
-- and link_client_account validates the session when one exists (after signUp with session).

CREATE OR REPLACE FUNCTION public.link_client_account(p_invite_token text, p_auth_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  -- When JWT is present (e.g. after signUp with immediate session), it must match the user being linked
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_auth_user_id THEN
    RAISE EXCEPTION 'Invalid session for link';
  END IF;

  UPDATE public.clients
  SET auth_user_id = p_auth_user_id, invite_token = NULL
  WHERE invite_token = p_invite_token AND auth_user_id IS NULL
  RETURNING id INTO v_client_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or already used invite token';
  END IF;

  RETURN v_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_by_invite_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_client_account(text, uuid) TO anon, authenticated;
