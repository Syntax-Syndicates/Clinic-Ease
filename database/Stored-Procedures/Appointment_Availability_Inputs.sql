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
    v_schedule text;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'doctor_id', p_doctor_id,
        'date', p_date,
        'exclude_id', p_exclude_id
    );
    SELECT d.schedule INTO v_schedule FROM doctors d
    WHERE d.id = (p_payload->>'doctor_id')::integer
      AND d.is_deleted = FALSE AND d.is_active = TRUE;
    IF NOT FOUND THEN
        result := NULL;
    ELSE
        SELECT jsonb_build_object(
            'schedule', v_schedule,
            'appointment_times', COALESCE(jsonb_agg(a.appointment_time ORDER BY a.appointment_time)
                FILTER (WHERE a.id IS NOT NULL), '[]'::jsonb)
        )
        INTO result
        FROM appointments a
        WHERE a.doctor_id = (p_payload->>'doctor_id')::integer
          AND a.appointment_date = (p_payload->>'date')::date
          AND (p_payload->>'exclude_id' IS NULL OR a.id <> (p_payload->>'exclude_id')::integer)
          AND a.is_deleted = FALSE AND a.status NOT IN ('cancelled', 'rejected');
    END IF;
END;
$procedure$;
