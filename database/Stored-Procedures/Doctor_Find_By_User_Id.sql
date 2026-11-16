-- Stored procedure for doctor.find_by_user_id.
DROP PROCEDURE IF EXISTS clinicease_doctor_find_by_user_id(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_doctor_find_by_user_id(
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
    SELECT jsonb_build_object('id', id, 'first_name', first_name, 'last_name', last_name)
    INTO result
    FROM doctors WHERE user_id = (p_payload->>'user_id')::integer
      AND is_deleted = FALSE AND is_active = TRUE;
END;
$procedure$;
