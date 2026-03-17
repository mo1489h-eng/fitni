-- Drop the overly broad anon SELECT policy on profiles
DROP POLICY IF EXISTS "Public can read profiles via view" ON public.profiles;

-- Recreate public_profiles view as SECURITY DEFINER so it doesn't need base table anon access
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT user_id, full_name, avatar_url, bio,
       specialization, logo_url, brand_color, welcome_message
FROM public.profiles;

-- Ensure anon can still read the view
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;