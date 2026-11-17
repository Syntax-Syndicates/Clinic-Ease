-- Stored procedure for patient.find_by_user_id.
DROP PROCEDURE IF EXISTS clinicease_patient_find_by_user_id(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_patient_find_by_user_id(
    IN p_user_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'user_id', p_user_id
    );
    SELECT to_jsonb(p) INTO result FROM patients p
    WHERE p.user_id = (p_payload->>'user_id')::integer AND p.is_deleted = FALSE;
END;
$procedure$;
