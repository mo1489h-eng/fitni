
-- Allow authenticated users to update promo codes (increment used_count)
CREATE POLICY "Authenticated users can update promo codes" ON public.promo_codes
  FOR UPDATE USING (true) WITH CHECK (true);
