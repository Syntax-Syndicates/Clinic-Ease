-- Stored procedure for appointment.cancel.
DROP PROCEDURE IF EXISTS clinicease_appointment_cancel(integer, integer);
CREATE OR REPLACE PROCEDURE clinicease_appointment_cancel(
    IN p_id integer,
    IN p_patient_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_patient_id integer;
    v_appointment_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'patient_id', p_patient_id
    );
    UPDATE appointments SET status = 'cancelled'
    WHERE id = (p_payload->>'id')::integer
      AND ((p_payload->>'patient_id') IS NULL OR patient_id = (p_payload->>'patient_id')::integer)
      AND is_deleted = FALSE AND status IN ('pending', 'approved')
    RETURNING id INTO v_appointment_id;
    IF v_appointment_id IS NOT NULL THEN
        result := to_jsonb('cancelled'::text);
    ELSE
        SELECT patient_id INTO v_patient_id FROM appointments
        WHERE id = (p_payload->>'id')::integer AND is_deleted = FALSE;
        IF NOT FOUND THEN
            result := to_jsonb('not_found'::text);
        ELSIF p_payload->>'patient_id' IS NOT NULL
              AND v_patient_id <> (p_payload->>'patient_id')::integer THEN
            result := to_jsonb('forbidden'::text);
        ELSE
            result := to_jsonb('not_cancellable'::text);
        END IF;
    END IF;
END;
$procedure$;
