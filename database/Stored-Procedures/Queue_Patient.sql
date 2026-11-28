-- Stored procedure for queue.get_patient_queue.
DROP PROCEDURE IF EXISTS clinicease_queue_get_patient(integer);
CREATE OR REPLACE PROCEDURE clinicease_queue_get_patient(
    IN p_patient_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.appointment_date, row_data.appointment_time), '[]'::jsonb)
      INTO result
      FROM (
          SELECT a.id, a.doctor_id, a.appointment_date, a.appointment_time,
                 a.status AS appointment_status, a.queue_number, a.queue_status,
                 a.is_walk_in,
                 d.first_name AS doctor_first_name, d.last_name AS doctor_last_name,
                 d.specialization,
                 (
                     SELECT serving.queue_number
                       FROM appointments serving
                      WHERE serving.doctor_id = a.doctor_id
                        AND serving.appointment_date = a.appointment_date
                        AND serving.status = 'approved'
                        AND serving.queue_status = 'serving'
                        AND serving.is_deleted = FALSE
                      LIMIT 1
                 ) AS current_serving_number,
                 CASE WHEN a.queue_status = 'waiting' THEN (
                     SELECT COUNT(*)::INTEGER
                       FROM appointments ahead
                      WHERE ahead.doctor_id = a.doctor_id
                        AND ahead.appointment_date = a.appointment_date
                        AND ahead.status = 'approved'
                        AND ahead.queue_status = 'waiting'
                        AND ahead.queue_number < a.queue_number
                        AND ahead.is_deleted = FALSE
                 ) ELSE 0 END AS patients_waiting_ahead
            FROM appointments a
            JOIN doctors d ON d.id = a.doctor_id
           WHERE a.patient_id = p_patient_id
             AND a.queue_number IS NOT NULL
             AND a.queue_status IS NOT NULL
             AND a.status IN ('approved', 'completed')
             AND a.is_deleted = FALSE
      ) row_data;
END;
$procedure$;
