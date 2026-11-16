-- Stored procedure for patient.create.
DROP PROCEDURE IF EXISTS clinicease_patient_create(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_patient_create(
    IN p_user_id integer,
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
    v_patient_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'user_id', p_user_id,
        'patient', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'date_of_birth', p_date_of_birth, 'gender', p_gender, 'address', p_address, 'contact_number', p_contact_number, 'email', p_email, 'blood_type', p_blood_type, 'allergies', p_allergies)
    );
    INSERT INTO patients (
        user_id, first_name, last_name, date_of_birth, gender, address,
        contact_number, email, blood_type, allergies
    )
    VALUES (
        (p_payload->>'user_id')::integer,
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
    result := to_jsonb(v_patient_id);
END;
$procedure$;
