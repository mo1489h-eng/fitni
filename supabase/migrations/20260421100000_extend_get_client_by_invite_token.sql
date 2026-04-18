-- Invite registration: expose subscription_price + trainer_id for post-signup Tap charge (ClientRegister).

DROP FUNCTION IF EXISTS public.get_client_by_invite_token(text);

CREATE FUNCTION public.get_client_by_invite_token(p_token text)
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  phone text,
  trainer_name text,
  trainer_username text,
  trainer_id uuid,
  subscription_price numeric,
  billing_cycle text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    c.id,
    c.name,
    c.email,
    c.phone,
    COALESCE(p.full_name, '') AS trainer_name,
    p.username AS trainer_username,
    c.trainer_id,
    c.subscription_price,
    c.billing_cycle
  FROM public.clients c
  LEFT JOIN public.profiles p ON p.user_id = c.trainer_id
  WHERE c.invite_token = p_token AND c.auth_user_id IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_by_invite_token(text) TO anon, authenticated;
