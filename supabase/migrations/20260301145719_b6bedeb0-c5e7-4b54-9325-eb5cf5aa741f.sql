
-- 1. Create security definer function to look up a client by portal token
CREATE OR REPLACE FUNCTION public.get_client_by_portal_token(p_token text)
RETURNS SETOF public.clients
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.clients WHERE portal_token = p_token LIMIT 1;
$$;

-- 2. Create helper function for other tables' portal policies
CREATE OR REPLACE FUNCTION public.client_has_portal_token(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients WHERE id = p_client_id AND portal_token IS NOT NULL
  );
$$;

-- 3. Drop the overly permissive portal token read policy
DROP POLICY IF EXISTS "Portal token read access" ON public.clients;

-- 4. Update measurements portal policy to use security definer function
DROP POLICY IF EXISTS "Portal token read measurements" ON public.measurements;
CREATE POLICY "Portal token read measurements"
ON public.measurements FOR SELECT
USING (public.client_has_portal_token(client_id));

-- 5. Update progress_photos portal policy
DROP POLICY IF EXISTS "Portal token read photos" ON public.progress_photos;
CREATE POLICY "Portal token read photos"
ON public.progress_photos FOR SELECT
USING (public.client_has_portal_token(client_id));

DROP POLICY IF EXISTS "Portal can insert photos" ON public.progress_photos;
CREATE POLICY "Portal can insert photos"
ON public.progress_photos FOR INSERT
WITH CHECK (public.client_has_portal_token(client_id));

-- 6. Update meal_plans portal policy
DROP POLICY IF EXISTS "Portal can read assigned meal plans" ON public.meal_plans;
CREATE POLICY "Portal can read assigned meal plans"
ON public.meal_plans FOR SELECT
USING (public.client_has_portal_token(client_id));

-- 7. Update meal_items portal policy
DROP POLICY IF EXISTS "Portal can read meal items" ON public.meal_items;
CREATE POLICY "Portal can read meal items"
ON public.meal_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.meal_plans mp
  WHERE mp.id = meal_items.meal_plan_id
  AND public.client_has_portal_token(mp.client_id)
));
