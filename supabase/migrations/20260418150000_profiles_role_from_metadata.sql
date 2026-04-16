-- Role is driven by auth user_metadata at signup + clients link; profiles.role is the single app source of truth.
-- Self-heal RPC + one-time data fix for users linked as clients.

CREATE OR REPLACE FUNCTION public.repair_profile_role_from_metadata()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_meta text;
  v_is_client text;
  v_role text;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    COALESCE(NULLIF(trim(raw_user_meta_data->>'role'), ''), ''),
    COALESCE(raw_user_meta_data->>'is_client', '')
  INTO v_meta, v_is_client
  FROM auth.users
  WHERE id = uid;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_meta IN ('trainee', 'client', 'student') OR lower(v_is_client) IN ('true', '1', 't') THEN
    v_role := 'trainee';
  ELSIF v_meta IN ('coach', 'trainer', 'training_coach') OR lower(v_is_client) IN ('false', '0', 'f') THEN
    v_role := 'coach';
  ELSIF EXISTS (SELECT 1 FROM public.clients c WHERE c.auth_user_id = uid) THEN
    v_role := 'trainee';
  ELSE
    v_role := NULL;
  END IF;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET role = v_role
  WHERE user_id = uid;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.repair_profile_role_from_metadata() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repair_profile_role_from_metadata() TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_name text;
  v_count int;
  v_is_founder boolean;
  v_meta text;
  v_is_client text;
  v_role text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_uid) THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(NULLIF(trim(raw_user_meta_data->>'full_name'), ''), ''),
    COALESCE(NULLIF(trim(raw_user_meta_data->>'role'), ''), ''),
    COALESCE(raw_user_meta_data->>'is_client', '')
  INTO v_name, v_meta, v_is_client
  FROM auth.users
  WHERE id = v_uid;

  SELECT count(*)::int INTO v_count FROM public.profiles;
  v_is_founder := (v_count < 100);

  IF v_meta IN ('trainee', 'client', 'student') OR lower(v_is_client) IN ('true', '1', 't') THEN
    v_role := 'trainee';
  ELSIF v_meta IN ('coach', 'trainer', 'training_coach') OR lower(v_is_client) IN ('false', '0', 'f') THEN
    v_role := 'coach';
  ELSIF EXISTS (SELECT 1 FROM public.clients c WHERE c.auth_user_id = v_uid) THEN
    v_role := 'trainee';
  ELSE
    v_role := 'coach';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, is_founder, role)
  VALUES (v_uid, COALESCE(v_name, ''), v_is_founder, v_role)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_trainer_count integer;
  v_is_founder boolean;
  v_meta text;
  v_is_client text;
  v_role text;
BEGIN
  SELECT count(*) INTO v_trainer_count FROM public.profiles;
  v_is_founder := (v_trainer_count < 100);

  v_meta := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'role'), ''), '');
  v_is_client := COALESCE(NEW.raw_user_meta_data->>'is_client', '');

  IF v_meta IN ('trainee', 'client', 'student') OR lower(v_is_client) IN ('true', '1', 't') THEN
    v_role := 'trainee';
  ELSIF v_meta IN ('coach', 'trainer', 'training_coach') OR lower(v_is_client) IN ('false', '0', 'f') THEN
    v_role := 'coach';
  ELSE
    v_role := 'coach';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, is_founder, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), ''),
    v_is_founder,
    v_role
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- One-time: anyone linked as a client must be trainee
UPDATE public.profiles p
SET role = 'trainee'
FROM public.clients c
WHERE c.auth_user_id = p.user_id
  AND p.role IS DISTINCT FROM 'trainee';
