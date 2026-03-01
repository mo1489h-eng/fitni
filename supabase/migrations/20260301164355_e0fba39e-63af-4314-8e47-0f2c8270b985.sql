
-- Add email, auth_user_id, and invite_token to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS auth_user_id uuid;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS invite_token text;

-- Trigger to auto-generate invite token when email is set
CREATE OR REPLACE FUNCTION public.generate_invite_token_on_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email <> '' AND (NEW.invite_token IS NULL OR NEW.invite_token = '') THEN
    NEW.invite_token := encode(extensions.gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_invite_token ON public.clients;
CREATE TRIGGER set_invite_token
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.generate_invite_token_on_email();

-- RLS: Allow clients to read their own record
CREATE POLICY "Clients can read own data" ON public.clients
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

-- RLS: Allow clients to read their own body scans
CREATE POLICY "Clients can read own body scans" ON public.body_scans
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.clients c WHERE c.id = body_scans.client_id AND c.auth_user_id = auth.uid()
));

-- RLS: Allow clients to insert their own body scans
CREATE POLICY "Clients can insert own body scans" ON public.body_scans
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.clients c WHERE c.id = body_scans.client_id AND c.auth_user_id = auth.uid()
));

-- RLS: Allow clients to read their own meal logs
CREATE POLICY "Clients can read own meal logs" ON public.meal_logs
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.clients c WHERE c.id = meal_logs.client_id AND c.auth_user_id = auth.uid()
));

-- RLS: Allow clients to read their own progress photos
CREATE POLICY "Clients can read own progress photos" ON public.progress_photos
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.clients c WHERE c.id = progress_photos.client_id AND c.auth_user_id = auth.uid()
));

-- RLS: Allow clients to read their own measurements
CREATE POLICY "Clients can read own measurements" ON public.measurements
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.clients c WHERE c.id = measurements.client_id AND c.auth_user_id = auth.uid()
));

-- RPC: Get client by invite token (public, for registration page)
CREATE OR REPLACE FUNCTION public.get_client_by_invite_token(p_token text)
RETURNS TABLE(id uuid, name text, email text, phone text, trainer_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.name, c.email, c.phone, 
    COALESCE(p.full_name, '') as trainer_name
  FROM public.clients c
  LEFT JOIN public.profiles p ON p.user_id = c.trainer_id
  WHERE c.invite_token = p_token AND c.auth_user_id IS NULL
  LIMIT 1;
$$;

-- RPC: Link client account after registration
CREATE OR REPLACE FUNCTION public.link_client_account(p_invite_token text, p_auth_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
BEGIN
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

-- RPC: Get client data for authenticated user
CREATE OR REPLACE FUNCTION public.get_my_client_profile()
RETURNS TABLE(id uuid, name text, portal_token text, trainer_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.name, c.portal_token, c.trainer_id
  FROM public.clients c
  WHERE c.auth_user_id = auth.uid()
  LIMIT 1;
$$;
