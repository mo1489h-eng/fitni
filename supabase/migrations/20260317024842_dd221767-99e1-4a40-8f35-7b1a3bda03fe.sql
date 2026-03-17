CREATE POLICY "No direct access to checkout sessions"
ON public.package_checkout_sessions
FOR ALL
TO public
USING (false)
WITH CHECK (false);