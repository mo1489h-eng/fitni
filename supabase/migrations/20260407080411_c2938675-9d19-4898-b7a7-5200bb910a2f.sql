
-- 1. Food Database table
CREATE TABLE public.food_database (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL DEFAULT '',
  calories_per_100g NUMERIC NOT NULL DEFAULT 0,
  protein_per_100g NUMERIC NOT NULL DEFAULT 0,
  carbs_per_100g NUMERIC NOT NULL DEFAULT 0,
  fat_per_100g NUMERIC NOT NULL DEFAULT 0,
  fiber_per_100g NUMERIC NOT NULL DEFAULT 0,
  serving_size_default NUMERIC NOT NULL DEFAULT 100,
  serving_unit TEXT NOT NULL DEFAULT 'جرام',
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'عام',
  barcode TEXT,
  source TEXT NOT NULL DEFAULT 'local',
  verified BOOLEAN NOT NULL DEFAULT true,
  trainer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. New meal_logs table for actual food logging
CREATE TABLE public.nutrition_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trainer_id UUID,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL DEFAULT 'غداء',
  food_id UUID REFERENCES public.food_database(id) ON DELETE SET NULL,
  food_name_ar TEXT NOT NULL,
  food_name_en TEXT NOT NULL DEFAULT '',
  quantity_grams NUMERIC NOT NULL DEFAULT 100,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  fiber NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Nutrition targets table
CREATE TABLE public.nutrition_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  calories_target NUMERIC NOT NULL DEFAULT 2000,
  protein_target NUMERIC NOT NULL DEFAULT 150,
  carbs_target NUMERIC NOT NULL DEFAULT 200,
  fat_target NUMERIC NOT NULL DEFAULT 65,
  set_by_trainer BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.food_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_targets ENABLE ROW LEVEL SECURITY;

-- Food database: anyone authenticated can read, trainers can insert custom
CREATE POLICY "Anyone can read foods" ON public.food_database FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can insert custom foods" ON public.food_database FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid());

-- Nutrition logs: trainers can manage their clients' logs
CREATE POLICY "Trainers can read client logs" ON public.nutrition_logs FOR SELECT TO authenticated 
  USING (trainer_id = auth.uid() OR client_id IN (SELECT id FROM public.clients WHERE trainer_id = auth.uid()));
CREATE POLICY "Trainers can insert logs" ON public.nutrition_logs FOR INSERT TO authenticated 
  WITH CHECK (trainer_id = auth.uid() OR client_id IN (SELECT id FROM public.clients WHERE trainer_id = auth.uid()));
CREATE POLICY "Trainers can delete logs" ON public.nutrition_logs FOR DELETE TO authenticated 
  USING (trainer_id = auth.uid() OR client_id IN (SELECT id FROM public.clients WHERE trainer_id = auth.uid()));

-- Nutrition targets: trainers manage their clients' targets
CREATE POLICY "Trainers can read targets" ON public.nutrition_targets FOR SELECT TO authenticated 
  USING (client_id IN (SELECT id FROM public.clients WHERE trainer_id = auth.uid()));
CREATE POLICY "Trainers can insert targets" ON public.nutrition_targets FOR INSERT TO authenticated 
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE trainer_id = auth.uid()));
CREATE POLICY "Trainers can update targets" ON public.nutrition_targets FOR UPDATE TO authenticated 
  USING (client_id IN (SELECT id FROM public.clients WHERE trainer_id = auth.uid()));

-- Allow anonymous read for food_database (portal access)
CREATE POLICY "Public can read foods" ON public.food_database FOR SELECT TO anon USING (true);

-- Indexes for performance
CREATE INDEX idx_nutrition_logs_client_date ON public.nutrition_logs(client_id, logged_date);
CREATE INDEX idx_nutrition_logs_trainer ON public.nutrition_logs(trainer_id);
CREATE INDEX idx_food_database_name ON public.food_database(name_ar);
CREATE INDEX idx_food_database_category ON public.food_database(category);

-- Portal RPC: get nutrition logs for a client
CREATE OR REPLACE FUNCTION public.get_portal_nutrition_logs(p_token TEXT, p_date DATE DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
  IF v_client_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(l) ORDER BY l.created_at), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT id, meal_type, food_name_ar, food_name_en, quantity_grams,
           calories, protein, carbs, fat, fiber, food_id, is_custom, notes, created_at
    FROM public.nutrition_logs
    WHERE client_id = v_client_id AND logged_date = p_date
    ORDER BY created_at
  ) l;
  RETURN v_result;
END;
$$;

-- Portal RPC: log food for client
CREATE OR REPLACE FUNCTION public.portal_log_food(
  p_token TEXT, p_meal_type TEXT, p_food_name_ar TEXT, p_food_name_en TEXT DEFAULT '',
  p_quantity_grams NUMERIC DEFAULT 100, p_calories NUMERIC DEFAULT 0,
  p_protein NUMERIC DEFAULT 0, p_carbs NUMERIC DEFAULT 0, p_fat NUMERIC DEFAULT 0,
  p_fiber NUMERIC DEFAULT 0, p_food_id UUID DEFAULT NULL, p_is_custom BOOLEAN DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_client record;
  v_log_id uuid;
BEGIN
  IF p_meal_type NOT IN ('فطور', 'غداء', 'عشاء', 'سناك') THEN RAISE EXCEPTION 'Invalid meal type'; END IF;
  IF p_food_name_ar IS NULL OR LENGTH(TRIM(p_food_name_ar)) < 1 THEN RAISE EXCEPTION 'Food name required'; END IF;
  IF p_quantity_grams <= 0 OR p_quantity_grams > 5000 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

  SELECT id, trainer_id INTO v_client FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
  IF v_client.id IS NULL THEN RAISE EXCEPTION 'Invalid portal token'; END IF;

  INSERT INTO public.nutrition_logs (
    client_id, trainer_id, meal_type, food_name_ar, food_name_en,
    quantity_grams, calories, protein, carbs, fat, fiber, food_id, is_custom
  ) VALUES (
    v_client.id, v_client.trainer_id, p_meal_type, TRIM(p_food_name_ar), COALESCE(p_food_name_en, ''),
    p_quantity_grams, p_calories, p_protein, p_carbs, p_fat, p_fiber, p_food_id, p_is_custom
  ) RETURNING id INTO v_log_id;

  UPDATE public.clients SET last_active_at = now() WHERE id = v_client.id;
  RETURN v_log_id;
END;
$$;

-- Portal RPC: delete a food log
CREATE OR REPLACE FUNCTION public.portal_delete_food_log(p_token TEXT, p_log_id UUID)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Invalid portal token'; END IF;

  DELETE FROM public.nutrition_logs WHERE id = p_log_id AND client_id = v_client_id;
  RETURN FOUND;
END;
$$;

-- Portal RPC: get nutrition targets
CREATE OR REPLACE FUNCTION public.get_portal_nutrition_targets(p_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
  IF v_client_id IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT row_to_json(t) INTO v_result
  FROM (
    SELECT calories_target, protein_target, carbs_target, fat_target
    FROM public.nutrition_targets WHERE client_id = v_client_id
  ) t;
  RETURN COALESCE(v_result, jsonb_build_object('calories_target', 2000, 'protein_target', 150, 'carbs_target', 200, 'fat_target', 65));
END;
$$;

-- Portal RPC: get weekly nutrition summary
CREATE OR REPLACE FUNCTION public.get_portal_nutrition_weekly(p_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
  IF v_client_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(d) ORDER BY d.day), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT logged_date as day,
           SUM(calories) as calories,
           SUM(protein) as protein,
           SUM(carbs) as carbs,
           SUM(fat) as fat,
           COUNT(*) as items_count
    FROM public.nutrition_logs
    WHERE client_id = v_client_id
      AND logged_date >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY logged_date
    ORDER BY logged_date
  ) d;
  RETURN v_result;
END;
$$;
