-- Stored procedure for queue.register_walk_in.
DROP PROCEDURE IF EXISTS clinicease_queue_register_walk_in(integer, integer);
CREATE OR REPLACE PROCEDURE clinicease_queue_register_walk_in(
    IN p_patient_id integer,
    IN p_doctor_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_appointment_id integer;
    v_duration integer;
BEGIN
    PERFORM 1 FROM patients
     WHERE id = p_patient_id AND is_deleted = FALSE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Patient not found.'
            USING ERRCODE = 'P0002', DETAIL = 'PATIENT_NOT_FOUND';
    END IF;

    SELECT appointment_duration_minutes INTO v_duration
      FROM doctors
     WHERE id = p_doctor_id AND is_deleted = FALSE AND is_active = TRUE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Doctor not found or is not accepting appointments.'
            USING ERRCODE = 'P0001', DETAIL = 'DOCTOR_UNAVAILABLE';
    END IF;

    INSERT INTO appointments (
        patient_id, doctor_id, appointment_date, appointment_time,
        appointment_duration_minutes, status, notes, is_walk_in
    )
    VALUES (
        p_patient_id, p_doctor_id, CURRENT_DATE, LOCALTIME,
        v_duration, 'approved', 'Walk-in', TRUE
    )
    RETURNING id INTO v_appointment_id;

    SELECT jsonb_build_object(
        'id', a.id,
        'patient_id', a.patient_id,
        'doctor_id', a.doctor_id,
        'appointment_date', a.appointment_date,
        'appointment_time', a.appointment_time,
        'queue_number', a.queue_number,
        'queue_status', a.queue_status,
        'is_walk_in', a.is_walk_in,
        'patient_first_name', p.first_name,
        'patient_last_name', p.last_name
    )
      INTO result
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
     WHERE a.id = v_appointment_id;
END;
$procedure$;
