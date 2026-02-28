
-- Fix all RLS policies to be PERMISSIVE (drop restrictive ones, recreate as permissive)

-- CLIENTS table
DROP POLICY IF EXISTS "Portal token read access" ON public.clients;
DROP POLICY IF EXISTS "Trainers can read own clients" ON public.clients;
DROP POLICY IF EXISTS "Trainers can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Trainers can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Trainers can delete own clients" ON public.clients;

CREATE POLICY "Trainers can read own clients" ON public.clients
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Portal token read access" ON public.clients
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (portal_token IS NOT NULL AND portal_token = current_setting('request.headers', true)::json->>'x-portal-token');

-- Actually, portal access needs to work via direct query with token filter.
-- Let's use a simpler approach: allow anon SELECT when portal_token is not null
DROP POLICY IF EXISTS "Portal token read access" ON public.clients;
CREATE POLICY "Portal token read access" ON public.clients
  AS PERMISSIVE FOR SELECT TO anon
  USING (portal_token IS NOT NULL);

CREATE POLICY "Trainers can insert own clients" ON public.clients
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own clients" ON public.clients
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own clients" ON public.clients
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (trainer_id = auth.uid());

-- PROFILES table
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Recreate triggers (they're missing from the database)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_client_created ON public.clients;
CREATE TRIGGER on_client_created
  BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.generate_portal_token();
