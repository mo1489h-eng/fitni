CREATE OR REPLACE FUNCTION public.create_client_matches(
  p_intake_id uuid,
  p_matches jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match jsonb;
  v_inserted_count integer := 0;
BEGIN
  IF p_intake_id IS NULL THEN
    RAISE EXCEPTION 'Missing intake id';
  END IF;

  IF p_matches IS NULL OR jsonb_typeof(p_matches) <> 'array' THEN
    RAISE EXCEPTION 'Matches payload must be an array';
  END IF;

  IF jsonb_array_length(p_matches) > 10 THEN
    RAISE EXCEPTION 'Too many matches requested';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.client_intakes ci WHERE ci.id = p_intake_id
  ) THEN
    RAISE EXCEPTION 'Intake not found';
  END IF;

  FOR v_match IN SELECT * FROM jsonb_array_elements(p_matches)
  LOOP
    IF (v_match->>'trainer_id') IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.trainer_discovery_profiles tdp
      WHERE tdp.trainer_id = (v_match->>'trainer_id')::uuid
        AND tdp.is_discoverable = true
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.client_matches (intake_id, trainer_id, match_score, status)
    VALUES (
      p_intake_id,
      (v_match->>'trainer_id')::uuid,
      COALESCE((v_match->>'score')::numeric, 0),
      'pending'
    )
    ON CONFLICT DO NOTHING;

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN v_inserted_count;
END;
$$;