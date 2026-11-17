-- Apply once to add doctor accounts and doctor-reviewed appointment statuses.
BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'patient', 'doctor'));

ALTER TABLE doctors
    ADD COLUMN IF NOT EXISTS user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

CREATE OR REPLACE FUNCTION fn_validate_appointment_status(
    _old_status VARCHAR,
    _new_status VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    IF _old_status = 'pending' THEN
        RETURN _new_status IN ('approved', 'rejected', 'cancelled', 'pending');
    END IF;
    IF _old_status = 'approved' THEN
        RETURN _new_status IN ('completed', 'cancelled', 'approved');
    END IF;
    IF _old_status = 'confirmed' THEN
        RETURN _new_status IN ('approved', 'cancelled', 'confirmed');
    END IF;
    IF _old_status IN ('completed', 'rejected', 'cancelled') THEN
        RETURN _new_status IN (_old_status);
    END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

UPDATE appointments SET status = 'approved' WHERE status = 'confirmed';
ALTER TABLE appointments
    ADD CONSTRAINT appointments_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled'));

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM appointments a
        JOIN appointments b
          ON b.doctor_id = a.doctor_id
         AND b.appointment_date = a.appointment_date
         AND b.id > a.id
        WHERE a.is_deleted = FALSE
          AND a.status NOT IN ('cancelled', 'rejected')
          AND b.is_deleted = FALSE
          AND b.status NOT IN ('cancelled', 'rejected')
          AND (a.appointment_date + a.appointment_time)
              < (b.appointment_date + b.appointment_time + INTERVAL '30 minutes')
          AND (b.appointment_date + b.appointment_time)
              < (a.appointment_date + a.appointment_time + INTERVAL '30 minutes')
    ) THEN
        RAISE EXCEPTION 'Overlapping active appointment slots exist; resolve them before applying this migration.';
    END IF;
END;
$$;

DROP INDEX IF EXISTS uq_appointments_active_doctor_slot;
CREATE UNIQUE INDEX uq_appointments_active_doctor_slot
    ON appointments (doctor_id, appointment_date, appointment_time)
    WHERE is_deleted = FALSE AND status NOT IN ('cancelled', 'rejected');

COMMIT;
