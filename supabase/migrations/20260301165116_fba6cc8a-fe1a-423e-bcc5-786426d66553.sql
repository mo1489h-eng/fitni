
-- Trainer notifications table
CREATE TABLE public.trainer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trainer_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can read own notifications" ON public.trainer_notifications
FOR SELECT TO authenticated USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own notifications" ON public.trainer_notifications
FOR UPDATE TO authenticated USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own notifications" ON public.trainer_notifications
FOR DELETE TO authenticated USING (trainer_id = auth.uid());

-- Allow system (security definer functions) to insert
CREATE POLICY "System can insert notifications" ON public.trainer_notifications
FOR INSERT TO authenticated WITH CHECK (true);

-- Client moods table
CREATE TABLE public.client_moods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  mood text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  mood_date date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.client_moods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can read client moods" ON public.client_moods
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_moods.client_id AND c.trainer_id = auth.uid()));

CREATE POLICY "Clients can read own moods" ON public.client_moods
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_moods.client_id AND c.auth_user_id = auth.uid()));

-- Privacy + activity columns on clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS privacy_weight boolean NOT NULL DEFAULT true;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS privacy_photos boolean NOT NULL DEFAULT true;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS privacy_scans boolean NOT NULL DEFAULT true;

-- RPC to log mood from portal
CREATE OR REPLACE FUNCTION public.log_portal_mood(p_token text, p_mood text, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_mood_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL LIMIT 1;
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Invalid portal token'; END IF;

  -- Upsert: one mood per day
  INSERT INTO public.client_moods (client_id, mood, note, mood_date)
  VALUES (v_client_id, p_mood, p_note, CURRENT_DATE)
  ON CONFLICT (client_id, mood_date) DO UPDATE SET mood = EXCLUDED.mood, note = EXCLUDED.note
  RETURNING id INTO v_mood_id;

  -- Update last_active_at
  UPDATE public.clients SET last_active_at = now() WHERE id = v_client_id;

  RETURN v_mood_id;
END;
$$;

-- Add unique constraint for one mood per day
ALTER TABLE public.client_moods ADD CONSTRAINT unique_client_mood_per_day UNIQUE (client_id, mood_date);

-- RPC to update client privacy settings
CREATE OR REPLACE FUNCTION public.update_portal_privacy(p_token text, p_privacy_weight boolean, p_privacy_photos boolean, p_privacy_scans boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL LIMIT 1;
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Invalid portal token'; END IF;

  UPDATE public.clients SET
    privacy_weight = p_privacy_weight,
    privacy_photos = p_privacy_photos,
    privacy_scans = p_privacy_scans
  WHERE id = v_client_id;

  RETURN true;
END;
$$;

-- RPC to update last_active_at when client uses portal
CREATE OR REPLACE FUNCTION public.update_portal_activity(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.clients SET last_active_at = now()
  WHERE portal_token = p_token AND portal_token IS NOT NULL;
END;
$$;

-- Notify trainer function (called by triggers)
CREATE OR REPLACE FUNCTION public.notify_trainer_on_body_scan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client record;
BEGIN
  SELECT c.name, c.trainer_id INTO v_client FROM public.clients c WHERE c.id = NEW.client_id;
  IF v_client.trainer_id IS NOT NULL THEN
    INSERT INTO public.trainer_notifications (trainer_id, client_id, type, title, body)
    VALUES (v_client.trainer_id, NEW.client_id, 'body_scan',
      v_client.name || ' سوى سكان جديد 📊',
      'BMI: ' || ROUND(NEW.bmi, 1) || ' | الدهون: ' || ROUND(NEW.body_fat, 1) || '%'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_trainer_body_scan
AFTER INSERT ON public.body_scans
FOR EACH ROW EXECUTE FUNCTION public.notify_trainer_on_body_scan();

-- Notify on progress photo
CREATE OR REPLACE FUNCTION public.notify_trainer_on_progress_photo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client record;
BEGIN
  SELECT c.name, c.trainer_id INTO v_client FROM public.clients c WHERE c.id = NEW.client_id;
  IF v_client.trainer_id IS NOT NULL THEN
    INSERT INTO public.trainer_notifications (trainer_id, client_id, type, title, body)
    VALUES (v_client.trainer_id, NEW.client_id, 'progress_photo',
      v_client.name || ' رفع صورة تقدم جديدة 📸', NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_trainer_progress_photo
AFTER INSERT ON public.progress_photos
FOR EACH ROW EXECUTE FUNCTION public.notify_trainer_on_progress_photo();

-- Notify on measurement
CREATE OR REPLACE FUNCTION public.notify_trainer_on_measurement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client record;
BEGIN
  SELECT c.name, c.trainer_id INTO v_client FROM public.clients c WHERE c.id = NEW.client_id;
  IF v_client.trainer_id IS NOT NULL THEN
    INSERT INTO public.trainer_notifications (trainer_id, client_id, type, title, body)
    VALUES (v_client.trainer_id, NEW.client_id, 'weight',
      v_client.name || ' سجّل وزنه: ' || ROUND(NEW.weight, 1) || ' كجم',
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_trainer_measurement
AFTER INSERT ON public.measurements
FOR EACH ROW EXECUTE FUNCTION public.notify_trainer_on_measurement();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.trainer_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.body_scans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.measurements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.progress_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_moods;
