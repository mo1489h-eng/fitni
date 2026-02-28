
-- Programs table
CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  name text NOT NULL,
  weeks integer NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can read own programs" ON public.programs
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert own programs" ON public.programs
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own programs" ON public.programs
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own programs" ON public.programs
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (trainer_id = auth.uid());

-- Program days table
CREATE TABLE public.program_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  day_name text NOT NULL,
  day_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can read own program days" ON public.program_days
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.programs WHERE id = program_days.program_id AND trainer_id = auth.uid()));

CREATE POLICY "Trainers can insert own program days" ON public.program_days
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.programs WHERE id = program_days.program_id AND trainer_id = auth.uid()));

CREATE POLICY "Trainers can update own program days" ON public.program_days
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.programs WHERE id = program_days.program_id AND trainer_id = auth.uid()));

CREATE POLICY "Trainers can delete own program days" ON public.program_days
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.programs WHERE id = program_days.program_id AND trainer_id = auth.uid()));

-- Program exercises table
CREATE TABLE public.program_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES public.program_days(id) ON DELETE CASCADE,
  name text NOT NULL,
  sets integer NOT NULL DEFAULT 3,
  reps integer NOT NULL DEFAULT 10,
  weight numeric NOT NULL DEFAULT 0,
  exercise_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can read own exercises" ON public.program_exercises
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.program_days pd
    JOIN public.programs p ON p.id = pd.program_id
    WHERE pd.id = program_exercises.day_id AND p.trainer_id = auth.uid()
  ));

CREATE POLICY "Trainers can insert own exercises" ON public.program_exercises
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.program_days pd
    JOIN public.programs p ON p.id = pd.program_id
    WHERE pd.id = program_exercises.day_id AND p.trainer_id = auth.uid()
  ));

CREATE POLICY "Trainers can update own exercises" ON public.program_exercises
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.program_days pd
    JOIN public.programs p ON p.id = pd.program_id
    WHERE pd.id = program_exercises.day_id AND p.trainer_id = auth.uid()
  ));

CREATE POLICY "Trainers can delete own exercises" ON public.program_exercises
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.program_days pd
    JOIN public.programs p ON p.id = pd.program_id
    WHERE pd.id = program_exercises.day_id AND p.trainer_id = auth.uid()
  ));

-- Also add a program_id column to clients for assignment
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL;
