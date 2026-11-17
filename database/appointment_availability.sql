-- Run against an existing database to enforce unique active doctor slots.
-- Appointment endpoints also use a transaction-scoped lock and check for overlaps.
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_active_doctor_slot
    ON appointments (doctor_id, appointment_date, appointment_time)
    WHERE is_deleted = FALSE AND status NOT IN ('cancelled', 'rejected');
