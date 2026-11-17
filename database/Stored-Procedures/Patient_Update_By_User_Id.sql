-- Stored procedure for patient.update_by_user_id.
DROP PROCEDURE IF EXISTS clinicease_patient_update_by_user_id(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_patient_update_by_user_id(
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
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'user_id', p_user_id,
        'patient', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'date_of_birth', p_date_of_birth, 'gender', p_gender, 'address', p_address, 'contact_number', p_contact_number, 'email', p_email, 'blood_type', p_blood_type, 'allergies', p_allergies)
    );
    UPDATE patients SET
        first_name = COALESCE(p_payload->'patient'->>'first_name', first_name),
        last_name = COALESCE(p_payload->'patient'->>'last_name', last_name),
        date_of_birth = COALESCE((p_payload->'patient'->>'date_of_birth')::date, date_of_birth),
        gender = COALESCE(p_payload->'patient'->>'gender', gender),
        address = COALESCE(p_payload->'patient'->>'address', address),
        contact_number = COALESCE(p_payload->'patient'->>'contact_number', contact_number),
        email = COALESCE(p_payload->'patient'->>'email', email),
        blood_type = COALESCE(p_payload->'patient'->>'blood_type', blood_type),
        allergies = COALESCE(p_payload->'patient'->>'allergies', allergies)
    WHERE user_id = (p_payload->>'user_id')::integer AND is_deleted = FALSE;
    result := to_jsonb(TRUE);
END;
$procedure$;
