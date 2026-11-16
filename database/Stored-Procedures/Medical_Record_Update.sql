-- Stored procedure for medical_record.update.
DROP PROCEDURE IF EXISTS clinicease_medical_record_update(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_medical_record_update(
    IN p_id integer,
    IN p_diagnosis text,
    IN p_prescription text,
    IN p_consultation_notes text,
    IN p_follow_up_date date,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'diagnosis', p_diagnosis,
        'prescription', p_prescription,
        'consultation_notes', p_consultation_notes,
        'follow_up_date', p_follow_up_date
    );
    UPDATE medical_records SET
        diagnosis = p_payload->>'diagnosis',
        prescription = p_payload->>'prescription',
        consultation_notes = p_payload->>'consultation_notes',
        follow_up_date = (p_payload->>'follow_up_date')::date
    WHERE id = (p_payload->>'id')::integer;
    result := to_jsonb(TRUE);
END;
$procedure$;
