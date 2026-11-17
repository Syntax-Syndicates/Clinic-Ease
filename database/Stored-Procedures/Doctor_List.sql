-- Stored procedure for doctor.list.
DROP PROCEDURE IF EXISTS clinicease_doctor_list(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_doctor_list(
    IN p_include_inactive boolean,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'include_inactive', p_include_inactive
    );
    SELECT COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.id), '[]'::jsonb)
    INTO result
    FROM (
        SELECT id, first_name, last_name, specialization, schedule, contact_number,
               email, is_active, is_deleted, (user_id IS NOT NULL) AS has_account
        FROM doctors
        WHERE is_deleted = FALSE
          AND (COALESCE((p_payload->>'include_inactive')::boolean, FALSE) OR is_active = TRUE)
    ) row_data;
END;
$procedure$;
