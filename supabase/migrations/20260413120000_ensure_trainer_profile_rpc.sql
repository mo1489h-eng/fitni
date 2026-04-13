-- Idempotent trainer profile row: callable by authenticated users if the auth trigger missed a row.
CREATE OR REPLACE FUNCTION public.ensure_trainer_profile()
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

  SELECT COALESCE(raw_user_meta_data->>'full_name', '') INTO v_name
  FROM auth.users
  WHERE id = v_uid;

  SELECT count(*)::int INTO v_count FROM public.profiles;
  v_is_founder := (v_count < 100);

  INSERT INTO public.profiles (user_id, full_name, is_founder)
  VALUES (v_uid, COALESCE(v_name, ''), v_is_founder)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_trainer_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_trainer_profile() TO authenticated;

-- Avoid failing auth.users insert if a profile row already exists (race / retry).
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

  INSERT INTO public.profiles (user_id, full_name, is_founder)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), v_is_founder)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
