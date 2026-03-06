
-- FEATURE 2: TRAINER PROGRAMS MARKETPLACE
CREATE TABLE public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  preview_images text[] DEFAULT '{}',
  preview_video_url text,
  tags text[] DEFAULT '{}',
  difficulty text NOT NULL DEFAULT 'متوسط',
  language text NOT NULL DEFAULT 'ar',
  equipment text[] DEFAULT '{}',
  duration_weeks integer NOT NULL DEFAULT 8,
  status text NOT NULL DEFAULT 'draft',
  rating_avg numeric NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  purchase_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published listings" ON public.marketplace_listings FOR SELECT USING (status = 'published');
CREATE POLICY "Trainers can read own listings" ON public.marketplace_listings FOR SELECT TO authenticated USING (trainer_id = auth.uid());
CREATE POLICY "Trainers can insert own listings" ON public.marketplace_listings FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "Trainers can update own listings" ON public.marketplace_listings FOR UPDATE TO authenticated USING (trainer_id = auth.uid());
CREATE POLICY "Trainers can delete own listings" ON public.marketplace_listings FOR DELETE TO authenticated USING (trainer_id = auth.uid());

CREATE TABLE public.marketplace_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id),
  trainer_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  commission_rate numeric NOT NULL DEFAULT 0.1,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can read own purchases" ON public.marketplace_purchases FOR SELECT TO authenticated USING (buyer_id = auth.uid());
CREATE POLICY "Trainers can read own sales" ON public.marketplace_purchases FOR SELECT TO authenticated USING (trainer_id = auth.uid());
CREATE POLICY "Authenticated can purchase" ON public.marketplace_purchases FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());

-- FEATURE 3: GROUP CHALLENGES
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  challenge_type text NOT NULL DEFAULT 'weight_loss',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL DEFAULT (CURRENT_DATE + interval '30 days'),
  entry_fee numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  prize_description text,
  kpi_metric text NOT NULL DEFAULT 'weight_change',
  kpi_unit text NOT NULL DEFAULT 'كجم',
  max_participants integer DEFAULT 50,
  status text NOT NULL DEFAULT 'upcoming',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read challenges" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Trainers can insert own challenges" ON public.challenges FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "Trainers can update own challenges" ON public.challenges FOR UPDATE TO authenticated USING (trainer_id = auth.uid());
CREATE POLICY "Trainers can delete own challenges" ON public.challenges FOR DELETE TO authenticated USING (trainer_id = auth.uid());

CREATE TABLE public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  current_value numeric NOT NULL DEFAULT 0,
  best_value numeric NOT NULL DEFAULT 0,
  rank integer,
  badges text[] DEFAULT '{}',
  UNIQUE(challenge_id, client_id)
);
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers can manage participants" ON public.challenge_participants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_participants.challenge_id AND c.trainer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_participants.challenge_id AND c.trainer_id = auth.uid()));
CREATE POLICY "Clients can read own participation" ON public.challenge_participants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients cl WHERE cl.id = challenge_participants.client_id AND cl.auth_user_id = auth.uid()));

CREATE TABLE public.challenge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.challenge_participants(id) ON DELETE CASCADE,
  value numeric NOT NULL DEFAULT 0,
  notes text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers can manage entries" ON public.challenge_entries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.challenge_participants cp JOIN public.challenges c ON c.id = cp.challenge_id WHERE cp.id = challenge_entries.participant_id AND c.trainer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.challenge_participants cp JOIN public.challenges c ON c.id = cp.challenge_id WHERE cp.id = challenge_entries.participant_id AND c.trainer_id = auth.uid()));

-- FEATURE 4: GULF FOODS DATABASE
CREATE TABLE public.gulf_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'أطباق رئيسية',
  serving_size text NOT NULL DEFAULT 'حصة واحدة',
  calories numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fats numeric NOT NULL DEFAULT 0,
  fiber numeric NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  added_by_trainer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gulf_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read foods" ON public.gulf_foods FOR SELECT USING (true);
CREATE POLICY "Authenticated can add foods" ON public.gulf_foods FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Trainers can update own foods" ON public.gulf_foods FOR UPDATE TO authenticated USING (added_by_trainer_id = auth.uid());

-- FEATURE 5: CLIENT ENGINE MARKETPLACE
CREATE TABLE public.trainer_discovery_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL UNIQUE,
  is_discoverable boolean NOT NULL DEFAULT true,
  city text NOT NULL DEFAULT '',
  training_modes text[] DEFAULT '{online}',
  price_range_min numeric NOT NULL DEFAULT 0,
  price_range_max numeric NOT NULL DEFAULT 0,
  specialties text[] DEFAULT '{}',
  trial_sessions boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trainer_discovery_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read discoverable profiles" ON public.trainer_discovery_profiles FOR SELECT USING (is_discoverable = true);
CREATE POLICY "Trainers can manage own discovery" ON public.trainer_discovery_profiles FOR ALL TO authenticated USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());

CREATE TABLE public.client_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  goal text NOT NULL DEFAULT '',
  budget_min numeric NOT NULL DEFAULT 0,
  budget_max numeric NOT NULL DEFAULT 500,
  city text NOT NULL DEFAULT '',
  training_mode text NOT NULL DEFAULT 'online',
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_intakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create intake" ON public.client_intakes FOR INSERT WITH CHECK (true);
CREATE POLICY "Trainers can read intakes" ON public.client_intakes FOR SELECT TO authenticated USING (true);

CREATE TABLE public.client_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.client_intakes(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL,
  match_score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers can read own matches" ON public.client_matches FOR SELECT TO authenticated USING (trainer_id = auth.uid());
CREATE POLICY "Trainers can update own matches" ON public.client_matches FOR UPDATE TO authenticated USING (trainer_id = auth.uid());
CREATE POLICY "System can insert matches" ON public.client_matches FOR INSERT WITH CHECK (true);
