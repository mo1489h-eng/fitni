
-- ============================================
-- 1. Replace client_has_portal_token with token-validating function
-- ============================================

-- New function: validates both client_id AND token match
CREATE OR REPLACE FUNCTION public.verify_portal_access(p_client_id uuid, p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = p_client_id
      AND portal_token = p_token
      AND portal_token IS NOT NULL
  );
$$;

-- RPC to get portal nutrition data (meal plans + items) by token
CREATE OR REPLACE FUNCTION public.get_portal_meal_plans(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
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
$$;

-- RPC to get portal progress photos by token
CREATE OR REPLACE FUNCTION public.get_portal_progress_photos(p_token text)
RETURNS SETOF public.progress_photos
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pp.*
  FROM public.progress_photos pp
  JOIN public.clients c ON c.id = pp.client_id
  WHERE c.portal_token = p_token
    AND c.portal_token IS NOT NULL
  ORDER BY pp.created_at DESC;
$$;

-- RPC to insert a portal progress photo (validates token)
CREATE OR REPLACE FUNCTION public.insert_portal_progress_photo(
  p_token text,
  p_photo_type text,
  p_photo_url text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client record;
  v_photo_id uuid;
BEGIN
  SELECT id, trainer_id INTO v_client
  FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
  LIMIT 1;

  IF v_client.id IS NULL THEN
    RAISE EXCEPTION 'Invalid portal token';
  END IF;

  INSERT INTO public.progress_photos (client_id, trainer_id, photo_type, photo_url, uploaded_by)
  VALUES (v_client.id, v_client.trainer_id, p_photo_type, p_photo_url, 'client')
  RETURNING id INTO v_photo_id;

  RETURN v_photo_id;
END;
$$;

-- ============================================
-- 2. Drop old insecure portal RLS policies that use client_has_portal_token
-- ============================================

-- meal_plans: portal policy uses client_has_portal_token - remove it
DROP POLICY IF EXISTS "Portal can read assigned meal plans" ON public.meal_plans;

-- meal_items: portal policy uses client_has_portal_token - remove it
DROP POLICY IF EXISTS "Portal can read meal items" ON public.meal_items;

-- progress_photos: portal policies use client_has_portal_token - remove them
DROP POLICY IF EXISTS "Portal token read photos" ON public.progress_photos;
DROP POLICY IF EXISTS "Portal can insert photos" ON public.progress_photos;

-- ============================================
-- 3. Drop the insecure client_has_portal_token function
-- ============================================
DROP FUNCTION IF EXISTS public.client_has_portal_token(uuid);

-- ============================================
-- 4. Fix old weak storage delete policy
-- ============================================
DROP POLICY IF EXISTS "Users can delete own post media" ON storage.objects;

-- ============================================
-- 5. Add meal_items validation constraints
-- ============================================
ALTER TABLE public.meal_items ADD CONSTRAINT calories_non_negative CHECK (calories >= 0);
ALTER TABLE public.meal_items ADD CONSTRAINT protein_non_negative CHECK (protein >= 0);
ALTER TABLE public.meal_items ADD CONSTRAINT carbs_non_negative CHECK (carbs >= 0);
ALTER TABLE public.meal_items ADD CONSTRAINT fats_non_negative CHECK (fats >= 0);
ALTER TABLE public.meal_items ADD CONSTRAINT food_name_not_empty CHECK (length(trim(food_name)) > 0);
ALTER TABLE public.meal_items ADD CONSTRAINT food_name_max_length CHECK (length(food_name) <= 200);
ALTER TABLE public.meal_items ADD CONSTRAINT meal_name_max_length CHECK (length(meal_name) <= 200);
