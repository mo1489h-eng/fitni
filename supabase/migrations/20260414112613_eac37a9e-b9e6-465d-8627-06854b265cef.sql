
CREATE TABLE IF NOT EXISTS public.exercisedb_cache (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  body_part TEXT NOT NULL DEFAULT '',
  equipment TEXT NOT NULL DEFAULT '',
  gif_url TEXT,
  target TEXT NOT NULL DEFAULT '',
  secondary_muscles TEXT[] DEFAULT '{}',
  instructions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exercisedb_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read exercises"
ON public.exercisedb_cache FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon users can read exercises"
ON public.exercisedb_cache FOR SELECT TO anon USING (true);

CREATE POLICY "Service role can insert exercises"
ON public.exercisedb_cache FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update exercises"
ON public.exercisedb_cache FOR UPDATE TO service_role USING (true);

CREATE INDEX IF NOT EXISTS idx_exercisedb_cache_body_part ON public.exercisedb_cache (body_part);
CREATE INDEX IF NOT EXISTS idx_exercisedb_cache_name ON public.exercisedb_cache (name);
