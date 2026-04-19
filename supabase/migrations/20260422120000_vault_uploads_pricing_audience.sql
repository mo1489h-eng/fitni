-- Educational vault: lesson file metadata, unit pricing/audience, purchases, storage, RPC updates

-- ── vault_lessons: uploaded files + embed URL ─────────────────────────────
ALTER TABLE public.vault_lessons
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.vault_lessons DROP CONSTRAINT IF EXISTS vault_lessons_content_type_check;
ALTER TABLE public.vault_lessons
  ADD CONSTRAINT vault_lessons_content_type_check
  CHECK (content_type IN ('video', 'pdf', 'article', 'image'));

-- ── vault_units: pricing + audience ────────────────────────────────────────
ALTER TABLE public.vault_units
  ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'my_clients';

ALTER TABLE public.vault_units DROP CONSTRAINT IF EXISTS vault_units_audience_check;
ALTER TABLE public.vault_units
  ADD CONSTRAINT vault_units_audience_check
  CHECK (audience IN ('my_clients', 'platform'));

-- ── tap settlements: vault_sale ───────────────────────────────────────────
ALTER TABLE public.tap_wallet_settlements DROP CONSTRAINT IF EXISTS tap_wallet_settlements_kind_check;
ALTER TABLE public.tap_wallet_settlements
  ADD CONSTRAINT tap_wallet_settlements_kind_check
  CHECK (kind IN ('program_sale', 'subscription', 'vault_sale'));

-- ── vault_purchases ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vault_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.vault_units(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  tap_charge_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS vault_purchases_buyer_id_idx ON public.vault_purchases (buyer_id);
CREATE INDEX IF NOT EXISTS vault_purchases_unit_id_idx ON public.vault_purchases (unit_id);

ALTER TABLE public.vault_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers read own vault purchases"
  ON public.vault_purchases FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Trainers read vault purchases for their units"
  ON public.vault_purchases FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vault_units vu WHERE vu.id = unit_id AND vu.trainer_id = auth.uid())
  );

CREATE POLICY "Service role full vault_purchases"
  ON public.vault_purchases FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Read platform vault units (discovery) ───────────────────────────────────
CREATE POLICY "Authenticated read platform vault units"
  ON public.vault_units FOR SELECT TO authenticated
  USING (audience = 'platform');

-- ── Read lessons for platform-published units ──────────────────────────────
CREATE POLICY "Authenticated read platform vault lessons"
  ON public.vault_lessons FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vault_units vu WHERE vu.id = unit_id AND vu.audience = 'platform')
  );

-- ── Storage: vault-content (max sizes enforced in app; bucket is public read) ─
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault-content', 'vault-content', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Trainers upload vault content to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vault-content'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Trainers update own vault content"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'vault-content'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Trainers delete own vault content"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'vault-content'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public read vault content"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vault-content');

-- ── get_portal_vault: pricing, audience, locks, lesson file fields ──────────
CREATE OR REPLACE FUNCTION public.get_portal_vault(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.portal_token = p_token
      AND c.portal_token IS NOT NULL
      AND (c.portal_token_expires_at IS NULL OR c.portal_token_expires_at > now())
      AND c.auth_user_id IS NOT NULL
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT agg.j INTO v_result
  FROM (
    WITH ctx AS (
      SELECT
        c.id AS client_id,
        c.trainer_id AS trainer_id,
        c.auth_user_id AS buyer_id,
        COALESCE(p.subscription_plan, 'basic') AS plan,
        c.created_at::date AS joined_date
      FROM public.clients c
      LEFT JOIN public.profiles p ON p.user_id = c.trainer_id
      WHERE c.portal_token = p_token
        AND c.portal_token IS NOT NULL
        AND (c.portal_token_expires_at IS NULL OR c.portal_token_expires_at > now())
      LIMIT 1
    ),
    candidates AS (
      SELECT vu.*, 0 AS sort_group
      FROM public.vault_units vu, ctx
      WHERE vu.trainer_id = ctx.trainer_id
        AND (vu.visibility = 'all'
          OR (vu.visibility = 'pro' AND ctx.plan = 'pro')
          OR (vu.visibility = 'basic' AND ctx.plan IN ('basic', 'pro')))
        AND vu.audience IN ('my_clients', 'platform')
      UNION ALL
      SELECT vu.*, 1 AS sort_group
      FROM public.vault_units vu, ctx
      WHERE vu.audience = 'platform'
        AND vu.trainer_id <> ctx.trainer_id
    ),
    dedup AS (
      SELECT DISTINCT ON (id) *
      FROM candidates
      ORDER BY id, sort_group ASC
    ),
    enriched AS (
      SELECT
        d.*,
        (
          COALESCE(d.is_free, true)
          OR COALESCE(d.price, 0) <= 0
          OR EXISTS (
            SELECT 1 FROM public.vault_purchases vp
            WHERE vp.unit_id = d.id AND vp.buyer_id = (SELECT buyer_id FROM ctx)
          )
        ) AS purchased,
        CASE
          WHEN d.lock_type = 'days' AND COALESCE(d.lock_days, 0) > 0 THEN
            (CURRENT_DATE - (SELECT joined_date FROM ctx)) < d.lock_days
          WHEN d.lock_type = 'unit' AND d.lock_after_unit_id IS NOT NULL THEN
            EXISTS (
              SELECT 1 FROM public.vault_lessons vl
              WHERE vl.unit_id = d.lock_after_unit_id
                AND NOT EXISTS (
                  SELECT 1 FROM public.vault_progress vp
                  WHERE vp.client_id = (SELECT client_id FROM ctx)
                    AND vp.lesson_id = vl.id
                )
            )
          ELSE false
        END AS time_locked
      FROM dedup d
    ),
    final AS (
      SELECT
        e.*,
        (NOT e.purchased AND NOT (COALESCE(e.is_free, true) OR COALESCE(e.price, 0) <= 0)) AS pay_locked,
        (e.time_locked OR (NOT e.purchased AND NOT (COALESCE(e.is_free, true) OR COALESCE(e.price, 0) <= 0))) AS locked
      FROM enriched e
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'title', f.title,
          'description', f.description,
          'cover_image_url', f.cover_image_url,
          'lock_type', f.lock_type,
          'lock_days', f.lock_days,
          'lock_after_unit_id', f.lock_after_unit_id,
          'visibility', f.visibility,
          'trainer_id', f.trainer_id,
          'audience', f.audience,
          'is_free', f.is_free,
          'price', f.price,
          'purchased', f.purchased,
          'time_locked', f.time_locked,
          'pay_locked', f.pay_locked,
          'locked', f.locked,
          'lessons', CASE
            WHEN f.locked THEN '[]'::jsonb
            ELSE COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', vl.id,
                  'title', vl.title,
                  'content_type', vl.content_type,
                  'content_url', vl.content_url,
                  'content_text', vl.content_text,
                  'lesson_order', vl.lesson_order,
                  'file_url', vl.file_url,
                  'file_type', vl.file_type,
                  'file_size', vl.file_size,
                  'video_url', vl.video_url,
                  'completed', EXISTS (
                    SELECT 1 FROM public.vault_progress vp
                    WHERE vp.client_id = (SELECT client_id FROM ctx)
                      AND vp.lesson_id = vl.id
                  )
                ) ORDER BY vl.lesson_order
              )
              FROM public.vault_lessons vl
              WHERE vl.unit_id = f.id
            ), '[]'::jsonb)
          END
        )
        ORDER BY f.sort_group, f.unit_order, f.created_at
      ),
      '[]'::jsonb
    ) AS j
    FROM final f
  ) agg;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ── toggle_portal_vault_progress: block unpaid paid units ───────────────────
CREATE OR REPLACE FUNCTION public.toggle_portal_vault_progress(p_token text, p_lesson_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.portal_token = p_token
      AND c.portal_token IS NOT NULL
      AND (c.portal_token_expires_at IS NULL OR c.portal_token_expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Invalid portal token';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vault_lessons vl
    JOIN public.vault_units vu ON vu.id = vl.unit_id
    JOIN public.clients c ON c.portal_token = p_token
      AND c.portal_token IS NOT NULL
      AND (c.portal_token_expires_at IS NULL OR c.portal_token_expires_at > now())
    WHERE vl.id = p_lesson_id
      AND (
        vu.trainer_id = c.trainer_id
        OR vu.audience = 'platform'
      )
  ) THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.vault_lessons vl
    JOIN public.vault_units vu ON vu.id = vl.unit_id
    JOIN public.clients c ON c.portal_token = p_token
      AND c.portal_token IS NOT NULL
      AND (c.portal_token_expires_at IS NULL OR c.portal_token_expires_at > now())
    WHERE vl.id = p_lesson_id
      AND NOT (COALESCE(vu.is_free, true) OR COALESCE(vu.price, 0) <= 0)
      AND NOT EXISTS (
        SELECT 1 FROM public.vault_purchases vp
        WHERE vp.unit_id = vu.id AND vp.buyer_id = c.auth_user_id
      )
  ) THEN
    RAISE EXCEPTION 'Payment required for this unit';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.vault_progress vp
    JOIN public.clients c ON c.id = vp.client_id
      AND c.portal_token = p_token
      AND c.portal_token IS NOT NULL
      AND (c.portal_token_expires_at IS NULL OR c.portal_token_expires_at > now())
    WHERE vp.lesson_id = p_lesson_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.vault_progress vp
    USING public.clients c
    WHERE vp.client_id = c.id
      AND vp.lesson_id = p_lesson_id
      AND c.portal_token = p_token
      AND c.portal_token IS NOT NULL
      AND (c.portal_token_expires_at IS NULL OR c.portal_token_expires_at > now());
    RETURN false;
  ELSE
    INSERT INTO public.vault_progress (client_id, lesson_id)
    SELECT c.id, p_lesson_id FROM public.clients c
    WHERE c.portal_token = p_token
      AND c.portal_token IS NOT NULL
      AND (c.portal_token_expires_at IS NULL OR c.portal_token_expires_at > now())
    LIMIT 1;
    RETURN true;
  END IF;
END;
$$;
