
-- Fix search_path on generate_portal_token function
CREATE OR REPLACE FUNCTION public.generate_portal_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.portal_token IS NULL THEN
    NEW.portal_token := encode(gen_random_bytes(12), 'hex');
  END IF;
  RETURN NEW;
END;
$$;
