-- Stored procedure for auth.register_patient.
DROP PROCEDURE IF EXISTS clinicease_auth_register_patient(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_auth_register_patient(
    IN p_username text,
    IN p_password_hash text,
    IN p_first_name text,
    IN p_last_name text,
    IN p_date_of_birth date,
    IN p_gender text,
    IN p_address text,
    IN p_contact_number text,
    IN p_email text,
    IN p_blood_type text,
    IN p_allergies text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_user_id integer;
    v_patient_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'username', p_username,
        'password_hash', p_password_hash,
        'patient', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'date_of_birth', p_date_of_birth, 'gender', p_gender, 'address', p_address, 'contact_number', p_contact_number, 'email', p_email, 'blood_type', p_blood_type, 'allergies', p_allergies)
    );
    INSERT INTO users (username, password_hash, role)
    VALUES (p_payload->>'username', p_payload->>'password_hash', 'patient')
    RETURNING id INTO v_user_id;
    INSERT INTO patients (
        user_id, first_name, last_name, date_of_birth, gender, address,
        contact_number, email, blood_type, allergies
    )
    VALUES (
        v_user_id,
        p_payload->'patient'->>'first_name',
        p_payload->'patient'->>'last_name',
        (p_payload->'patient'->>'date_of_birth')::date,
        p_payload->'patient'->>'gender',
        p_payload->'patient'->>'address',
        p_payload->'patient'->>'contact_number',
        p_payload->'patient'->>'email',
        p_payload->'patient'->>'blood_type',
        p_payload->'patient'->>'allergies'
    )
    RETURNING id INTO v_patient_id;
    result := jsonb_build_object('user_id', v_user_id, 'patient_id', v_patient_id);
END;
$procedure$;
