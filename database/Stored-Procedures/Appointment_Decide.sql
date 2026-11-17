-- Stored procedure for appointment.decide.
DROP PROCEDURE IF EXISTS clinicease_appointment_decide(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_appointment_decide(
    IN p_id integer,
    IN p_doctor_id integer,
    IN p_status text,
    IN p_rejection_reason text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_appointment_id integer;
    v_appointment_record record;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'doctor_id', p_doctor_id,
        'status', p_status,
        'rejection_reason', p_rejection_reason
    );
    UPDATE appointments SET status = p_payload->>'status',
        rejection_reason = p_payload->>'rejection_reason'
    WHERE id = (p_payload->>'id')::integer
      AND doctor_id = (p_payload->>'doctor_id')::integer
      AND status = 'pending' AND is_deleted = FALSE
    RETURNING id INTO v_appointment_id;
    IF v_appointment_id IS NOT NULL THEN
        result := to_jsonb('updated'::text);
    ELSE
        SELECT doctor_id, status INTO v_appointment_record
        FROM appointments WHERE id = (p_payload->>'id')::integer AND is_deleted = FALSE;
        IF NOT FOUND THEN
            result := to_jsonb('not_found'::text);
        ELSIF v_appointment_record.doctor_id <> (p_payload->>'doctor_id')::integer THEN
            result := to_jsonb('forbidden'::text);
        ELSE
            result := to_jsonb('not_pending'::text);
        END IF;
    END IF;
END;
$procedure$;
