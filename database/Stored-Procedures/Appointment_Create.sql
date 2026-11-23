-- Stored procedure for appointment.create.
DROP PROCEDURE IF EXISTS clinicease_appointment_create(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_appointment_create(
    IN p_patient_id integer,
    IN p_doctor_id integer,
    IN p_appointment_date date,
    IN p_appointment_time time,
    IN p_status text,
    IN p_notes text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_doctor_id integer;
    v_patient_id integer;
    v_appointment_id integer;
    v_duration integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'patient_id', p_patient_id,
        'doctor_id', p_doctor_id,
        'appointment_date', p_appointment_date,
        'appointment_time', p_appointment_time,
        'status', p_status,
        'notes', p_notes
    );
    v_doctor_id := (p_payload->>'doctor_id')::integer;
    v_patient_id := (p_payload->>'patient_id')::integer;
    PERFORM pg_advisory_xact_lock(v_doctor_id, 0);
    PERFORM pg_advisory_xact_lock(v_doctor_id, hashtext(p_payload->>'appointment_date'));
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
    PERFORM 1 FROM patients WHERE id = v_patient_id AND is_deleted = FALSE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Patient not found.' USING ERRCODE = 'P0001', DETAIL = 'PATIENT_NOT_FOUND';
    END IF;
    IF EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.doctor_id = v_doctor_id
          AND a.appointment_date = (p_payload->>'appointment_date')::date
          AND a.is_deleted = FALSE AND a.status NOT IN ('cancelled', 'rejected')
          AND (a.appointment_date + a.appointment_time)
              < ((p_payload->>'appointment_date')::date + (p_payload->>'appointment_time')::time + make_interval(mins => v_duration))
          AND (a.appointment_date + a.appointment_time + make_interval(mins => v_duration))
              > ((p_payload->>'appointment_date')::date + (p_payload->>'appointment_time')::time)
    ) THEN
        RAISE EXCEPTION 'The selected appointment slot is no longer available.'
            USING ERRCODE = 'P0001', DETAIL = 'SLOT_UNAVAILABLE';
    END IF;
    INSERT INTO appointments (
        patient_id, doctor_id, appointment_date, appointment_time, status, notes
    )
    VALUES (
        v_patient_id, v_doctor_id,
        (p_payload->>'appointment_date')::date,
        (p_payload->>'appointment_time')::time,
        COALESCE(p_payload->>'status', 'pending'),
        p_payload->>'notes'
    )
    RETURNING id INTO v_appointment_id;
    result := to_jsonb(v_appointment_id);
END;
$procedure$;
