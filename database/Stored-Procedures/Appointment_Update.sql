-- Stored procedure for appointment.update.
DROP PROCEDURE IF EXISTS clinicease_appointment_update(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_appointment_update(
    IN p_id integer,
    IN p_patient_id integer,
    IN p_doctor_id integer,
    IN p_appointment_date date,
    IN p_appointment_time time,
    IN p_status text,
    IN p_notes text,
    IN p_rejection_reason text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_doctor_id integer;
    v_duration integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'patient_id', p_patient_id,
        'doctor_id', p_doctor_id,
        'appointment_date', p_appointment_date,
        'appointment_time', p_appointment_time,
        'status', p_status,
        'notes', p_notes,
        'rejection_reason', p_rejection_reason
    );
    v_doctor_id := (p_payload->>'doctor_id')::integer;
    PERFORM pg_advisory_xact_lock(v_doctor_id, 0);
    PERFORM pg_advisory_xact_lock(v_doctor_id, hashtext(p_payload->>'appointment_date'));
    PERFORM 1 FROM appointments
    WHERE id = (p_payload->>'id')::integer AND is_deleted = FALSE FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found.' USING ERRCODE = 'P0002';
    END IF;
    IF p_payload->>'status' NOT IN ('cancelled', 'rejected', 'completed') THEN
        SELECT appointment_duration_minutes INTO v_duration FROM doctors
        WHERE id = v_doctor_id AND is_deleted = FALSE AND is_active = TRUE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Doctor not found or is not accepting appointments.'
                USING ERRCODE = 'P0001', DETAIL = 'DOCTOR_UNAVAILABLE';
        END IF;
        IF NOT fn_doctor_schedule_allows_appointment(
            v_doctor_id,
            (p_payload->>'appointment_date')::date,
            (p_payload->>'appointment_time')::time
        ) THEN
            RAISE EXCEPTION 'The selected time is outside the doctor''s availability.'
                USING ERRCODE = 'P0001', DETAIL = 'SLOT_UNAVAILABLE';
        END IF;
        IF EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.doctor_id = v_doctor_id
              AND a.appointment_date = (p_payload->>'appointment_date')::date
              AND a.id <> (p_payload->>'id')::integer
              AND a.is_deleted = FALSE AND a.status NOT IN ('cancelled', 'rejected')
              AND (a.appointment_date + a.appointment_time)
                  < ((p_payload->>'appointment_date')::date + (p_payload->>'appointment_time')::time + make_interval(mins => v_duration))
              AND (a.appointment_date + a.appointment_time + make_interval(mins => v_duration))
                  > ((p_payload->>'appointment_date')::date + (p_payload->>'appointment_time')::time)
        ) THEN
            RAISE EXCEPTION 'The selected appointment slot is no longer available.'
                USING ERRCODE = 'P0001', DETAIL = 'SLOT_UNAVAILABLE';
        END IF;
    END IF;
    UPDATE appointments SET
        patient_id = (p_payload->>'patient_id')::integer,
        doctor_id = v_doctor_id,
        appointment_date = (p_payload->>'appointment_date')::date,
        appointment_time = (p_payload->>'appointment_time')::time,
        status = p_payload->>'status',
        notes = p_payload->>'notes',
        rejection_reason = p_payload->>'rejection_reason'
    WHERE id = (p_payload->>'id')::integer;
    result := to_jsonb(TRUE);
END;
$procedure$;
