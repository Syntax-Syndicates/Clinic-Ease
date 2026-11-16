-- Stored procedure for doctor.find_by_id.
DROP PROCEDURE IF EXISTS clinicease_doctor_find_by_id(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_doctor_find_by_id(
    IN p_id integer,
    IN p_include_inactive boolean,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'include_inactive', p_include_inactive
    );
    SELECT to_jsonb(row_data) INTO result
    FROM (
        SELECT id, first_name, last_name, specialization, schedule, contact_number,
               email, is_active, is_deleted, (user_id IS NOT NULL) AS has_account
        FROM doctors
        WHERE id = (p_payload->>'id')::integer AND is_deleted = FALSE
          AND (COALESCE((p_payload->>'include_inactive')::boolean, FALSE) OR is_active = TRUE)
    ) row_data;
END;
$procedure$;
