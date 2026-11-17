-- Stored procedure for doctor.create.
DROP PROCEDURE IF EXISTS clinicease_doctor_create(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_doctor_create(
    IN p_password_hash text,
    IN p_first_name text,
    IN p_last_name text,
    IN p_specialization text,
    IN p_schedule text,
    IN p_contact_number text,
    IN p_email text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_user_id integer;
    v_doctor_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'password_hash', p_password_hash,
        'doctor', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'specialization', p_specialization, 'schedule', p_schedule, 'contact_number', p_contact_number, 'email', p_email)
    );
    INSERT INTO users (username, password_hash, role)
    VALUES (p_payload->'doctor'->>'email', p_payload->>'password_hash', 'doctor')
    RETURNING id INTO v_user_id;
    INSERT INTO doctors (
        user_id, first_name, last_name, specialization, schedule, contact_number, email
    )
    VALUES (
        v_user_id,
        p_payload->'doctor'->>'first_name',
        p_payload->'doctor'->>'last_name',
        p_payload->'doctor'->>'specialization',
        p_payload->'doctor'->>'schedule',
        p_payload->'doctor'->>'contact_number',
        p_payload->'doctor'->>'email'
    )
    RETURNING id INTO v_doctor_id;
    result := to_jsonb(v_doctor_id);
END;
$procedure$;
