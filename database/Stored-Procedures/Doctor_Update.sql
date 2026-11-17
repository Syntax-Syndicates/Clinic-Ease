-- Stored procedure for doctor.update.
DROP PROCEDURE IF EXISTS clinicease_doctor_update(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_doctor_update(
    IN p_id integer,
    IN p_first_name text,
    IN p_last_name text,
    IN p_specialization text,
    IN p_schedule text,
    IN p_contact_number text,
    IN p_email text,
    IN p_password_hash text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_user_id integer;
    v_doctor_record record;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'doctor', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'specialization', p_specialization, 'schedule', p_schedule, 'contact_number', p_contact_number, 'email', p_email),
        'password_hash', p_password_hash
    );
    SELECT d.user_id, d.email INTO v_doctor_record
    FROM doctors d
    WHERE d.id = (p_payload->>'id')::integer AND d.is_deleted = FALSE
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Doctor not found.' USING ERRCODE = 'P0002';
    END IF;
    UPDATE doctors SET
        first_name = p_payload->'doctor'->>'first_name',
        last_name = p_payload->'doctor'->>'last_name',
        specialization = p_payload->'doctor'->>'specialization',
        schedule = p_payload->'doctor'->>'schedule',
        contact_number = p_payload->'doctor'->>'contact_number',
        email = p_payload->'doctor'->>'email'
    WHERE id = (p_payload->>'id')::integer;
    IF v_doctor_record.user_id IS NOT NULL
       AND (v_doctor_record.email IS DISTINCT FROM p_payload->'doctor'->>'email'
            OR p_payload->>'password_hash' IS NOT NULL) THEN
        UPDATE users SET
            username = CASE
                WHEN v_doctor_record.email IS DISTINCT FROM p_payload->'doctor'->>'email'
                THEN p_payload->'doctor'->>'email' ELSE username
            END,
            password_hash = COALESCE(p_payload->>'password_hash', password_hash)
        WHERE id = v_doctor_record.user_id;
    ELSIF p_payload->>'password_hash' IS NOT NULL THEN
        INSERT INTO users (username, password_hash, role)
        VALUES (p_payload->'doctor'->>'email', p_payload->>'password_hash', 'doctor')
        RETURNING id INTO v_user_id;
        UPDATE doctors SET user_id = v_user_id WHERE id = (p_payload->>'id')::integer;
    END IF;
    result := to_jsonb(TRUE);
END;
$procedure$;
