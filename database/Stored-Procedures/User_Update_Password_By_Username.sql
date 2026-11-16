-- Stored procedure for user.update_password_by_username.
DROP PROCEDURE IF EXISTS clinicease_user_update_password_by_username(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_user_update_password_by_username(
    IN p_password_hash text,
    IN p_username text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'password_hash', p_password_hash,
        'username', p_username
    );
    UPDATE users SET password_hash = p_payload->>'password_hash'
    WHERE username = p_payload->>'username';
    result := to_jsonb(TRUE);
END;
$procedure$;
