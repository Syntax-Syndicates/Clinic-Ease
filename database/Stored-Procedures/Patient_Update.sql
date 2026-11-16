-- Stored procedure for patient.update.
DROP PROCEDURE IF EXISTS clinicease_patient_update(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_patient_update(
    IN p_id integer,
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
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'patient', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'date_of_birth', p_date_of_birth, 'gender', p_gender, 'address', p_address, 'contact_number', p_contact_number, 'email', p_email, 'blood_type', p_blood_type, 'allergies', p_allergies)
    );
    UPDATE patients SET
        first_name = p_payload->'patient'->>'first_name',
        last_name = p_payload->'patient'->>'last_name',
        date_of_birth = (p_payload->'patient'->>'date_of_birth')::date,
        gender = p_payload->'patient'->>'gender',
        address = p_payload->'patient'->>'address',
        contact_number = p_payload->'patient'->>'contact_number',
        email = p_payload->'patient'->>'email',
        blood_type = p_payload->'patient'->>'blood_type',
        allergies = p_payload->'patient'->>'allergies'
    WHERE id = (p_payload->>'id')::integer;
    result := to_jsonb(TRUE);
END;
$procedure$;
