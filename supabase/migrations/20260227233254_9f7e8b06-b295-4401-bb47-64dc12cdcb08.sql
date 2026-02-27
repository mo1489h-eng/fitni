
-- Create profiles table for trainers
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add trainer_id and portal_token to clients
ALTER TABLE public.clients 
  ADD COLUMN trainer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN portal_token text UNIQUE;

-- Generate portal tokens for existing clients
CREATE OR REPLACE FUNCTION public.generate_portal_token()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.portal_token IS NULL THEN
    NEW.portal_token := encode(gen_random_bytes(12), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_portal_token
  BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.generate_portal_token();

-- Update existing clients to have portal tokens
UPDATE public.clients SET portal_token = encode(gen_random_bytes(12), 'hex') WHERE portal_token IS NULL;

-- Drop old permissive policies and create proper ones
DROP POLICY IF EXISTS "Allow all delete access" ON public.clients;
DROP POLICY IF EXISTS "Allow all insert access" ON public.clients;
DROP POLICY IF EXISTS "Allow all read access" ON public.clients;
DROP POLICY IF EXISTS "Allow all update access" ON public.clients;

-- Trainers can manage their own clients
CREATE POLICY "Trainers can read own clients" ON public.clients
  FOR SELECT TO authenticated USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert own clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own clients" ON public.clients
  FOR UPDATE TO authenticated USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own clients" ON public.clients
  FOR DELETE TO authenticated USING (trainer_id = auth.uid());

-- Allow anonymous access to clients via portal_token (for client portal)
CREATE POLICY "Portal token read access" ON public.clients
  FOR SELECT TO anon USING (portal_token IS NOT NULL);
