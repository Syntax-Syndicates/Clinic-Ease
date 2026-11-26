-- Stored procedure for queue.list.
DROP PROCEDURE IF EXISTS clinicease_queue_list(integer, date);
CREATE OR REPLACE PROCEDURE clinicease_queue_list(
    IN p_doctor_id integer,
    IN p_queue_date date,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.queue_number), '[]'::jsonb)
      INTO result
      FROM (
          SELECT a.id, a.patient_id, a.doctor_id, a.appointment_date, a.appointment_time,
                 a.status AS appointment_status, a.queue_number, a.queue_status, a.is_walk_in,
                 p.first_name AS patient_first_name, p.last_name AS patient_last_name,
                 d.first_name AS doctor_first_name, d.last_name AS doctor_last_name
            FROM appointments a
            JOIN patients p ON p.id = a.patient_id
            JOIN doctors d ON d.id = a.doctor_id
           WHERE a.doctor_id = p_doctor_id
             AND a.appointment_date = p_queue_date
             AND a.queue_number IS NOT NULL
             AND a.queue_status IS NOT NULL
             AND a.status IN ('approved', 'completed')
             AND a.is_deleted = FALSE
      ) row_data;
END;
$procedure$;
