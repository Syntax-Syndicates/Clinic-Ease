-- Stored procedure for user.create.
DROP PROCEDURE IF EXISTS clinicease_user_create(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_user_create(
    IN p_username text,
    IN p_password_hash text,
    IN p_role text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_user_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'username', p_username,
        'password_hash', p_password_hash,
        'role', p_role
    );
    INSERT INTO users (username, password_hash, role)
    VALUES (p_payload->>'username', p_payload->>'password_hash', p_payload->>'role')
    RETURNING id INTO v_user_id;
    result := to_jsonb(v_user_id);
END;
$procedure$;
