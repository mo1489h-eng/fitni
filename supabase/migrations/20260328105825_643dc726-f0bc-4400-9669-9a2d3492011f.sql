
-- Client notifications table
CREATE TABLE public.client_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;

-- Clients can read own notifications via auth
CREATE POLICY "Clients can read own notifications" ON public.client_notifications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_notifications.client_id AND c.auth_user_id = auth.uid()));

-- Clients can update own notifications (mark read)
CREATE POLICY "Clients can update own notifications" ON public.client_notifications
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_notifications.client_id AND c.auth_user_id = auth.uid()));

-- Trainers can read their client notifications
CREATE POLICY "Trainers can read client notifications" ON public.client_notifications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_notifications.client_id AND c.trainer_id = auth.uid()));

-- Enable realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.client_notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.trainer_notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Trigger: notify client when program is assigned/changed
CREATE OR REPLACE FUNCTION public.notify_client_on_program_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.program_id IS DISTINCT FROM OLD.program_id AND NEW.program_id IS NOT NULL THEN
    INSERT INTO public.client_notifications (client_id, type, title, body)
    VALUES (NEW.id, 'program', 'مدربك أضاف برنامج تدريبي جديد', 'تم تعيين برنامج تدريبي جديد لك');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_client_program_change
  AFTER UPDATE OF program_id ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.notify_client_on_program_change();

-- Trigger: notify client when exercises are modified  
CREATE OR REPLACE FUNCTION public.notify_client_on_exercise_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_program_id uuid;
  v_client record;
BEGIN
  SELECT pd.program_id INTO v_program_id FROM public.program_days pd WHERE pd.id = COALESCE(NEW.day_id, OLD.day_id);
  IF v_program_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  
  FOR v_client IN SELECT id FROM public.clients WHERE program_id = v_program_id LOOP
    INSERT INTO public.client_notifications (client_id, type, title)
    VALUES (v_client.id, 'program_update', 'تم تحديث برنامجك التدريبي');
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_exercise_change_notify_client
  AFTER INSERT OR UPDATE OR DELETE ON public.program_exercises
  FOR EACH ROW EXECUTE FUNCTION public.notify_client_on_exercise_change();

-- Trigger: notify trainer when workout session is completed
CREATE OR REPLACE FUNCTION public.notify_trainer_on_workout_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client record;
BEGIN
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    SELECT c.name, c.trainer_id INTO v_client FROM public.clients c WHERE c.id = NEW.client_id;
    IF v_client.trainer_id IS NOT NULL THEN
      INSERT INTO public.trainer_notifications (trainer_id, client_id, type, title, body)
      VALUES (v_client.trainer_id, NEW.client_id, 'workout',
        v_client.name || ' أكمل جلسة اليوم',
        'المدة: ' || COALESCE(NEW.duration_minutes, 0) || ' دقيقة | الحجم: ' || COALESCE(NEW.total_volume, 0)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workout_session_complete
  AFTER UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.notify_trainer_on_workout_complete();

-- RPC to get client notifications via portal token
CREATE OR REPLACE FUNCTION public.get_portal_notifications(p_token text, p_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
  
  IF v_client_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  
  SELECT COALESCE(jsonb_agg(row_to_json(n) ORDER BY n.created_at DESC), '[]'::jsonb) INTO v_result
  FROM (SELECT * FROM public.client_notifications WHERE client_id = v_client_id ORDER BY created_at DESC LIMIT p_limit) n;
  
  RETURN v_result;
END;
$$;

-- RPC to mark client notifications as read via portal token
CREATE OR REPLACE FUNCTION public.mark_portal_notifications_read(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
  WHERE portal_token = p_token AND portal_token IS NOT NULL
    AND (portal_token_expires_at IS NULL OR portal_token_expires_at > now())
  LIMIT 1;
  
  IF v_client_id IS NULL THEN RETURN false; END IF;
  
  UPDATE public.client_notifications SET is_read = true WHERE client_id = v_client_id AND is_read = false;
  RETURN true;
END;
$$;
