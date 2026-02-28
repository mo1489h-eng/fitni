
-- Allow public (anon) to read specific profile fields for trainer public pages
CREATE POLICY "Public can read trainer profiles" ON public.profiles FOR SELECT TO anon USING (true);
