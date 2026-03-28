
CREATE TABLE public.program_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'لياقة عامة',
  level TEXT DEFAULT 'متوسط',
  duration_weeks INTEGER DEFAULT 8,
  days_per_week INTEGER DEFAULT 4,
  description TEXT DEFAULT '',
  is_public BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  program_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.program_templates ENABLE ROW LEVEL SECURITY;

-- Trainers can read their own templates + public + system templates
CREATE POLICY "Trainers can read templates"
ON public.program_templates FOR SELECT
TO authenticated
USING (
  trainer_id = auth.uid() OR is_public = true OR is_system = true
);

-- Trainers can insert their own templates
CREATE POLICY "Trainers can insert own templates"
ON public.program_templates FOR INSERT
TO authenticated
WITH CHECK (trainer_id = auth.uid());

-- Trainers can update their own templates
CREATE POLICY "Trainers can update own templates"
ON public.program_templates FOR UPDATE
TO authenticated
USING (trainer_id = auth.uid());

-- Trainers can delete their own templates
CREATE POLICY "Trainers can delete own templates"
ON public.program_templates FOR DELETE
TO authenticated
USING (trainer_id = auth.uid());
