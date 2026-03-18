-- Secure plan-gated features with security definer helper functions and stricter RLS policies

CREATE OR REPLACE FUNCTION public.has_active_plan(_user_id uuid, _plans text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.subscription_plan = ANY(_plans)
      AND (
        p.subscription_end_date IS NULL
        OR p.subscription_end_date > now()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_pro_trainer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_active_plan(_user_id, ARRAY['pro']);
$$;

-- trainer_discovery_profiles: Pro only
DROP POLICY IF EXISTS "Anyone can read discoverable profiles" ON public.trainer_discovery_profiles;
DROP POLICY IF EXISTS "Trainers can manage own discovery" ON public.trainer_discovery_profiles;

CREATE POLICY "Anyone can read discoverable profiles"
ON public.trainer_discovery_profiles
FOR SELECT
TO public
USING (is_discoverable = true AND public.is_pro_trainer(trainer_id));

CREATE POLICY "Pro trainers can manage own discovery"
ON public.trainer_discovery_profiles
FOR ALL
TO authenticated
USING (trainer_id = auth.uid() AND public.is_pro_trainer(auth.uid()))
WITH CHECK (trainer_id = auth.uid() AND public.is_pro_trainer(auth.uid()));

-- client_matches: Pro only
DROP POLICY IF EXISTS "Trainers can read own matches" ON public.client_matches;
DROP POLICY IF EXISTS "Trainers can update own matches" ON public.client_matches;

CREATE POLICY "Pro trainers can read own matches"
ON public.client_matches
FOR SELECT
TO authenticated
USING (trainer_id = auth.uid() AND public.is_pro_trainer(auth.uid()));

CREATE POLICY "Pro trainers can update own matches"
ON public.client_matches
FOR UPDATE
TO authenticated
USING (trainer_id = auth.uid() AND public.is_pro_trainer(auth.uid()));

-- marketplace_listings: publish/manage only for Pro, public sees only Pro listings
DROP POLICY IF EXISTS "Public can read published listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Trainers can delete own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Trainers can insert own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Trainers can read own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Trainers can update own listings" ON public.marketplace_listings;

CREATE POLICY "Public can read published pro listings"
ON public.marketplace_listings
FOR SELECT
TO public
USING (status = 'published' AND public.is_pro_trainer(trainer_id));

CREATE POLICY "Trainers can read own listings"
ON public.marketplace_listings
FOR SELECT
TO authenticated
USING (trainer_id = auth.uid());

CREATE POLICY "Pro trainers can insert own listings"
ON public.marketplace_listings
FOR INSERT
TO authenticated
WITH CHECK (trainer_id = auth.uid() AND public.is_pro_trainer(auth.uid()));

CREATE POLICY "Pro trainers can update own listings"
ON public.marketplace_listings
FOR UPDATE
TO authenticated
USING (trainer_id = auth.uid() AND public.is_pro_trainer(auth.uid()));

CREATE POLICY "Pro trainers can delete own listings"
ON public.marketplace_listings
FOR DELETE
TO authenticated
USING (trainer_id = auth.uid() AND public.is_pro_trainer(auth.uid()));

-- challenges: Pro only
DROP POLICY IF EXISTS "Anyone can read challenges" ON public.challenges;
DROP POLICY IF EXISTS "Trainers can delete own challenges" ON public.challenges;
DROP POLICY IF EXISTS "Trainers can insert own challenges" ON public.challenges;
DROP POLICY IF EXISTS "Trainers can update own challenges" ON public.challenges;

CREATE POLICY "Anyone can read pro challenges"
ON public.challenges
FOR SELECT
TO public
USING (public.is_pro_trainer(trainer_id));

CREATE POLICY "Pro trainers can insert own challenges"
ON public.challenges
FOR INSERT
TO authenticated
WITH CHECK (trainer_id = auth.uid() AND public.is_pro_trainer(auth.uid()));

CREATE POLICY "Pro trainers can update own challenges"
ON public.challenges
FOR UPDATE
TO authenticated
USING (trainer_id = auth.uid() AND public.is_pro_trainer(auth.uid()));

CREATE POLICY "Pro trainers can delete own challenges"
ON public.challenges
FOR DELETE
TO authenticated
USING (trainer_id = auth.uid() AND public.is_pro_trainer(auth.uid()));

-- challenge_participants: Pro only
DROP POLICY IF EXISTS "Clients can read own participation" ON public.challenge_participants;
DROP POLICY IF EXISTS "Trainers can manage participants" ON public.challenge_participants;

CREATE POLICY "Clients can read own participation"
ON public.challenge_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clients cl
    JOIN public.challenges ch ON ch.id = challenge_participants.challenge_id
    WHERE cl.id = challenge_participants.client_id
      AND cl.auth_user_id = auth.uid()
      AND public.is_pro_trainer(ch.trainer_id)
  )
);

CREATE POLICY "Pro trainers can manage participants"
ON public.challenge_participants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.challenges c
    WHERE c.id = challenge_participants.challenge_id
      AND c.trainer_id = auth.uid()
      AND public.is_pro_trainer(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.challenges c
    WHERE c.id = challenge_participants.challenge_id
      AND c.trainer_id = auth.uid()
      AND public.is_pro_trainer(auth.uid())
  )
);

-- challenge_entries: Pro only
DROP POLICY IF EXISTS "Trainers can manage entries" ON public.challenge_entries;

CREATE POLICY "Pro trainers can manage entries"
ON public.challenge_entries
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.challenge_participants cp
    JOIN public.challenges c ON c.id = cp.challenge_id
    WHERE cp.id = challenge_entries.participant_id
      AND c.trainer_id = auth.uid()
      AND public.is_pro_trainer(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.challenge_participants cp
    JOIN public.challenges c ON c.id = cp.challenge_id
    WHERE cp.id = challenge_entries.participant_id
      AND c.trainer_id = auth.uid()
      AND public.is_pro_trainer(auth.uid())
  )
);