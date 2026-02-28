
-- Enable pgcrypto for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Recreate portal token function using extensions schema
CREATE OR REPLACE FUNCTION public.generate_portal_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.portal_token IS NULL THEN
    NEW.portal_token := encode(extensions.gen_random_bytes(12), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers (drop first if they exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_client_created ON public.clients;
CREATE TRIGGER on_client_created
  BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.generate_portal_token();
