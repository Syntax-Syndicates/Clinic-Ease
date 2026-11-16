-- Stored procedure for user.find_by_id.
DROP PROCEDURE IF EXISTS clinicease_user_find_by_id(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_user_find_by_id(
    IN p_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id
    );
    SELECT to_jsonb(u) INTO result FROM users u
    WHERE u.id = (p_payload->>'id')::integer AND u.is_deleted = FALSE;
END;
$procedure$;
