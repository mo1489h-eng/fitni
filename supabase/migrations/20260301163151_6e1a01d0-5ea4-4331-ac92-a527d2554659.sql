
ALTER TABLE public.body_scans 
  ADD COLUMN IF NOT EXISTS water_percentage numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS visceral_fat numeric DEFAULT NULL;

-- Update the insert_portal_body_scan function to accept new fields
CREATE OR REPLACE FUNCTION public.insert_portal_body_scan(
  p_token text, p_height numeric, p_weight numeric, p_age integer, 
  p_gender text, p_activity_level text,
  p_waist numeric DEFAULT NULL, p_neck numeric DEFAULT NULL, p_hip numeric DEFAULT NULL,
  p_bmi numeric DEFAULT 0, p_body_fat numeric DEFAULT 0, p_muscle_mass numeric DEFAULT 0,
  p_bmr numeric DEFAULT 0, p_tdee numeric DEFAULT 0,
  p_ideal_weight_min numeric DEFAULT 0, p_ideal_weight_max numeric DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_water_percentage numeric DEFAULT NULL,
  p_visceral_fat numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_scan_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL LIMIT 1;
  
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Invalid portal token';
  END IF;

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
