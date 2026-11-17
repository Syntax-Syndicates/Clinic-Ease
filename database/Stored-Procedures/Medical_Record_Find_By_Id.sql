-- Stored procedure for medical_record.find_by_id.
DROP PROCEDURE IF EXISTS clinicease_medical_record_find_by_id(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_medical_record_find_by_id(
    IN p_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id
    );
    SELECT to_jsonb(mr) INTO result FROM medical_records mr
    WHERE mr.id = (p_payload->>'id')::integer AND mr.is_deleted = FALSE;
END;
$procedure$;
