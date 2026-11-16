-- Stored procedure for doctor.set_active.
DROP PROCEDURE IF EXISTS clinicease_doctor_set_active(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_doctor_set_active(
    IN p_id integer,
    IN p_is_active boolean,
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
        'is_active', p_is_active
    );
    UPDATE doctors SET is_active = (p_payload->>'is_active')::boolean
    WHERE id = (p_payload->>'id')::integer AND is_deleted = FALSE
    RETURNING user_id INTO v_user_id;
    IF NOT FOUND THEN
        result := to_jsonb(FALSE);
    ELSE
        IF v_user_id IS NOT NULL THEN
            UPDATE users SET is_deleted = NOT (p_payload->>'is_active')::boolean
            WHERE id = v_user_id;
        END IF;
        result := to_jsonb(TRUE);
    END IF;
END;
$procedure$;
