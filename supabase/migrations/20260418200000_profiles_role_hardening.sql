-- CoachBase: deterministic server-side profile roles; no blind metadata trust; no default coach.
-- - compute_profile_role(): single source of role rules (clients + app_metadata + signup hints)
-- - profiles_role_guard: force trainee when linked in clients; block trainee→coach unless compute or admin/service
-- - clients: sync profile to trainee when auth_user_id is set
-- - repair_all_roles(): idempotent heal (run anytime; uses compute + client link)

-- ---------------------------------------------------------------------------
-- 1) Role default: never implicit coach on insert
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'trainee';

-- ---------------------------------------------------------------------------
-- 2) Core rule function (SECURITY DEFINER reads auth.users)
-- ---------------------------------------------------------------------------
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

  -- Server-only app_metadata (invite edge, future admin flows)
  IF COALESCE(v_app->>'fitni_signup', '') = 'invite' THEN
    RETURN 'trainee';
  END IF;

  IF COALESCE(v_app->>'fitni_role', '') IN ('trainee', 'client', 'student') THEN
    RETURN 'trainee';
  END IF;

  IF COALESCE(v_app->>'fitni_role', '') IN ('coach', 'trainer', 'training_coach') THEN
    RETURN 'coach';
  END IF;

  v_user_role := lower(trim(COALESCE(v_user->>'role', '')));
  v_is_client := lower(trim(COALESCE(v_user->>'is_client', '')));

  IF v_user_role IN ('trainee', 'client', 'student') OR v_is_client IN ('true', '1', 't') THEN
    RETURN 'trainee';
  END IF;

  IF v_user_role IN ('coach', 'trainer', 'training_coach')
     AND (v_is_client IN ('false', '0', 'f') OR v_is_client = '') THEN
    RETURN 'coach';
  END IF;

  -- Ambiguous or hostile metadata: safe default (never coach)
  RETURN 'trainee';
END;
$$;

REVOKE ALL ON FUNCTION public.compute_profile_role(uuid) FROM PUBLIC;

COMMENT ON FUNCTION public.compute_profile_role(uuid) IS
  'Deterministic Fitni role from clients row + app_metadata (trusted) + user signup hints; never defaults to coach.';

-- ---------------------------------------------------------------------------
-- 3) Escalation bypass (service role / migrations / explicit admin session)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_trainee_to_coach_escalation_allowed()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
  req_role text;
BEGIN
  IF COALESCE(current_setting('app.allow_trainee_to_coach', true), '') = 'on' THEN
    RETURN true;
  END IF;

  BEGIN
    jwt_role := (SELECT auth.jwt())->>'role';
  EXCEPTION
    WHEN OTHERS THEN
      jwt_role := NULL;
  END;

  IF jwt_role = 'service_role' THEN
    RETURN true;
  END IF;

  BEGIN
    req_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION
    WHEN OTHERS THEN
      req_role := NULL;
  END;

  IF req_role = 'service_role' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.is_trainee_to_coach_escalation_allowed() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 4) BEFORE INSERT OR UPDATE: client link wins; block bad trainee→coach
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_role_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF EXISTS (SELECT 1 FROM public.clients c WHERE c.auth_user_id = NEW.user_id) THEN
      NEW.role := 'trainee';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'trainee' AND NEW.role = 'coach' THEN
      IF public.compute_profile_role(NEW.user_id) <> 'coach' THEN
        IF NOT public.is_trainee_to_coach_escalation_allowed() THEN
          RAISE EXCEPTION 'role_escalation_forbidden'
            USING HINT = 'Trainee cannot become coach unless server rules or admin/service allow it';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_role_guard ON public.profiles;
CREATE TRIGGER profiles_role_guard
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_role_guard();

REVOKE ALL ON FUNCTION public.profiles_role_guard() FROM PUBLIC;

-- Client→profile sync remains: public.sync_profile_role_on_client_link (20260416120500_auth_role_single_source.sql).

-- ---------------------------------------------------------------------------
-- 5) ensure_user_profile: insert only; role from compute_profile_role only
-- ---------------------------------------------------------------------------
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

  SELECT
    COALESCE(NULLIF(trim(raw_user_meta_data->>'full_name'), ''), '')
  INTO v_name
  FROM auth.users
  WHERE id = v_uid;

  SELECT count(*)::int INTO v_count FROM public.profiles;
  v_is_founder := (v_count < 100);

  v_role := public.compute_profile_role(v_uid);

  INSERT INTO public.profiles (user_id, full_name, is_founder, role)
  VALUES (v_uid, COALESCE(v_name, ''), v_is_founder, v_role)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) handle_new_user: same rules (trigger on auth.users insert)
-- ---------------------------------------------------------------------------
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

  v_role := public.compute_profile_role(NEW.id);

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

-- ---------------------------------------------------------------------------
-- 7) repair_profile_role_from_metadata → server-only compute (name kept for RPC compatibility)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_profile_role_from_metadata()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_role text;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  v_role := public.compute_profile_role(uid);

  UPDATE public.profiles
  SET role = v_role
  WHERE user_id = uid;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.repair_profile_role_from_metadata() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repair_profile_role_from_metadata() TO authenticated;

-- ---------------------------------------------------------------------------
-- 8) repair_all_roles — idempotent; uses client link + compute (preserves landing trainees)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_all_roles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  WITH computed AS (
    SELECT
      p.user_id,
      CASE
        WHEN EXISTS (SELECT 1 FROM public.clients c WHERE c.auth_user_id = p.user_id) THEN 'trainee'
        ELSE public.compute_profile_role(p.user_id)
      END AS new_role
    FROM public.profiles p
  )
  UPDATE public.profiles p
  SET role = c.new_role
  FROM computed c
  WHERE p.user_id = c.user_id
    AND p.role IS DISTINCT FROM c.new_role;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.repair_all_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repair_all_roles() TO service_role;

COMMENT ON FUNCTION public.repair_all_roles() IS
  'Recompute profiles.role from clients + auth metadata rules. Safe to run repeatedly. Prefer SQL editor or service role.';

-- One-time heal existing rows
SELECT public.repair_all_roles();
