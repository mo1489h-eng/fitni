
-- Fix meal_items policies: change from public to authenticated
DROP POLICY IF EXISTS "Trainers can delete own meal items" ON public.meal_items;
DROP POLICY IF EXISTS "Trainers can insert own meal items" ON public.meal_items;
DROP POLICY IF EXISTS "Trainers can read own meal items" ON public.meal_items;
DROP POLICY IF EXISTS "Trainers can update own meal items" ON public.meal_items;

CREATE POLICY "Trainers can delete own meal items" ON public.meal_items
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM meal_plans mp WHERE mp.id = meal_items.meal_plan_id AND mp.trainer_id = auth.uid()));

CREATE POLICY "Trainers can insert own meal items" ON public.meal_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM meal_plans mp WHERE mp.id = meal_items.meal_plan_id AND mp.trainer_id = auth.uid()));

CREATE POLICY "Trainers can read own meal items" ON public.meal_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM meal_plans mp WHERE mp.id = meal_items.meal_plan_id AND mp.trainer_id = auth.uid()));

CREATE POLICY "Trainers can update own meal items" ON public.meal_items
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM meal_plans mp WHERE mp.id = meal_items.meal_plan_id AND mp.trainer_id = auth.uid()));

-- Fix meal_plans policies: change from public to authenticated
DROP POLICY IF EXISTS "Trainers can delete own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Trainers can insert own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Trainers can read own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Trainers can update own meal plans" ON public.meal_plans;

CREATE POLICY "Trainers can delete own meal plans" ON public.meal_plans
  FOR DELETE TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert own meal plans" ON public.meal_plans
  FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can read own meal plans" ON public.meal_plans
  FOR SELECT TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own meal plans" ON public.meal_plans
  FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid());

-- Fix measurements policies: change from public to authenticated
DROP POLICY IF EXISTS "Trainers can delete client measurements" ON public.measurements;
DROP POLICY IF EXISTS "Trainers can insert client measurements" ON public.measurements;
DROP POLICY IF EXISTS "Trainers can read client measurements" ON public.measurements;

CREATE POLICY "Trainers can delete client measurements" ON public.measurements
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = measurements.client_id AND c.trainer_id = auth.uid()));

CREATE POLICY "Trainers can insert client measurements" ON public.measurements
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clients c WHERE c.id = measurements.client_id AND c.trainer_id = auth.uid()));

CREATE POLICY "Trainers can read client measurements" ON public.measurements
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = measurements.client_id AND c.trainer_id = auth.uid()));
