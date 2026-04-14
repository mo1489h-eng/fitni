-- Fix: Deny SELECT on contact_submissions for all authenticated users
CREATE POLICY "Deny select on contact_submissions"
ON public.contact_submissions
FOR SELECT
TO authenticated
USING (false);

-- Also deny for anon
CREATE POLICY "Deny select on contact_submissions for anon"
ON public.contact_submissions
FOR SELECT
TO anon
USING (false);