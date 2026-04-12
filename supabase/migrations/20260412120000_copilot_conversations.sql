-- CoachBase AI Copilot: persisted chat per user + optional client scope
CREATE TABLE IF NOT EXISTS public.copilot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('trainer', 'client')),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS copilot_conversations_user_role_client_scope
  ON public.copilot_conversations (user_id, role, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS copilot_conversations_user_id_idx ON public.copilot_conversations (user_id);

ALTER TABLE public.copilot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own copilot conversations"
  ON public.copilot_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own copilot conversations"
  ON public.copilot_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own copilot conversations"
  ON public.copilot_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own copilot conversations"
  ON public.copilot_conversations FOR DELETE
  USING (auth.uid() = user_id);
