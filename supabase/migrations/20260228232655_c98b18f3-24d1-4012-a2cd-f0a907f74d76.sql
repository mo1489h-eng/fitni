
-- Trainer posts table
CREATE TABLE public.trainer_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  post_type text NOT NULL DEFAULT 'نصيحة',
  content text NOT NULL,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.trainer_posts ENABLE ROW LEVEL SECURITY;

-- Trainer can CRUD own posts
CREATE POLICY "Trainers can read own posts" ON public.trainer_posts FOR SELECT TO authenticated USING (trainer_id = auth.uid());
CREATE POLICY "Trainers can insert own posts" ON public.trainer_posts FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "Trainers can update own posts" ON public.trainer_posts FOR UPDATE TO authenticated USING (trainer_id = auth.uid());
CREATE POLICY "Trainers can delete own posts" ON public.trainer_posts FOR DELETE TO authenticated USING (trainer_id = auth.uid());

-- Public read for trainer pages (anyone can read posts by trainer_id)
CREATE POLICY "Public can read trainer posts" ON public.trainer_posts FOR SELECT TO anon USING (true);
