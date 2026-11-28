-- Stored procedure for queue.update_status.
DROP PROCEDURE IF EXISTS clinicease_queue_update_status(integer, integer, text);
CREATE OR REPLACE PROCEDURE clinicease_queue_update_status(
    IN p_appointment_id integer,
    IN p_doctor_id integer,
    IN p_queue_status text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_doctor_id integer;
    v_appointment_date date;
    v_appointment_status text;
    v_queue_status text;
BEGIN
    SELECT doctor_id, appointment_date, status, queue_status
      INTO v_doctor_id, v_appointment_date, v_appointment_status, v_queue_status
      FROM appointments
     WHERE id = p_appointment_id
       AND queue_number IS NOT NULL
       AND is_deleted = FALSE
     FOR UPDATE;

    IF NOT FOUND THEN
        result := to_jsonb('not_found'::text);
        RETURN;
    END IF;

    IF v_doctor_id IS DISTINCT FROM p_doctor_id THEN
        result := to_jsonb('forbidden'::text);
        RETURN;
    END IF;

    IF v_appointment_status IS NULL OR v_appointment_status NOT IN ('approved', 'completed') THEN
        result := to_jsonb('not_in_queue'::text);
        RETURN;
    END IF;

    IF v_appointment_date <> CURRENT_DATE THEN
        result := to_jsonb('not_today'::text);
        RETURN;
    END IF;

    IF p_queue_status IS NULL OR p_queue_status NOT IN ('waiting', 'serving', 'completed', 'skipped') THEN
        result := to_jsonb('invalid_status'::text);
        RETURN;
    END IF;

    IF v_queue_status IS NOT DISTINCT FROM p_queue_status THEN
        result := to_jsonb('updated'::text);
        RETURN;
    END IF;

    IF NOT (
        (v_queue_status = 'waiting' AND p_queue_status IN ('serving', 'skipped'))
        OR (v_queue_status = 'serving' AND p_queue_status IN ('completed', 'skipped'))
        OR (v_queue_status = 'skipped' AND p_queue_status = 'waiting')
    ) THEN
        result := to_jsonb('invalid_transition'::text);
        RETURN;
    END IF;

    IF p_queue_status = 'serving' AND EXISTS (
        SELECT 1
          FROM appointments a
         WHERE a.doctor_id = v_doctor_id
           AND a.appointment_date = v_appointment_date
           AND a.queue_status = 'serving'
           AND a.id <> p_appointment_id
    ) THEN
        result := to_jsonb('serving_exists'::text);
        RETURN;
    END IF;

    UPDATE appointments
       SET queue_status = p_queue_status,
           status = CASE WHEN p_queue_status = 'completed' THEN 'completed' ELSE status END
     WHERE id = p_appointment_id;

    result := to_jsonb('updated'::text);
END;
$procedure$;
