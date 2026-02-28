
-- Fix RLS policies: change from RESTRICTIVE to PERMISSIVE so OR logic applies
DROP POLICY IF EXISTS "Portal token read access" ON public.clients;
DROP POLICY IF EXISTS "Trainers can read own clients" ON public.clients;
DROP POLICY IF EXISTS "Trainers can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Trainers can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Trainers can delete own clients" ON public.clients;

CREATE POLICY "Portal token read access" ON public.clients
  FOR SELECT USING (portal_token IS NOT NULL);

CREATE POLICY "Trainers can read own clients" ON public.clients
  FOR SELECT USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert own clients" ON public.clients
  FOR INSERT WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own clients" ON public.clients
  FOR UPDATE USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own clients" ON public.clients
  FOR DELETE USING (trainer_id = auth.uid());

-- Fix profiles policies too
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());
