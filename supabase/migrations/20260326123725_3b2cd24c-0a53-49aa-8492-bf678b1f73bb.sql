
-- 1. Exercise Library table
CREATE TABLE public.exercise_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  muscle_group text NOT NULL DEFAULT '',
  secondary_muscles text[] DEFAULT '{}',
  equipment text NOT NULL DEFAULT 'بدون معدات',
  difficulty text NOT NULL DEFAULT 'مبتدئ',
  movement_pattern text DEFAULT NULL,
  video_url text DEFAULT NULL,
  instructions_ar text DEFAULT NULL,
  is_custom boolean NOT NULL DEFAULT false,
  trainer_id uuid DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read default exercises" ON public.exercise_library
  FOR SELECT TO public USING (is_custom = false);

CREATE POLICY "Authenticated can read custom exercises" ON public.exercise_library
  FOR SELECT TO authenticated USING (is_custom = false OR trainer_id = auth.uid());

CREATE POLICY "Trainers can insert custom exercises" ON public.exercise_library
  FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid() AND is_custom = true);

CREATE POLICY "Trainers can update own exercises" ON public.exercise_library
  FOR UPDATE TO authenticated USING (trainer_id = auth.uid() AND is_custom = true);

CREATE POLICY "Trainers can delete own exercises" ON public.exercise_library
  FOR DELETE TO authenticated USING (trainer_id = auth.uid() AND is_custom = true);

-- 2. Add new columns to program_exercises
ALTER TABLE public.program_exercises
  ADD COLUMN IF NOT EXISTS rest_seconds integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS tempo text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rpe numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS superset_group text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_warmup boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exercise_library_id uuid REFERENCES public.exercise_library(id) DEFAULT NULL;

-- 3. Workout logs table for client tracking
CREATE TABLE public.workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  program_day_id uuid NOT NULL REFERENCES public.program_days(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.program_exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL DEFAULT 1,
  planned_reps integer NOT NULL DEFAULT 0,
  planned_weight numeric NOT NULL DEFAULT 0,
  actual_reps integer DEFAULT NULL,
  actual_weight numeric DEFAULT NULL,
  rpe numeric DEFAULT NULL,
  notes text DEFAULT NULL,
  completed boolean NOT NULL DEFAULT false,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own workout logs" ON public.workout_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = workout_logs.client_id AND c.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clients c WHERE c.id = workout_logs.client_id AND c.auth_user_id = auth.uid()));

CREATE POLICY "Trainers can read client workout logs" ON public.workout_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = workout_logs.client_id AND c.trainer_id = auth.uid()));

-- 4. Workout sessions table (per-day summary)
CREATE TABLE public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  program_day_id uuid NOT NULL REFERENCES public.program_days(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz DEFAULT NULL,
  duration_minutes integer DEFAULT NULL,
  total_volume numeric DEFAULT 0,
  total_sets integer DEFAULT 0,
  notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own sessions" ON public.workout_sessions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = workout_sessions.client_id AND c.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clients c WHERE c.id = workout_sessions.client_id AND c.auth_user_id = auth.uid()));

CREATE POLICY "Trainers can read client sessions" ON public.workout_sessions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = workout_sessions.client_id AND c.trainer_id = auth.uid()));

-- 5. Add is_template flag to programs
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS goal text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS difficulty text DEFAULT NULL;

-- 6. Clients can read assigned program data
CREATE POLICY "Clients can read own program" ON public.programs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.program_id = programs.id AND c.auth_user_id = auth.uid()));

CREATE POLICY "Clients can read own program days" ON public.program_days
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM programs p JOIN clients c ON c.program_id = p.id WHERE p.id = program_days.program_id AND c.auth_user_id = auth.uid()));

CREATE POLICY "Clients can read own program exercises" ON public.program_exercises
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM program_days pd JOIN programs p ON p.id = pd.program_id JOIN clients c ON c.program_id = p.id WHERE pd.id = program_exercises.day_id AND c.auth_user_id = auth.uid()));
