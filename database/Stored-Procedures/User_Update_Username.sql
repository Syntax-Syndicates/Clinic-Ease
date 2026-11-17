-- Stored procedure for user.update_username.
DROP PROCEDURE IF EXISTS clinicease_user_update_username(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_user_update_username(
    IN p_id integer,
    IN p_username text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_user_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'username', p_username
    );
    UPDATE users SET username = p_payload->>'username'
    WHERE id = (p_payload->>'id')::integer
      AND role = 'doctor' AND is_deleted = FALSE
    RETURNING id INTO v_user_id;
    result := to_jsonb(v_user_id IS NOT NULL);
END;
$procedure$;
