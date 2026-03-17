-- Secure anonymous package checkout with one-time checkout sessions
CREATE TABLE IF NOT EXISTS public.package_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  client_email text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.package_checkout_sessions ENABLE ROW LEVEL SECURITY;

-- No direct table access from clients; access only via security definer function

CREATE OR REPLACE FUNCTION public.create_package_checkout_session(
  p_package_id uuid,
  p_client_name text,
  p_client_phone text,
  p_client_email text DEFAULT NULL
)
RETURNS TABLE(token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.package_checkout_sessions%ROWTYPE;
BEGIN
  IF p_package_id IS NULL THEN
    RAISE EXCEPTION 'Missing package id';
  END IF;

  IF p_client_name IS NULL OR length(trim(p_client_name)) < 2 THEN
    RAISE EXCEPTION 'Invalid client name';
  END IF;

  IF p_client_phone IS NULL OR length(trim(p_client_phone)) < 8 THEN
    RAISE EXCEPTION 'Invalid client phone';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.trainer_packages tp
    WHERE tp.id = p_package_id
      AND tp.is_active = true
  ) THEN
    RAISE EXCEPTION 'Package not found';
  END IF;

  INSERT INTO public.package_checkout_sessions (package_id, client_name, client_phone, client_email)
  VALUES (
    p_package_id,
    trim(p_client_name),
    trim(p_client_phone),
    NULLIF(trim(coalesce(p_client_email, '')), '')
  )
  RETURNING * INTO v_row;

  RETURN QUERY SELECT v_row.token, v_row.expires_at;
END;
$$;