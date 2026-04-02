
-- Client achievements table
CREATE TABLE public.client_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL,
  achievement_type TEXT NOT NULL DEFAULT 'weight_loss',
  achievement_value TEXT NOT NULL DEFAULT '',
  achievement_detail TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_visible_on_page BOOLEAN NOT NULL DEFAULT false,
  display_name_mode TEXT NOT NULL DEFAULT 'first_name',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add privacy_achievements column to clients
ALTER TABLE public.clients ADD COLUMN privacy_achievements BOOLEAN NOT NULL DEFAULT true;

-- RLS
ALTER TABLE public.client_achievements ENABLE ROW LEVEL SECURITY;

-- Trainers can manage achievements for their clients
CREATE POLICY "Trainers can manage own client achievements"
  ON public.client_achievements FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Public can read approved visible achievements (for trainer public page)
CREATE POLICY "Public can read visible achievements"
  ON public.client_achievements FOR SELECT
  TO public
  USING (is_approved = true AND is_visible_on_page = true);

-- Clients can read own achievements
CREATE POLICY "Clients can read own achievements"
  ON public.client_achievements FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = client_achievements.client_id AND c.auth_user_id = auth.uid()
  ));
