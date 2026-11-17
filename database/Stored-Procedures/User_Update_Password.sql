-- Stored procedure for user.update_password.
DROP PROCEDURE IF EXISTS clinicease_user_update_password(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_user_update_password(
    IN p_id integer,
    IN p_password_hash text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'password_hash', p_password_hash
    );
    UPDATE users SET password_hash = p_payload->>'password_hash'
    WHERE id = (p_payload->>'id')::integer;
    result := to_jsonb(TRUE);
END;
$procedure$;
