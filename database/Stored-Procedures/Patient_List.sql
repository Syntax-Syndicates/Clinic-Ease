-- Stored procedure for patient.list.
DROP PROCEDURE IF EXISTS clinicease_patient_list(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_patient_list(
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := '{}'::jsonb;
    SELECT COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.id), '[]'::jsonb)
    INTO result
    FROM (
        SELECT p.*, u.username
        FROM patients p JOIN users u ON p.user_id = u.id
        WHERE p.is_deleted = FALSE AND u.is_deleted = FALSE
    ) row_data;
END;
$procedure$;
