-- Used after "email already registered" to explain trainer vs client (SECURITY DEFINER reads auth.users).
CREATE OR REPLACE FUNCTION public.check_email_account_type(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
  v_trainer boolean;
  v_client boolean;
BEGIN
  v_norm := lower(trim(p_email));
  IF v_norm = '' THEN
    RETURN 'none';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    INNER JOIN public.profiles p ON p.user_id = u.id
    WHERE lower(trim(u.email)) = v_norm
  )
  INTO v_trainer;

  SELECT EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.email IS NOT NULL AND lower(trim(c.email)) = v_norm
  )
  INTO v_client;

  IF v_trainer AND v_client THEN
    RETURN 'both';
  ELSIF v_trainer THEN
    RETURN 'trainer';
  ELSIF v_client THEN
    RETURN 'client';
  ELSE
    RETURN 'none';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_email_account_type(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_email_account_type(text) TO anon, authenticated;
