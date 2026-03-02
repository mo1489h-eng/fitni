
-- ============================================
-- FIX 1: Trainer posts - restrict anon to public posts only
-- ============================================

-- Drop the overly permissive anon policy
DROP POLICY IF EXISTS "Public can read trainer posts" ON public.trainer_posts;

-- Anon can only read posts with audience = 'all'
CREATE POLICY "Public can read public trainer posts"
ON public.trainer_posts FOR SELECT TO anon
USING (audience = 'all');

-- Authenticated clients can read posts targeted to them
CREATE POLICY "Clients can read targeted posts"
ON public.trainer_posts FOR SELECT TO authenticated
USING (
  audience = 'all' OR
  (audience = 'clients' AND EXISTS (
    SELECT 1 FROM clients c
    WHERE c.trainer_id = trainer_posts.trainer_id
    AND c.auth_user_id = auth.uid()
  )) OR
  (audience = 'specific' AND EXISTS (
    SELECT 1 FROM clients c
    WHERE c.trainer_id = trainer_posts.trainer_id
    AND c.auth_user_id = auth.uid()
    AND c.id = ANY(trainer_posts.audience_client_ids)
  ))
);

-- ============================================
-- FIX 2: Drop stale portal meal plan/items policies
-- ============================================
DROP POLICY IF EXISTS "Portal can read assigned meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Portal can read meal items" ON public.meal_items;

-- ============================================
-- FIX 3: Add portal token expiration
-- ============================================
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_token_expires_at timestamptz DEFAULT (now() + interval '90 days');

-- Update existing clients to have expiration 90 days from now
UPDATE public.clients SET portal_token_expires_at = now() + interval '90 days' WHERE portal_token IS NOT NULL AND portal_token_expires_at IS NULL;

-- Update generate_portal_token trigger to set expiration
CREATE OR REPLACE FUNCTION public.generate_portal_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.portal_token IS NULL THEN
    NEW.portal_token := encode(extensions.gen_random_bytes(12), 'hex');
  END IF;
  IF NEW.portal_token IS NOT NULL AND NEW.portal_token_expires_at IS NULL THEN
    NEW.portal_token_expires_at := now() + interval '90 days';
  END IF;
  RETURN NEW;
END;
$function$;

-- Update get_client_by_portal_token to check expiration
CREATE OR REPLACE FUNCTION public.get_client_by_portal_token(p_token text)
RETURNS SETOF clients
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT * FROM public.clients
  WHERE portal_token = p_token
    AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
$function$;

-- Update all other portal RPCs to check expiration
CREATE OR REPLACE FUNCTION public.get_portal_body_scans(p_token text)
RETURNS SETOF body_scans
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT bs.* FROM public.body_scans bs
  JOIN public.clients c ON c.id = bs.client_id
  WHERE c.portal_token = p_token AND c.portal_token IS NOT NULL
    AND (c.portal_token_expires_at IS NULL OR c.portal_token_expires_at > now())
  ORDER BY bs.scan_date DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_portal_progress_photos(p_token text)
RETURNS SETOF progress_photos
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT pp.*
  FROM public.progress_photos pp
  JOIN public.clients c ON c.id = pp.client_id
  WHERE c.portal_token = p_token
    AND c.portal_token IS NOT NULL
    AND (c.portal_token_expires_at IS NULL OR c.portal_token_expires_at > now())
  ORDER BY pp.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_portal_meal_plans(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(plan_data), '[]'::jsonb) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', mp.id,
      'name', mp.name,
      'notes', mp.notes,
      'items', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', mi.id,
            'meal_name', mi.meal_name,
            'food_name', mi.food_name,
            'calories', mi.calories,
            'protein', mi.protein,
            'carbs', mi.carbs,
            'fats', mi.fats,
            'quantity', mi.quantity,
            'item_order', mi.item_order
          ) ORDER BY mi.item_order
        )
        FROM public.meal_items mi
        WHERE mi.meal_plan_id = mp.id
      ), '[]'::jsonb)
    ) AS plan_data
    FROM public.meal_plans mp
    WHERE mp.client_id = v_client_id
    ORDER BY mp.created_at DESC
  ) sub;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_portal_meal_logs(p_token text, p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(meal_item_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT ml.meal_item_id FROM public.meal_logs ml
  JOIN public.clients c ON c.id = ml.client_id
  WHERE c.portal_token = p_token AND c.portal_token IS NOT NULL
    AND (c.portal_token_expires_at IS NULL OR c.portal_token_expires_at > now())
    AND ml.logged_at = p_date;
$function$;

CREATE OR REPLACE FUNCTION public.update_portal_activity(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.clients SET last_active_at = now()
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now());
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_portal_privacy(p_token text, p_privacy_weight boolean, p_privacy_photos boolean, p_privacy_scans boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Invalid portal token'; END IF;

  UPDATE public.clients SET
    privacy_weight = p_privacy_weight,
    privacy_photos = p_privacy_photos,
    privacy_scans = p_privacy_scans
  WHERE id = v_client_id;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_portal_mood(p_token text, p_mood text, p_note text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid;
  v_mood_id uuid;
BEGIN
  IF p_mood NOT IN ('great', 'good', 'okay', 'bad', 'terrible') THEN RAISE EXCEPTION 'Invalid mood value'; END IF;
  IF p_note IS NOT NULL AND LENGTH(p_note) > 500 THEN RAISE EXCEPTION 'Note too long'; END IF;

  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Invalid portal token'; END IF;

  INSERT INTO public.client_moods (client_id, mood, note, mood_date)
  VALUES (v_client_id, p_mood, p_note, CURRENT_DATE)
  ON CONFLICT (client_id, mood_date) DO UPDATE SET mood = EXCLUDED.mood, note = EXCLUDED.note
  RETURNING id INTO v_mood_id;

  UPDATE public.clients SET last_active_at = now() WHERE id = v_client_id;
  RETURN v_mood_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_portal_meal_log(p_token text, p_meal_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid;
  v_exists boolean;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Invalid portal token'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.meal_items mi
    JOIN public.meal_plans mp ON mp.id = mi.meal_plan_id
    WHERE mi.id = p_meal_item_id AND mp.client_id = v_client_id
  ) THEN
    RAISE EXCEPTION 'Meal item not found or access denied';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.meal_logs
    WHERE client_id = v_client_id AND meal_item_id = p_meal_item_id AND logged_at = CURRENT_DATE
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.meal_logs
    WHERE client_id = v_client_id AND meal_item_id = p_meal_item_id AND logged_at = CURRENT_DATE;
    RETURN false;
  ELSE
    INSERT INTO public.meal_logs (client_id, meal_item_id) VALUES (v_client_id, p_meal_item_id);
    RETURN true;
  END IF;
END;
$function$;

-- Update both insert_portal_body_scan overloads
CREATE OR REPLACE FUNCTION public.insert_portal_body_scan(p_token text, p_height numeric, p_weight numeric, p_age integer, p_gender text, p_activity_level text, p_waist numeric DEFAULT NULL::numeric, p_neck numeric DEFAULT NULL::numeric, p_hip numeric DEFAULT NULL::numeric, p_bmi numeric DEFAULT 0, p_body_fat numeric DEFAULT 0, p_muscle_mass numeric DEFAULT 0, p_bmr numeric DEFAULT 0, p_tdee numeric DEFAULT 0, p_ideal_weight_min numeric DEFAULT 0, p_ideal_weight_max numeric DEFAULT 0, p_notes text DEFAULT NULL::text, p_water_percentage numeric DEFAULT NULL::numeric, p_visceral_fat numeric DEFAULT NULL::numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid;
  v_scan_id uuid;
BEGIN
  IF p_height < 50 OR p_height > 300 THEN RAISE EXCEPTION 'Invalid height value'; END IF;
  IF p_weight < 20 OR p_weight > 500 THEN RAISE EXCEPTION 'Invalid weight value'; END IF;
  IF p_age < 1 OR p_age > 150 THEN RAISE EXCEPTION 'Invalid age value'; END IF;
  IF p_gender NOT IN ('male', 'female') THEN RAISE EXCEPTION 'Invalid gender value'; END IF;
  IF p_activity_level NOT IN ('sedentary', 'light', 'moderate', 'active', 'very_active') THEN RAISE EXCEPTION 'Invalid activity level'; END IF;
  IF p_notes IS NOT NULL AND LENGTH(p_notes) > 1000 THEN RAISE EXCEPTION 'Notes too long'; END IF;

  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Invalid portal token'; END IF;

  INSERT INTO public.body_scans (
    client_id, height, weight, age, gender, activity_level,
    waist, neck, hip, bmi, body_fat, muscle_mass, bmr, tdee,
    ideal_weight_min, ideal_weight_max, notes, water_percentage, visceral_fat
  ) VALUES (
    v_client_id, p_height, p_weight, p_age, p_gender, p_activity_level,
    p_waist, p_neck, p_hip, p_bmi, p_body_fat, p_muscle_mass, p_bmr, p_tdee,
    p_ideal_weight_min, p_ideal_weight_max, p_notes, p_water_percentage, p_visceral_fat
  ) RETURNING id INTO v_scan_id;

  RETURN v_scan_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.insert_portal_progress_photo(p_token text, p_photo_type text, p_photo_url text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client record;
  v_photo_id uuid;
BEGIN
  SELECT id, trainer_id INTO v_client
  FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;

  IF v_client.id IS NULL THEN
    RAISE EXCEPTION 'Invalid portal token';
  END IF;

  INSERT INTO public.progress_photos (client_id, trainer_id, photo_type, photo_url, uploaded_by)
  VALUES (v_client.id, v_client.trainer_id, p_photo_type, p_photo_url, 'client')
  RETURNING id INTO v_photo_id;

  RETURN v_photo_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_portal_access(p_client_id uuid, p_token text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = p_client_id
      AND portal_token = p_token
      AND portal_token IS NOT NULL
      AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  );
$function$;
