
-- 1. Enable RLS on promo_codes (if not already)
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- 2. Force RLS even for table owners
ALTER TABLE public.promo_codes FORCE ROW LEVEL SECURITY;

-- 3. Deny anonymous access
CREATE POLICY "Anonymous deny promo_codes"
  ON public.promo_codes AS RESTRICTIVE FOR ALL TO anon USING (false);

-- 4. Only authenticated users can read promo codes (validation is done via RPC)
-- No direct read needed - validate_promo_code and validate_and_redeem_promo are SECURITY DEFINER
-- So we only need to allow the service role (which bypasses RLS)
-- No permissive policies = no direct access, only via RPCs
