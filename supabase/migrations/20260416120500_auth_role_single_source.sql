-- Single source of truth: public.profiles.role ('coach' | 'trainee'). No client-table inference.

-- 1) Idempotent profile row with role from auth.users metadata (is_client → trainee, else coach).
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
  v_role text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_uid) THEN
    RETURN;
  END IF;

  SELECT COALESCE(raw_user_meta_data->>'full_name', '') INTO v_name
  FROM auth.users
  WHERE id = v_uid;

  IF COALESCE(
    (SELECT raw_user_meta_data->>'is_client' FROM auth.users WHERE id = v_uid),
    ''
  ) IN ('true', '1') THEN
    v_role := 'trainee';
  ELSE
    v_role := 'coach';
  END IF;

  SELECT count(*)::int INTO v_count FROM public.profiles;
  v_is_founder := (v_count < 100);

  INSERT INTO public.profiles (user_id, full_name, is_founder, role)
  VALUES (v_uid, COALESCE(v_name, ''), v_is_founder, v_role)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

-- 2) Backwards-compatible alias (existing app + Edge code).
CREATE OR REPLACE FUNCTION public.ensure_trainer_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_user_profile();
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_trainer_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_trainer_profile() TO authenticated;

-- 3) New auth user: explicit role from metadata (trainer signup vs client-account creation).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_trainer_count integer;
  v_is_founder boolean;
  v_role text;
BEGIN
  SELECT count(*) INTO v_trainer_count FROM public.profiles;
  v_is_founder := (v_trainer_count < 100);

  IF COALESCE(NEW.raw_user_meta_data->>'is_client', '') IN ('true', '1') THEN
    v_role := 'trainee';
  ELSE
    v_role := 'coach';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, is_founder, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), v_is_founder, v_role)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 4) When a client row is linked to an auth user, force profile.role = trainee (DB truth).
CREATE OR REPLACE FUNCTION public.sync_profile_role_on_client_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_founder boolean;
BEGIN
  IF NEW.auth_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET role = 'trainee'
  WHERE user_id = NEW.auth_user_id;

  IF NOT FOUND THEN
    SELECT count(*)::int INTO v_count FROM public.profiles;
    v_founder := (v_count < 100);

    INSERT INTO public.profiles (user_id, full_name, is_founder, role)
    SELECT
      NEW.auth_user_id,
      COALESCE(u.raw_user_meta_data->>'full_name', ''),
      v_founder,
      'trainee'::text
    FROM auth.users u
    WHERE u.id = NEW.auth_user_id
    ON CONFLICT (user_id) DO UPDATE SET role = 'trainee';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_role_on_client_link ON public.clients;
CREATE TRIGGER trg_sync_profile_role_on_client_link
  AFTER INSERT OR UPDATE OF auth_user_id ON public.clients
  FOR EACH ROW
  WHEN (NEW.auth_user_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_profile_role_on_client_link();
