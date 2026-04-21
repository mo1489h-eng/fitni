-- Nutrition tracking: meal completion logs + daily water log
-- + portal RPCs so anon/portal-token clients can toggle completion
-- and fetch today's summary.

-- ────────────────────────────────────────────────────────────
-- 1. Tables
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meal_completion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  meal_plan_item_id UUID,
  meal_name TEXT NOT NULL,
  calories INTEGER DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT now(),
  date DATE DEFAULT CURRENT_DATE,
  portal_token TEXT
);

CREATE INDEX IF NOT EXISTS meal_completion_logs_client_date_idx
  ON public.meal_completion_logs (client_id, date);

ALTER TABLE public.meal_completion_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients manage own meal logs"
  ON public.meal_completion_logs;
CREATE POLICY "Clients manage own meal logs"
  ON public.meal_completion_logs FOR ALL TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Trainers read clients meal logs"
  ON public.meal_completion_logs;
CREATE POLICY "Trainers read clients meal logs"
  ON public.meal_completion_logs FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE trainer_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  glasses INTEGER DEFAULT 0,
  target_glasses INTEGER DEFAULT 8,
  date DATE DEFAULT CURRENT_DATE,
  UNIQUE (client_id, date)
);

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients manage own water logs"
  ON public.water_logs;
CREATE POLICY "Clients manage own water logs"
  ON public.water_logs FOR ALL TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Trainers read clients water logs"
  ON public.water_logs;
CREATE POLICY "Trainers read clients water logs"
  ON public.water_logs FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE trainer_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 2. Portal RPCs (token-based, SECURITY DEFINER)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.toggle_meal_completion(
  p_token TEXT,
  p_meal_name TEXT,
  p_calories INTEGER DEFAULT 0,
  p_protein NUMERIC DEFAULT 0,
  p_carbs NUMERIC DEFAULT 0,
  p_fat NUMERIC DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id UUID;
  v_existing UUID;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token
    AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid token');
  END IF;

  SELECT id INTO v_existing
  FROM public.meal_completion_logs
  WHERE client_id = v_client_id
    AND meal_name = p_meal_name
    AND date = CURRENT_DATE
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    DELETE FROM public.meal_completion_logs WHERE id = v_existing;
    RETURN jsonb_build_object('completed', false);
  ELSE
    INSERT INTO public.meal_completion_logs
      (client_id, meal_name, calories, protein, carbs, fat, portal_token)
    VALUES
      (v_client_id, p_meal_name, p_calories, p_protein, p_carbs, p_fat, p_token);
    RETURN jsonb_build_object('completed', true);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_water_log(
  p_token TEXT,
  p_glasses INTEGER
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id UUID;
  v_glasses INTEGER;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token
    AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid token');
  END IF;

  v_glasses := GREATEST(0, LEAST(COALESCE(p_glasses, 0), 50));

  INSERT INTO public.water_logs (client_id, glasses, date)
  VALUES (v_client_id, v_glasses, CURRENT_DATE)
  ON CONFLICT (client_id, date)
  DO UPDATE SET glasses = EXCLUDED.glasses;

  RETURN jsonb_build_object('glasses', v_glasses);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_portal_nutrition_today(
  p_token TEXT
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH c AS (
    SELECT id FROM public.clients
    WHERE portal_token = p_token
      AND portal_token IS NOT NULL
      AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'completed_meals', COALESCE((
      SELECT jsonb_agg(meal_name)
      FROM public.meal_completion_logs m
      WHERE m.client_id = (SELECT id FROM c) AND m.date = CURRENT_DATE
    ), '[]'::jsonb),
    'water_glasses', COALESCE((
      SELECT glasses FROM public.water_logs w
      WHERE w.client_id = (SELECT id FROM c) AND w.date = CURRENT_DATE
    ), 0),
    'total_calories', COALESCE((
      SELECT SUM(calories) FROM public.meal_completion_logs m
      WHERE m.client_id = (SELECT id FROM c) AND m.date = CURRENT_DATE
    ), 0),
    'total_protein', COALESCE((
      SELECT SUM(protein) FROM public.meal_completion_logs m
      WHERE m.client_id = (SELECT id FROM c) AND m.date = CURRENT_DATE
    ), 0),
    'total_carbs', COALESCE((
      SELECT SUM(carbs) FROM public.meal_completion_logs m
      WHERE m.client_id = (SELECT id FROM c) AND m.date = CURRENT_DATE
    ), 0),
    'total_fat', COALESCE((
      SELECT SUM(fat) FROM public.meal_completion_logs m
      WHERE m.client_id = (SELECT id FROM c) AND m.date = CURRENT_DATE
    ), 0)
  );
$$;

GRANT EXECUTE ON FUNCTION public.toggle_meal_completion(TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_water_log(TEXT, INTEGER)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_portal_nutrition_today(TEXT)
  TO anon, authenticated;
