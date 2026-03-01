
-- Remove the portal measurements policy since portal pages don't query measurements
DROP POLICY IF EXISTS "Portal token read measurements" ON public.measurements;
