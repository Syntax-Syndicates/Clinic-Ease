-- Stored procedure for user.find_by_username.
DROP PROCEDURE IF EXISTS clinicease_user_find_by_username(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_user_find_by_username(
    IN p_username text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'username', p_username
    );
    SELECT to_jsonb(u) INTO result FROM users u
    WHERE u.username = p_payload->>'username' AND u.is_deleted = FALSE;
END;
$procedure$;
