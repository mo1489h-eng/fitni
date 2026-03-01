
-- 1. Add input validation to insert_portal_body_scan
CREATE OR REPLACE FUNCTION public.insert_portal_body_scan(
  p_token text, p_height numeric, p_weight numeric, p_age integer, p_gender text, p_activity_level text,
  p_waist numeric DEFAULT NULL, p_neck numeric DEFAULT NULL, p_hip numeric DEFAULT NULL,
  p_bmi numeric DEFAULT 0, p_body_fat numeric DEFAULT 0, p_muscle_mass numeric DEFAULT 0,
  p_bmr numeric DEFAULT 0, p_tdee numeric DEFAULT 0, p_ideal_weight_min numeric DEFAULT 0,
  p_ideal_weight_max numeric DEFAULT 0, p_notes text DEFAULT NULL,
  p_water_percentage numeric DEFAULT NULL, p_visceral_fat numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_scan_id uuid;
BEGIN
  -- Validate inputs
  IF p_height < 50 OR p_height > 300 THEN RAISE EXCEPTION 'Invalid height value'; END IF;
  IF p_weight < 20 OR p_weight > 500 THEN RAISE EXCEPTION 'Invalid weight value'; END IF;
  IF p_age < 1 OR p_age > 150 THEN RAISE EXCEPTION 'Invalid age value'; END IF;
  IF p_gender NOT IN ('male', 'female') THEN RAISE EXCEPTION 'Invalid gender value'; END IF;
  IF p_activity_level NOT IN ('sedentary', 'light', 'moderate', 'active', 'very_active') THEN RAISE EXCEPTION 'Invalid activity level'; END IF;
  IF p_notes IS NOT NULL AND LENGTH(p_notes) > 1000 THEN RAISE EXCEPTION 'Notes too long'; END IF;

  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL LIMIT 1;
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
$$;

-- 2. Add input validation to log_portal_mood
CREATE OR REPLACE FUNCTION public.log_portal_mood(p_token text, p_mood text, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_mood_id uuid;
BEGIN
  IF p_mood NOT IN ('great', 'good', 'okay', 'bad', 'terrible') THEN RAISE EXCEPTION 'Invalid mood value'; END IF;
  IF p_note IS NOT NULL AND LENGTH(p_note) > 500 THEN RAISE EXCEPTION 'Note too long'; END IF;

  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL LIMIT 1;
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Invalid portal token'; END IF;

  INSERT INTO public.client_moods (client_id, mood, note, mood_date)
  VALUES (v_client_id, p_mood, p_note, CURRENT_DATE)
  ON CONFLICT (client_id, mood_date) DO UPDATE SET mood = EXCLUDED.mood, note = EXCLUDED.note
  RETURNING id INTO v_mood_id;

  UPDATE public.clients SET last_active_at = now() WHERE id = v_client_id;
  RETURN v_mood_id;
END;
$$;

-- 3. Add meal item ownership validation to toggle_portal_meal_log
CREATE OR REPLACE FUNCTION public.toggle_portal_meal_log(p_token text, p_meal_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_exists boolean;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL LIMIT 1;
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Invalid portal token'; END IF;

  -- Validate meal item belongs to client's meal plan
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
$$;

-- 4. Remove overly permissive anonymous storage policies
DROP POLICY IF EXISTS "Portal upload progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Portal read progress photos" ON storage.objects;

-- 5. Add authenticated-only storage policies for portal folder
CREATE POLICY "Authenticated upload progress photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'progress-photos');

CREATE POLICY "Authenticated read progress photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'progress-photos');

-- 6. Deny anonymous access to clients and body_scans
CREATE POLICY "Anonymous deny clients" ON public.clients FOR ALL TO anon USING (false);
CREATE POLICY "Anonymous deny body_scans" ON public.body_scans FOR ALL TO anon USING (false);
