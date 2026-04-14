-- Ensure exercisedb_cache exists and read policies (anon + authenticated) for GIF/cache flows.
CREATE TABLE IF NOT EXISTS public.exercisedb_cache (
  id text PRIMARY KEY,
  name text,
  body_part text,
  equipment text,
  gif_url text,
  target text,
  secondary_muscles text[],
  instructions text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.exercisedb_cache ENABLE ROW LEVEL SECURITY;

-- Replace legacy policy names with stable names (idempotent).
DROP POLICY IF EXISTS "Authenticated users can read exercises" ON public.exercisedb_cache;
DROP POLICY IF EXISTS "Anon users can read exercises" ON public.exercisedb_cache;
DROP POLICY IF EXISTS "exercisedb_cache_select_authenticated" ON public.exercisedb_cache;
DROP POLICY IF EXISTS "authenticated_read" ON public.exercisedb_cache;
DROP POLICY IF EXISTS "anon_read" ON public.exercisedb_cache;

CREATE POLICY "authenticated_read" ON public.exercisedb_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "anon_read" ON public.exercisedb_cache
  FOR SELECT TO anon USING (true);
