-- Stored procedure for doctor.delete.
DROP PROCEDURE IF EXISTS clinicease_doctor_delete(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_doctor_delete(
    IN p_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_user_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id
    );
    UPDATE doctors SET is_deleted = TRUE, is_active = FALSE
    WHERE id = (p_payload->>'id')::integer
    RETURNING user_id INTO v_user_id;
    IF v_user_id IS NOT NULL THEN
        UPDATE users SET is_deleted = TRUE WHERE id = v_user_id;
    END IF;
    result := to_jsonb(TRUE);
END;
$procedure$;
