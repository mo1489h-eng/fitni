
-- Referral settings column on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_reward_type text DEFAULT 'free_month',
  ADD COLUMN IF NOT EXISTS referral_reward_text text DEFAULT '';

-- Referral code on clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Generate referral codes for existing clients
UPDATE public.clients SET referral_code = encode(extensions.gen_random_bytes(6), 'hex') WHERE referral_code IS NULL;

-- Trigger to auto-generate referral code on insert
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := encode(extensions.gen_random_bytes(6), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_referral_code
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- Referrals tracking table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  referred_client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL,
  reward_status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(referred_client_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Trainers can read referrals for their clients
CREATE POLICY "Trainers can read own referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (trainer_id = auth.uid());

-- Trainers can update reward status
CREATE POLICY "Trainers can update own referrals"
  ON public.referrals FOR UPDATE TO authenticated
  USING (trainer_id = auth.uid());

-- Service role inserts (from edge functions), but also allow trainer insert
CREATE POLICY "Trainers can insert referrals"
  ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (trainer_id = auth.uid());

-- Clients can read their own referrals (as referrer)
CREATE POLICY "Clients can read own referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = referrals.referrer_client_id AND c.auth_user_id = auth.uid()
  ));
