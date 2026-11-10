-- Advanced PostgreSQL features required by rubric (Functions/Views/Triggers/JSONB)
-- NOTE: Run this AFTER `schema.sql` so tables already exist.

-- 1) Function: validate appointment status transition
CREATE OR REPLACE FUNCTION fn_validate_appointment_status(
    _old_status VARCHAR,
    _new_status VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    -- Allow: pending -> confirmed|cancelled
    IF _old_status = 'pending' THEN
        RETURN _new_status IN ('confirmed', 'cancelled', 'pending');
    END IF;

    -- Allow: confirmed -> completed|cancelled
    IF _old_status = 'confirmed' THEN
        RETURN _new_status IN ('completed', 'cancelled', 'confirmed');
    END IF;

    -- Allow: completed stays completed, cancelled stays cancelled
    IF _old_status IN ('completed','cancelled') THEN
        RETURN _new_status IN (_old_status);
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 2) View: appointments with patient + doctor display fields (excluding soft-deleted rows)
CREATE OR REPLACE VIEW v_appointments AS
SELECT
    a.id,
    a.patient_id,
    p.first_name AS patient_first_name,
    p.last_name  AS patient_last_name,
    a.doctor_id,
    d.first_name AS doctor_first_name,
    d.last_name  AS doctor_last_name,
    d.specialization,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.notes,
    a.created_at
FROM appointments a
JOIN patients p ON p.id = a.patient_id
JOIN doctors  d ON d.id = a.doctor_id
WHERE a.is_deleted = FALSE;

-- 3) JSONB column for extensible metadata (optional but rubric-friendly)
--    Add if it doesn't exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'appointments'
          AND column_name = 'meta'
    ) THEN
        ALTER TABLE appointments
        ADD COLUMN meta JSONB DEFAULT '{}'::JSONB;
    END IF;
END $$;

-- 4) Procedure: cancel appointment (soft delete) and set status
CREATE OR REPLACE PROCEDURE sp_cancel_appointment(
    _appointment_id INT,
    _cancel_reason TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE appointments
    SET
        status = 'cancelled',
        is_deleted = TRUE,
        notes = CASE WHEN _cancel_reason IS NULL THEN notes
                      ELSE COALESCE(notes,'') || E'\nCancel reason: ' || _cancel_reason
                 END
    WHERE id = _appointment_id;
END;
$$;

-- 5) Trigger function: enforce status transitions and set JSONB meta
CREATE OR REPLACE FUNCTION trg_fn_appointments_status_guard()
RETURNS TRIGGER AS $$
DECLARE
    ok BOOLEAN;
BEGIN
    ok := fn_validate_appointment_status(OLD.status, NEW.status);
    IF NOT ok THEN
        RAISE EXCEPTION 'Invalid appointment status transition from % to %', OLD.status, NEW.status;
    END IF;

    -- Write audit-ish info into JSONB meta
    NEW.meta := COALESCE(NEW.meta, '{}'::JSONB) || jsonb_build_object(
        'last_status', NEW.status,
        'last_updated_at', NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6) Trigger: run BEFORE UPDATE on appointments when status changes
DROP TRIGGER IF EXISTS tr_appointments_status_guard ON appointments;
CREATE TRIGGER tr_appointments_status_guard
BEFORE UPDATE OF status ON appointments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION trg_fn_appointments_status_guard();

-- 7) Optional trigger: ensure medical record follows appointment status completed
--    (If you update/insert into medical_records, it should be linked to a completed appointment)
CREATE OR REPLACE FUNCTION trg_fn_medical_records_guard()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM appointments a
        WHERE a.id = NEW.appointment_id
          AND a.status = 'completed'
          AND a.is_deleted = FALSE
    ) THEN
        RAISE EXCEPTION 'Medical record can only be created for completed appointments';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_medical_records_completed_guard ON medical_records;
CREATE TRIGGER tr_medical_records_completed_guard
BEFORE INSERT OR UPDATE OF diagnosis, prescription, consultation_notes ON medical_records
FOR EACH ROW
EXECUTE FUNCTION trg_fn_medical_records_guard();
