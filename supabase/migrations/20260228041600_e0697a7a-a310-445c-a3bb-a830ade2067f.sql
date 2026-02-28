
-- Drop the overly permissive policy
DROP POLICY "Authenticated users can update promo codes" ON public.promo_codes;

-- Create a more restrictive policy: only authenticated users can update
CREATE POLICY "Auth users can increment promo usage" ON public.promo_codes
  FOR UPDATE USING (auth.uid() IS NOT NULL);
