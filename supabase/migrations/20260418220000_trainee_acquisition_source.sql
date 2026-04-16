-- Trainee acquisition: profiles.source (landing | invite), checkout sessions tied to auth user,
-- landing client row before Tap payment, payment_pending flag for access gating.

-- ---------------------------------------------------------------------------
-- 1) profiles.source
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS source text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_source_check' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_source_check
      CHECK (source IS NULL OR source IN ('landing', 'invite'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.profiles.source IS 'Trainee acquisition channel: landing (self-serve) or invite (coach). NULL for coaches/legacy.';

-- ---------------------------------------------------------------------------
-- 2) clients.payment_pending — true until first successful Tap package payment
-- ---------------------------------------------------------------------------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS payment_pending boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clients.payment_pending IS 'True until package payment verified (Tap); used for trainee access gating.';

-- ---------------------------------------------------------------------------
-- 3) Checkout session may reference a logged-in trainee (landing flow)
-- ---------------------------------------------------------------------------
ALTER TABLE public.package_checkout_sessions
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

CREATE INDEX IF NOT EXISTS package_checkout_sessions_auth_user_id_idx
  ON public.package_checkout_sessions (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4) compute_profile_role — explicit trainee for acquisition sources
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
  v_src text;
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

  v_user_role := lower(trim(COALESCE(v_user->>'role', '')));
  v_is_client := lower(trim(COALESCE(v_user->>'is_client', '')));

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

-- ---------------------------------------------------------------------------
-- 5) profiles_role_guard — force trainee for acquisition sources
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_role_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.source IS NOT NULL AND NEW.source IN ('landing', 'invite') THEN
      NEW.role := 'trainee';
    END IF;
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

-- ---------------------------------------------------------------------------
-- 6) ensure_user_profile — persist source from auth metadata
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
  v_source text;
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
    COALESCE(NULLIF(trim(raw_user_meta_data->>'full_name'), ''), ''),
    NULLIF(lower(trim(COALESCE(raw_user_meta_data->>'source', ''))), '')
  INTO v_name, v_source
  FROM auth.users
  WHERE id = v_uid;

  IF v_source IS NOT NULL AND v_source NOT IN ('landing', 'invite') THEN
    v_source := NULL;
  END IF;

  SELECT count(*)::int INTO v_count FROM public.profiles;
  v_is_founder := (v_count < 100);

  v_role := public.compute_profile_role(v_uid);

  INSERT INTO public.profiles (user_id, full_name, is_founder, role, source)
  VALUES (v_uid, COALESCE(v_name, ''), v_is_founder, v_role, v_source)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) handle_new_user
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
  v_source text;
BEGIN
  SELECT count(*) INTO v_trainer_count FROM public.profiles;
  v_is_founder := (v_trainer_count < 100);

  v_source := NULLIF(lower(trim(COALESCE(NEW.raw_user_meta_data->>'source', ''))), '');
  IF v_source IS NOT NULL AND v_source NOT IN ('landing', 'invite') THEN
    v_source := NULL;
  END IF;

  v_role := public.compute_profile_role(NEW.id);

  INSERT INTO public.profiles (user_id, full_name, is_founder, role, source)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), ''),
    v_is_founder,
    v_role,
    v_source
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) create_package_checkout_session — optional auth user (landing)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_package_checkout_session(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.create_package_checkout_session(
  p_package_id uuid,
  p_client_name text,
  p_client_phone text,
  p_client_email text DEFAULT NULL,
  p_auth_user_id uuid DEFAULT NULL
)
RETURNS TABLE(token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.package_checkout_sessions%ROWTYPE;
BEGIN
  IF p_package_id IS NULL THEN
    RAISE EXCEPTION 'Missing package id';
  END IF;

  IF p_client_name IS NULL OR length(trim(p_client_name)) < 2 THEN
    RAISE EXCEPTION 'Invalid client name';
  END IF;

  IF p_client_phone IS NULL OR length(trim(p_client_phone)) < 8 THEN
    RAISE EXCEPTION 'Invalid client phone';
  END IF;

  IF p_auth_user_id IS NOT NULL AND p_auth_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Invalid checkout user';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.trainer_packages tp
    WHERE tp.id = p_package_id
      AND tp.is_active = true
  ) THEN
    RAISE EXCEPTION 'Package not found';
  END IF;

  INSERT INTO public.package_checkout_sessions (package_id, client_name, client_phone, client_email, auth_user_id)
  VALUES (
    p_package_id,
    trim(p_client_name),
    trim(p_client_phone),
    NULLIF(trim(coalesce(p_client_email, '')), ''),
    p_auth_user_id
  )
  RETURNING * INTO v_row;

  RETURN QUERY SELECT v_row.token, v_row.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_package_checkout_session(uuid, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_package_checkout_session(uuid, text, text, text, uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9) create_landing_trainee_client_for_checkout — link trainee to coach before Tap
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_landing_trainee_client_for_checkout(
  p_trainer_id uuid,
  p_package_id uuid,
  p_full_name text,
  p_phone text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_email text;
  v_pkg public.trainer_packages%ROWTYPE;
  v_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = p_trainer_id AND p.role = 'coach'
  ) THEN
    RAISE EXCEPTION 'invalid trainer';
  END IF;

  SELECT * INTO v_pkg
  FROM public.trainer_packages
  WHERE id = p_package_id AND trainer_id = p_trainer_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid package';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = uid;
  IF v_email IS NULL OR length(trim(v_email)) < 3 THEN
    RAISE EXCEPTION 'missing email on account';
  END IF;

  SELECT c.id INTO v_id
  FROM public.clients c
  WHERE c.trainer_id = p_trainer_id AND c.auth_user_id = uid;

  IF v_id IS NOT NULL THEN
    UPDATE public.clients
    SET
      name = trim(p_full_name),
      phone = trim(p_phone),
      email = lower(trim(v_email)),
      goal = COALESCE(v_pkg.name, goal),
      subscription_price = v_pkg.price,
      billing_cycle = v_pkg.billing_cycle,
      payment_pending = true
    WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.clients (
    name, phone, email, trainer_id, auth_user_id,
    goal, subscription_price, billing_cycle, subscription_end_date, payment_pending
  )
  VALUES (
    trim(p_full_name),
    trim(p_phone),
    lower(trim(v_email)),
    p_trainer_id,
    uid,
    v_pkg.name,
    v_pkg.price,
    v_pkg.billing_cycle,
    '2000-01-01',
    true
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_landing_trainee_client_for_checkout(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_landing_trainee_client_for_checkout(uuid, uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 10) Invite token lookup — include trainer username for pay redirect
--     (DROP required: Postgres forbids CREATE OR REPLACE when OUT columns change.)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_client_by_invite_token(text);

CREATE FUNCTION public.get_client_by_invite_token(p_token text)
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  phone text,
  trainer_name text,
  trainer_username text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    c.id,
    c.name,
    c.email,
    c.phone,
    COALESCE(p.full_name, '') AS trainer_name,
    p.username AS trainer_username
  FROM public.clients c
  LEFT JOIN public.profiles p ON p.user_id = c.trainer_id
  WHERE c.invite_token = p_token AND c.auth_user_id IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_by_invite_token(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 11) Enforce trainee role for acquisition sources (belt + suspenders)
-- ---------------------------------------------------------------------------
UPDATE public.profiles p
SET role = 'trainee'
WHERE p.source IN ('landing', 'invite')
  AND p.role IS DISTINCT FROM 'trainee';

-- ---------------------------------------------------------------------------
-- 12) Public coach lookup by username — coaches only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_trainer_by_username(p_username text)
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
