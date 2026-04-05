
-- Function to create session reminder notifications for tomorrow's sessions
CREATE OR REPLACE FUNCTION public.create_session_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_session record;
BEGIN
  -- Find all sessions scheduled for tomorrow that are not completed
  FOR v_session IN
    SELECT ts.id, ts.client_id, ts.session_date, ts.start_time, ts.session_type, c.name as client_name
    FROM trainer_sessions ts
    JOIN clients c ON c.id = ts.client_id
    WHERE ts.session_date = CURRENT_DATE + interval '1 day'
      AND ts.is_completed = false
      -- Avoid duplicate reminders: check if notification already sent today
      AND NOT EXISTS (
        SELECT 1 FROM client_notifications cn
        WHERE cn.client_id = ts.client_id
          AND cn.type = 'session_reminder'
          AND cn.created_at::date = CURRENT_DATE
          AND cn.title LIKE '%' || ts.session_type || '%'
      )
  LOOP
    -- Insert notification for the client
    INSERT INTO client_notifications (client_id, type, title, body)
    VALUES (
      v_session.client_id,
      'session_reminder',
      'تذكير: لديك جلسة ' || v_session.session_type || ' غداً',
      'موعد الجلسة: ' || v_session.start_time::time(0)::text || ' - ' || 
      to_char(v_session.session_date, 'YYYY-MM-DD')
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
