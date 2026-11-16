-- Stored procedure for medical_record.find_by_appointment.
DROP PROCEDURE IF EXISTS clinicease_medical_record_find_by_appointment(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_medical_record_find_by_appointment(
    IN p_appointment_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'appointment_id', p_appointment_id
    );
    SELECT to_jsonb(mr) INTO result FROM medical_records mr
    WHERE mr.appointment_id = (p_payload->>'appointment_id')::integer AND mr.is_deleted = FALSE;
END;
$procedure$;
