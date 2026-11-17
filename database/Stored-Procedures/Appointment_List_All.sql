-- Stored procedure for appointment.list_all.
DROP PROCEDURE IF EXISTS clinicease_appointment_list_all(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_appointment_list_all(
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := '{}'::jsonb;
    SELECT COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.appointment_date DESC, row_data.appointment_time), '[]'::jsonb)
    INTO result FROM (
        SELECT a.*, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
               p.email AS patient_email, p.contact_number AS patient_contact_number,
               d.first_name AS doctor_first_name, d.last_name AS doctor_last_name,
               d.specialization, d.email AS doctor_email, d.contact_number AS doctor_contact_number
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.is_deleted = FALSE
    ) row_data;
END;
$procedure$;
