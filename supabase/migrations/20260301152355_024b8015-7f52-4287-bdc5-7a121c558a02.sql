
-- Create body_scans table
CREATE TABLE public.body_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scan_date timestamptz NOT NULL DEFAULT now(),
  height numeric NOT NULL DEFAULT 0,
  weight numeric NOT NULL DEFAULT 0,
  age integer NOT NULL DEFAULT 0,
  gender text NOT NULL DEFAULT 'male',
  activity_level text NOT NULL DEFAULT 'sedentary',
  waist numeric,
  neck numeric,
  hip numeric,
  bmi numeric NOT NULL DEFAULT 0,
  body_fat numeric NOT NULL DEFAULT 0,
  muscle_mass numeric NOT NULL DEFAULT 0,
  bmr numeric NOT NULL DEFAULT 0,
  tdee numeric NOT NULL DEFAULT 0,
  ideal_weight_min numeric NOT NULL DEFAULT 0,
  ideal_weight_max numeric NOT NULL DEFAULT 0,
  is_manual_edit boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.body_scans ENABLE ROW LEVEL SECURITY;

-- Trainer can CRUD body scans for their own clients
CREATE POLICY "Trainers can read client body scans"
  ON public.body_scans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = body_scans.client_id AND c.trainer_id = auth.uid()));

CREATE POLICY "Trainers can insert client body scans"
  ON public.body_scans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clients c WHERE c.id = body_scans.client_id AND c.trainer_id = auth.uid()));

CREATE POLICY "Trainers can update client body scans"
  ON public.body_scans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = body_scans.client_id AND c.trainer_id = auth.uid()));

CREATE POLICY "Trainers can delete client body scans"
  ON public.body_scans FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = body_scans.client_id AND c.trainer_id = auth.uid()));

-- RPC for portal: get body scans by token
CREATE OR REPLACE FUNCTION public.get_portal_body_scans(p_token text)
RETURNS SETOF public.body_scans
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT bs.* FROM public.body_scans bs
  JOIN public.clients c ON c.id = bs.client_id
  WHERE c.portal_token = p_token AND c.portal_token IS NOT NULL
  ORDER BY bs.scan_date DESC;
$$;

-- RPC for portal: insert body scan by token
CREATE OR REPLACE FUNCTION public.insert_portal_body_scan(
  p_token text,
  p_height numeric, p_weight numeric, p_age integer, p_gender text,
  p_activity_level text,
  p_waist numeric DEFAULT NULL, p_neck numeric DEFAULT NULL, p_hip numeric DEFAULT NULL,
  p_bmi numeric DEFAULT 0, p_body_fat numeric DEFAULT 0, p_muscle_mass numeric DEFAULT 0,
  p_bmr numeric DEFAULT 0, p_tdee numeric DEFAULT 0,
  p_ideal_weight_min numeric DEFAULT 0, p_ideal_weight_max numeric DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
    ideal_weight_min, ideal_weight_max, notes
  ) VALUES (
    v_client_id, p_height, p_weight, p_age, p_gender, p_activity_level,
    p_waist, p_neck, p_hip, p_bmi, p_body_fat, p_muscle_mass, p_bmr, p_tdee,
    p_ideal_weight_min, p_ideal_weight_max, p_notes
  ) RETURNING id INTO v_scan_id;

  RETURN v_scan_id;
END;
$$;

-- Create meal_logs table for client meal tracking
CREATE TABLE public.meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  meal_item_id uuid NOT NULL REFERENCES public.meal_items(id) ON DELETE CASCADE,
  logged_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can read client meal logs"
  ON public.meal_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = meal_logs.client_id AND c.trainer_id = auth.uid()));

-- RPC for portal: get meal logs by token
CREATE OR REPLACE FUNCTION public.get_portal_meal_logs(p_token text, p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(meal_item_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT ml.meal_item_id FROM public.meal_logs ml
  JOIN public.clients c ON c.id = ml.client_id
  WHERE c.portal_token = p_token AND c.portal_token IS NOT NULL
    AND ml.logged_at = p_date;
$$;

-- RPC for portal: toggle meal log
CREATE OR REPLACE FUNCTION public.toggle_portal_meal_log(p_token text, p_meal_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_exists boolean;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL LIMIT 1;
  
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Invalid portal token';
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
