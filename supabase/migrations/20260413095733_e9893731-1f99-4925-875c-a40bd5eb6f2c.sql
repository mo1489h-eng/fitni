
-- Add missing columns to workout_sessions
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS current_exercise_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trainer_id uuid DEFAULT NULL;

-- Create workout_session_exercises table
CREATE TABLE IF NOT EXISTS public.workout_session_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL,
  program_day_id uuid,
  set_number integer NOT NULL DEFAULT 1,
  weight_used numeric NOT NULL DEFAULT 0,
  reps_completed integer NOT NULL DEFAULT 0,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_session_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read own session exercises"
ON public.workout_session_exercises FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM workout_sessions ws
  JOIN clients c ON c.id = ws.client_id
  WHERE ws.id = workout_session_exercises.session_id
    AND c.auth_user_id = auth.uid()
));

CREATE POLICY "Clients can insert own session exercises"
ON public.workout_session_exercises FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM workout_sessions ws
  JOIN clients c ON c.id = ws.client_id
  WHERE ws.id = workout_session_exercises.session_id
    AND c.auth_user_id = auth.uid()
));

CREATE POLICY "Trainers can read client session exercises"
ON public.workout_session_exercises FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM workout_sessions ws
  JOIN clients c ON c.id = ws.client_id
  WHERE ws.id = workout_session_exercises.session_id
    AND c.trainer_id = auth.uid()
));

-- Create copilot_conversations table
CREATE TABLE IF NOT EXISTS public.copilot_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'trainer',
  client_id uuid DEFAULT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.copilot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations"
ON public.copilot_conversations FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
