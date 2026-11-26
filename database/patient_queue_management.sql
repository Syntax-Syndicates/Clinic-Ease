-- Apply after the appointment and doctor schedule migrations.
BEGIN;

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS queue_number INTEGER,
    ADD COLUMN IF NOT EXISTS queue_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN NOT NULL DEFAULT FALSE;

DROP INDEX IF EXISTS uq_appointments_queue_number;

UPDATE appointments a
SET queue_number = numbered.queue_number,
    queue_status = CASE
        WHEN a.status = 'completed' THEN 'completed'
        ELSE COALESCE(a.queue_status, 'waiting')
    END
FROM (
    SELECT appointment.id,
           ROW_NUMBER() OVER (
               PARTITION BY appointment.appointment_date
               ORDER BY appointment.queue_number NULLS LAST,
                        appointment.appointment_time,
                        appointment.doctor_id,
                        appointment.id
           )::INTEGER AS queue_number
    FROM appointments appointment
    WHERE appointment.is_deleted = FALSE
      AND appointment.doctor_id IS NOT NULL
      AND (
          appointment.status = 'approved'
          OR (appointment.status = 'completed' AND appointment.queue_number IS NOT NULL)
      )
) numbered
WHERE a.id = numbered.id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'appointments_queue_number_check'
          AND conrelid = 'appointments'::regclass
    ) THEN
        ALTER TABLE appointments
            ADD CONSTRAINT appointments_queue_number_check
            CHECK (queue_number IS NULL OR queue_number > 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'appointments_queue_status_check'
          AND conrelid = 'appointments'::regclass
    ) THEN
        ALTER TABLE appointments
            ADD CONSTRAINT appointments_queue_status_check
            CHECK (queue_status IS NULL OR queue_status IN ('waiting', 'serving', 'completed', 'skipped'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'appointments_queue_assignment_check'
          AND conrelid = 'appointments'::regclass
    ) THEN
        ALTER TABLE appointments
            ADD CONSTRAINT appointments_queue_assignment_check
            CHECK ((queue_number IS NULL) = (queue_status IS NULL));
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_queue_number
    ON appointments (appointment_date, queue_number)
    WHERE queue_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_serving_queue_per_doctor_day
    ON appointments (doctor_id, appointment_date)
    WHERE queue_status = 'serving';

CREATE OR REPLACE FUNCTION fn_assign_appointment_queue_number(p_appointment_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_doctor_id INTEGER;
    v_appointment_date DATE;
    v_status VARCHAR(20);
    v_is_deleted BOOLEAN;
    v_queue_number INTEGER;
BEGIN
    SELECT doctor_id, appointment_date, status, is_deleted, queue_number
      INTO v_doctor_id, v_appointment_date, v_status, v_is_deleted, v_queue_number
      FROM appointments
     WHERE id = p_appointment_id
     FOR UPDATE;

    IF NOT FOUND
       OR v_status IS DISTINCT FROM 'approved'
       OR v_is_deleted IS DISTINCT FROM FALSE
       OR v_doctor_id IS NULL THEN
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(
        0,
        TO_CHAR(v_appointment_date, 'YYYYMMDD')::INTEGER
    );

    IF v_queue_number IS NOT NULL THEN
        RETURN;
    END IF;

    SELECT COALESCE(MAX(queue_number), 0) + 1
      INTO v_queue_number
      FROM appointments
     WHERE appointment_date = v_appointment_date;

    UPDATE appointments
       SET queue_number = v_queue_number,
           queue_status = 'waiting'
     WHERE id = p_appointment_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_normalize_appointment_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.doctor_id IS DISTINCT FROM OLD.doctor_id
       OR NEW.appointment_date IS DISTINCT FROM OLD.appointment_date THEN
        NEW.queue_number := NULL;
        NEW.queue_status := NULL;
    END IF;

    IF NEW.is_deleted IS DISTINCT FROM FALSE
       OR NEW.status IN ('pending', 'rejected', 'cancelled') THEN
        NEW.queue_number := NULL;
        NEW.queue_status := NULL;
    ELSIF NEW.status = 'completed' AND NEW.queue_number IS NOT NULL THEN
        NEW.queue_status := 'completed';
    ELSIF NEW.status = 'approved'
          AND (OLD.status IS DISTINCT FROM 'approved' OR NEW.queue_number IS NULL) THEN
        IF NEW.queue_number IS NOT NULL THEN
            NEW.queue_status := 'waiting';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_enqueue_approved_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'approved' AND NEW.is_deleted IS FALSE THEN
        PERFORM fn_assign_appointment_queue_number(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_normalize_queue ON appointments;
CREATE TRIGGER appointments_normalize_queue
BEFORE UPDATE OF status, doctor_id, appointment_date, is_deleted
ON appointments
FOR EACH ROW
EXECUTE FUNCTION fn_normalize_appointment_queue();

DROP TRIGGER IF EXISTS appointments_enqueue_approved ON appointments;
CREATE TRIGGER appointments_enqueue_approved
AFTER INSERT OR UPDATE OF status, doctor_id, appointment_date, is_deleted
ON appointments
FOR EACH ROW
EXECUTE FUNCTION fn_enqueue_approved_appointment();

COMMIT;
