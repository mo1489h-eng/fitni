
-- Meal plans table
CREATE TABLE public.meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Meal items table
CREATE TABLE public.meal_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  meal_name TEXT NOT NULL DEFAULT 'وجبة',
  food_name TEXT NOT NULL,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fats NUMERIC NOT NULL DEFAULT 0,
  quantity TEXT DEFAULT '',
  item_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for meal_plans
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can read own meal plans" ON public.meal_plans
  FOR SELECT USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert own meal plans" ON public.meal_plans
  FOR INSERT WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own meal plans" ON public.meal_plans
  FOR UPDATE USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own meal plans" ON public.meal_plans
  FOR DELETE USING (trainer_id = auth.uid());

-- RLS for meal_items
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can read own meal items" ON public.meal_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_items.meal_plan_id AND mp.trainer_id = auth.uid())
  );

CREATE POLICY "Trainers can insert own meal items" ON public.meal_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_items.meal_plan_id AND mp.trainer_id = auth.uid())
  );

CREATE POLICY "Trainers can update own meal items" ON public.meal_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_items.meal_plan_id AND mp.trainer_id = auth.uid())
  );

CREATE POLICY "Trainers can delete own meal items" ON public.meal_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_items.meal_plan_id AND mp.trainer_id = auth.uid())
  );

-- Portal access for meal plans
CREATE POLICY "Portal can read assigned meal plans" ON public.meal_plans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = meal_plans.client_id AND c.portal_token IS NOT NULL)
  );

CREATE POLICY "Portal can read meal items" ON public.meal_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp
      JOIN public.clients c ON c.id = mp.client_id
      WHERE mp.id = meal_items.meal_plan_id AND c.portal_token IS NOT NULL
    )
  );
