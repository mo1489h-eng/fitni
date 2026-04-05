
-- vault_units: educational units per trainer
CREATE TABLE public.vault_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  unit_order integer NOT NULL DEFAULT 0,
  visibility text NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'basic', 'pro')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- vault_lessons: lessons within a unit
CREATE TABLE public.vault_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.vault_units(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_type text NOT NULL DEFAULT 'video' CHECK (content_type IN ('video', 'pdf', 'article')),
  content_url text,
  content_text text,
  lesson_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- vault_progress: client lesson completion tracking
CREATE TABLE public.vault_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.vault_lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, lesson_id)
);

-- RLS for vault_units
ALTER TABLE public.vault_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage own units" ON public.vault_units
  FOR ALL TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- RLS for vault_lessons
ALTER TABLE public.vault_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage own lessons" ON public.vault_lessons
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vault_units vu WHERE vu.id = unit_id AND vu.trainer_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vault_units vu WHERE vu.id = unit_id AND vu.trainer_id = auth.uid())
  );

-- RLS for vault_progress
ALTER TABLE public.vault_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage own progress" ON public.vault_progress
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.auth_user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.auth_user_id = auth.uid())
  );

-- Portal RPC: get vault units + lessons + progress for client
CREATE OR REPLACE FUNCTION public.get_portal_vault(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client record;
  v_result jsonb;
  v_plan text;
BEGIN
  SELECT c.id, COALESCE(p.subscription_plan, 'basic') as plan
  INTO v_client
  FROM public.clients c
  LEFT JOIN public.profiles p ON p.user_id = c.trainer_id
  WHERE c.portal_token = p_token AND c.portal_token IS NOT NULL
    AND (c.portal_token_expires_at IS NULL OR c.portal_token_expires_at > now())
  LIMIT 1;

  IF v_client.id IS NULL THEN RETURN '[]'::jsonb; END IF;
  v_plan := v_client.plan;

  SELECT COALESCE(jsonb_agg(unit_data ORDER BY vu.unit_order), '[]'::jsonb)
  INTO v_result
  FROM public.vault_units vu
  JOIN public.clients cl ON cl.id = v_client.id AND cl.trainer_id = vu.trainer_id
  CROSS JOIN LATERAL (
    SELECT jsonb_build_object(
      'id', vu.id,
      'title', vu.title,
      'description', vu.description,
      'lessons', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', vl.id,
            'title', vl.title,
            'content_type', vl.content_type,
            'content_url', vl.content_url,
            'content_text', vl.content_text,
            'lesson_order', vl.lesson_order,
            'completed', EXISTS(
              SELECT 1 FROM public.vault_progress vp
              WHERE vp.client_id = v_client.id AND vp.lesson_id = vl.id
            )
          ) ORDER BY vl.lesson_order
        )
        FROM public.vault_lessons vl WHERE vl.unit_id = vu.id
      ), '[]'::jsonb)
    ) AS unit_data
  ) sub
  WHERE vu.visibility = 'all'
    OR (vu.visibility = 'pro' AND v_plan = 'pro')
    OR (vu.visibility = 'basic' AND v_plan IN ('basic', 'pro'));

  RETURN v_result;
END;
$$;

-- Portal RPC: toggle lesson completion
CREATE OR REPLACE FUNCTION public.toggle_portal_vault_progress(p_token text, p_lesson_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client_id uuid;
  v_exists boolean;
BEGIN
  SELECT c.id INTO v_client_id FROM public.clients c
  WHERE c.portal_token = p_token AND c.portal_token IS NOT NULL
    AND (c.portal_token_expires_at IS NULL OR c.portal_token_expires_at > now())
  LIMIT 1;
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Invalid portal token'; END IF;

  -- Verify lesson belongs to client's trainer
  IF NOT EXISTS (
    SELECT 1 FROM public.vault_lessons vl
    JOIN public.vault_units vu ON vu.id = vl.unit_id
    JOIN public.clients cl ON cl.trainer_id = vu.trainer_id
    WHERE vl.id = p_lesson_id AND cl.id = v_client_id
  ) THEN RAISE EXCEPTION 'Lesson not found'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.vault_progress WHERE client_id = v_client_id AND lesson_id = p_lesson_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.vault_progress WHERE client_id = v_client_id AND lesson_id = p_lesson_id;
    RETURN false;
  ELSE
    INSERT INTO public.vault_progress (client_id, lesson_id) VALUES (v_client_id, p_lesson_id);
    RETURN true;
  END IF;
END;
$$;

-- Trigger: notify client when a new unit is created
CREATE OR REPLACE FUNCTION public.notify_clients_on_vault_unit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_client record;
BEGIN
  FOR v_client IN
    SELECT id FROM public.clients WHERE trainer_id = NEW.trainer_id
  LOOP
    INSERT INTO public.client_notifications (client_id, type, title, body)
    VALUES (v_client.id, 'vault', 'مكتبتك جاهزة — ابدأ رحلتك من هنا', 'تم اضافة وحدة جديدة: ' || NEW.title);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_vault_unit_created
  AFTER INSERT ON public.vault_units
  FOR EACH ROW EXECUTE FUNCTION public.notify_clients_on_vault_unit();
