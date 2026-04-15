-- Resilience: default role = coach; trainee only via client-link trigger (no auth metadata for role).

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
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_uid) THEN
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(trim(raw_user_meta_data->>'full_name'), ''), '') INTO v_name
  FROM auth.users
  WHERE id = v_uid;

  SELECT count(*)::int INTO v_count FROM public.profiles;
  v_is_founder := (v_count < 100);

  INSERT INTO public.profiles (user_id, full_name, is_founder, role)
  VALUES (v_uid, COALESCE(v_name, ''), v_is_founder, 'coach')
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_trainer_count integer;
  v_is_founder boolean;
BEGIN
  SELECT count(*) INTO v_trainer_count FROM public.profiles;
  v_is_founder := (v_trainer_count < 100);

  INSERT INTO public.profiles (user_id, full_name, is_founder, role)
  VALUES (NEW.id, COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), ''), v_is_founder, 'coach')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- When clients.auth_user_id is set: prefer trainee, but never downgrade a coach who already trains other clients (other rows).
CREATE OR REPLACE FUNCTION public.sync_profile_role_on_client_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_founder boolean;
  v_name text;
BEGIN
  IF NEW.auth_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles p
  SET role = 'trainee'
  WHERE p.user_id = NEW.auth_user_id
    AND p.role IS DISTINCT FROM 'trainee'
    AND NOT EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.trainer_id = p.user_id
        AND c.id IS DISTINCT FROM NEW.id
    );

  IF FOUND THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.auth_user_id) THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::int INTO v_count FROM public.profiles;
  v_founder := (v_count < 100);

  SELECT COALESCE(NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1), '') INTO v_name
  FROM auth.users u
  WHERE u.id = NEW.auth_user_id;

  INSERT INTO public.profiles (user_id, full_name, is_founder, role)
  VALUES (NEW.auth_user_id, COALESCE(v_name, ''), v_founder, 'trainee')
  ON CONFLICT (user_id) DO UPDATE SET
    role = CASE
      WHEN EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.trainer_id = public.profiles.user_id
          AND c.id IS DISTINCT FROM NEW.id
      )
      THEN public.profiles.role
      ELSE 'trainee'
    END;

  RETURN NEW;
END;
$$;
