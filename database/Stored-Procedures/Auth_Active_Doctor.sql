-- Stored procedure for auth.active_doctor.
DROP PROCEDURE IF EXISTS clinicease_auth_active_doctor(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_auth_active_doctor(
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
    SELECT jsonb_build_object('id', d.id) INTO result
    FROM doctors d JOIN users u ON u.id = d.user_id
    WHERE u.id = (p_payload->>'user_id')::integer
      AND u.is_deleted = FALSE AND d.is_deleted = FALSE AND d.is_active = TRUE;
END;
$procedure$;
