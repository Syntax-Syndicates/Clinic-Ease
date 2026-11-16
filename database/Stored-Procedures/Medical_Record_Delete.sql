-- Stored procedure for medical_record.delete.
DROP PROCEDURE IF EXISTS clinicease_medical_record_delete(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_medical_record_delete(
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
    UPDATE medical_records SET is_deleted = TRUE WHERE id = (p_payload->>'id')::integer;
    result := to_jsonb(TRUE);
END;
$procedure$;
