-- Stored procedure for appointment.availability_inputs.
DROP PROCEDURE IF EXISTS clinicease_appointment_availability_inputs(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_appointment_availability_inputs(
    IN p_doctor_id integer,
    IN p_date date,
    IN p_exclude_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_doctor_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'doctor_id', p_doctor_id,
        'date', p_date,
        'exclude_id', p_exclude_id
    );
    SELECT d.id INTO v_doctor_id FROM doctors d
    WHERE d.id = (p_payload->>'doctor_id')::integer
      AND d.is_deleted = FALSE AND d.is_active = TRUE;
    IF NOT FOUND THEN
        result := NULL;
    ELSE
        SELECT jsonb_build_object(
            'schedule', d.schedule,
            'schedule_configured', d.schedule_configured,
            'appointment_duration_minutes', d.appointment_duration_minutes,
            'working_hours', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'weekday', s.weekday,
                    'start_time', s.start_time,
                    'end_time', s.end_time
                ) ORDER BY s.weekday, s.start_time)
                FROM doctor_schedules s
                WHERE s.doctor_id = d.id
            ), '[]'::jsonb),
            'unavailable_dates', CASE WHEN EXISTS (
                SELECT 1 FROM doctor_unavailability u
                WHERE u.doctor_id = d.id
                  AND u.unavailable_date = (p_payload->>'date')::date
            ) THEN jsonb_build_array((p_payload->>'date')::date) ELSE '[]'::jsonb END,
            'appointment_times', COALESCE(jsonb_agg(a.appointment_time ORDER BY a.appointment_time)
                FILTER (WHERE a.id IS NOT NULL), '[]'::jsonb)
        )
        INTO result
        FROM doctors d
        LEFT JOIN appointments a
          ON a.doctor_id = d.id
         AND a.appointment_date = (p_payload->>'date')::date
         AND (p_payload->>'exclude_id' IS NULL OR a.id <> (p_payload->>'exclude_id')::integer)
         AND a.is_deleted = FALSE AND a.status NOT IN ('cancelled', 'rejected')
        WHERE d.id = v_doctor_id
        GROUP BY d.id;
    END IF;
END;
$procedure$;
