-- Stored procedure for patient.find_by_id.
DROP PROCEDURE IF EXISTS clinicease_patient_find_by_id(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_patient_find_by_id(
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
    SELECT to_jsonb(row_data) INTO result
    FROM (
        SELECT p.*, u.username
        FROM patients p JOIN users u ON p.user_id = u.id
        WHERE p.id = (p_payload->>'id')::integer AND p.is_deleted = FALSE
    ) row_data;
END;
$procedure$;
