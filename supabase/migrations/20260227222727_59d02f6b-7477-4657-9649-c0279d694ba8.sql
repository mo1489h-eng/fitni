-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  goal TEXT NOT NULL DEFAULT '',
  subscription_price NUMERIC NOT NULL DEFAULT 0,
  subscription_end_date DATE NOT NULL DEFAULT (now() + interval '30 days'),
  week_number INTEGER NOT NULL DEFAULT 1,
  last_workout_date DATE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- For now allow all access (will add trainer-based auth policies later)
CREATE POLICY "Allow all read access" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Allow all insert access" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update access" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Allow all delete access" ON public.clients FOR DELETE USING (true);