-- Fix coach self-signup: compute_profile_role must honor raw_user_meta_data->>'role'
-- before falling back to trainee. Prior code required coach + is_client in ('false',…);
-- ambiguous is_client serialization could skip the coach branch and default to trainee.

CREATE OR REPLACE FUNCTION public.compute_profile_role(p_uid uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app jsonb;
  v_user jsonb;
  v_user_role text;
  v_is_client text;
  v_src text;
  v_meta_role text;
BEGIN
  IF p_uid IS NULL THEN
    RETURN 'trainee';
  END IF;

  IF EXISTS (SELECT 1 FROM public.clients c WHERE c.auth_user_id = p_uid) THEN
    RETURN 'trainee';
  END IF;

  SELECT u.raw_app_meta_data, u.raw_user_meta_data
  INTO v_app, v_user
  FROM auth.users u
  WHERE u.id = p_uid;

  IF NOT FOUND THEN
    RETURN 'trainee';
  END IF;

  v_src := lower(trim(COALESCE(v_user->>'source', '')));
  IF v_src IN ('landing', 'invite') THEN
    RETURN 'trainee';
  END IF;

  IF COALESCE(v_app->>'fitni_signup', '') = 'invite' THEN
    RETURN 'trainee';
  END IF;

  IF COALESCE(v_app->>'fitni_role', '') IN ('trainee', 'client', 'student') THEN
    RETURN 'trainee';
  END IF;

  IF COALESCE(v_app->>'fitni_role', '') IN ('coach', 'trainer', 'training_coach') THEN
    RETURN 'coach';
  END IF;

  -- Explicit signup role from Supabase Auth user_metadata (options.data on signUp)
  v_meta_role := lower(trim(COALESCE(v_user->>'role', '')));
  IF v_meta_role IN ('coach', 'trainer', 'training_coach') THEN
    RETURN 'coach';
  END IF;
  IF v_meta_role IN ('trainee', 'client', 'student') THEN
    RETURN 'trainee';
  END IF;

  v_user_role := v_meta_role;
  v_is_client := lower(trim(COALESCE(v_user->>'is_client', '')));
  IF (v_user->'is_client') = 'true'::jsonb THEN
    v_is_client := 'true';
  ELSIF (v_user->'is_client') = 'false'::jsonb THEN
    v_is_client := 'false';
  END IF;

  IF v_user_role IN ('trainee', 'client', 'student') OR v_is_client IN ('true', '1', 't') THEN
    RETURN 'trainee';
  END IF;

  IF v_user_role IN ('coach', 'trainer', 'training_coach')
     AND (v_is_client IN ('false', '0', 'f') OR v_is_client = '') THEN
    RETURN 'coach';
  END IF;

  RETURN 'trainee';
END;
$$;

REVOKE ALL ON FUNCTION public.compute_profile_role(uuid) FROM PUBLIC;

COMMENT ON FUNCTION public.compute_profile_role(uuid) IS
  'Fitni role: client link → trainee; acquisition/app invite → trainee; explicit user_metadata.role coach|trainee; then is_client hints; safe default trainee.';

DROP FUNCTION IF EXISTS public.get_trainer_by_username(text);

CREATE FUNCTION public.get_trainer_by_username(p_username text)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  bio text,
  specialization text,
  logo_url text,
  brand_color text,
  welcome_message text,
  title text,
  social_links jsonb,
  gallery_images text[],
  username text,
  page_config jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.specialization,
    p.logo_url,
    p.brand_color,
    p.welcome_message,
    p.title,
    p.social_links,
    p.gallery_images,
    p.username,
    p.page_config
  FROM public.profiles p
  WHERE p.username = lower(p_username)
    AND p.username IS NOT NULL
    AND p.role = 'coach'
  LIMIT 1;
$$;
