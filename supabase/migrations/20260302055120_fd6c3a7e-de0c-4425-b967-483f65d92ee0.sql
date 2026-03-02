
-- Create trainer_sessions table for calendar
CREATE TABLE public.trainer_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  session_type text NOT NULL DEFAULT 'تدريب',
  session_date date NOT NULL,
  start_time time NOT NULL DEFAULT '09:00',
  duration_minutes integer NOT NULL DEFAULT 60,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trainer_sessions ENABLE ROW LEVEL SECURITY;

-- Trainers can do everything with their own sessions
CREATE POLICY "Trainers can read own sessions" ON public.trainer_sessions
  FOR SELECT USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert own sessions" ON public.trainer_sessions
  FOR INSERT WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own sessions" ON public.trainer_sessions
  FOR UPDATE USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own sessions" ON public.trainer_sessions
  FOR DELETE USING (trainer_id = auth.uid());
