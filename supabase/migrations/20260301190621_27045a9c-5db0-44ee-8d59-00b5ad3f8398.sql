-- Fix #1: Remove overly permissive anon SELECT on profiles base table
DROP POLICY IF EXISTS "Public can read profiles via view" ON public.profiles;

-- Create a secure RPC for public profile access (restricted columns only)
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  bio text,
  specialization text,
  logo_url text,
  brand_color text,
  welcome_message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, p.bio, p.specialization,
         p.logo_url, p.brand_color, p.welcome_message
  FROM public.profiles p
  WHERE p.user_id = p_user_id
  LIMIT 1;
$$;