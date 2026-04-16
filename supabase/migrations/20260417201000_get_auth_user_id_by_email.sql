-- Used by Edge Function register-client-account (service_role only) to resolve auth.users.id
-- by email. Replaces fragile listUsers() pagination when handling duplicate-email signups.

CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth
AS $$
  SELECT id
  FROM auth.users
  WHERE email = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_auth_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_email(text) TO service_role;

COMMENT ON FUNCTION public.get_auth_user_id_by_email(text) IS
  'Service-role only: lookup auth.users.id by email for admin flows (e.g. client invite registration).';
