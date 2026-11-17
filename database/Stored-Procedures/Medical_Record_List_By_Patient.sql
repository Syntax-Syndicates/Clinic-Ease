-- Stored procedure for medical_record.list_by_patient.
DROP PROCEDURE IF EXISTS clinicease_medical_record_list_by_patient(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_medical_record_list_by_patient(
    IN p_patient_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'patient_id', p_patient_id
    );
    SELECT COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.appointment_date DESC), '[]'::jsonb)
    INTO result FROM (
        SELECT mr.*, a.appointment_date, a.appointment_time,
               d.first_name AS doctor_first_name, d.last_name AS doctor_last_name
        FROM medical_records mr
        JOIN appointments a ON mr.appointment_id = a.id
        JOIN doctors d ON mr.doctor_id = d.id
        WHERE mr.patient_id = (p_payload->>'patient_id')::integer AND mr.is_deleted = FALSE
    ) row_data;
END;
$procedure$;
