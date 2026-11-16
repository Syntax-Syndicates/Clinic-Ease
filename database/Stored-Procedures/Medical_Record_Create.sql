-- Stored procedure for medical_record.create.
DROP PROCEDURE IF EXISTS clinicease_medical_record_create(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_medical_record_create(
    IN p_appointment_id integer,
    IN p_patient_id integer,
    IN p_doctor_id integer,
    IN p_diagnosis text,
    IN p_prescription text,
    IN p_consultation_notes text,
    IN p_follow_up_date date,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_appointment_id integer;
    v_appointment_record record;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'appointment_id', p_appointment_id,
        'patient_id', p_patient_id,
        'doctor_id', p_doctor_id,
        'diagnosis', p_diagnosis,
        'prescription', p_prescription,
        'consultation_notes', p_consultation_notes,
        'follow_up_date', p_follow_up_date
    );
    SELECT patient_id, doctor_id, status INTO v_appointment_record
    FROM appointments WHERE id = (p_payload->>'appointment_id')::integer
      AND is_deleted = FALSE FOR UPDATE;
    IF NOT FOUND THEN
        result := jsonb_build_object('status', 'not_found');
    ELSIF v_appointment_record.patient_id <> (p_payload->>'patient_id')::integer
       OR v_appointment_record.doctor_id <> (p_payload->>'doctor_id')::integer THEN
        result := jsonb_build_object('status', 'appointment_mismatch');
    ELSIF v_appointment_record.status <> 'approved' THEN
        result := jsonb_build_object('status', 'appointment_not_approved');
    ELSE
        PERFORM 1 FROM medical_records
        WHERE appointment_id = (p_payload->>'appointment_id')::integer AND is_deleted = FALSE;
        IF FOUND THEN
            result := jsonb_build_object('status', 'already_exists');
        ELSE
            UPDATE appointments SET status = 'completed'
            WHERE id = (p_payload->>'appointment_id')::integer;
            INSERT INTO medical_records (
                appointment_id, patient_id, doctor_id, diagnosis, prescription,
                consultation_notes, follow_up_date
            )
            VALUES (
                (p_payload->>'appointment_id')::integer,
                (p_payload->>'patient_id')::integer,
                (p_payload->>'doctor_id')::integer,
                p_payload->>'diagnosis',
                p_payload->>'prescription',
                p_payload->>'consultation_notes',
                (p_payload->>'follow_up_date')::date
            )
            RETURNING id INTO v_appointment_id;
            result := jsonb_build_object('status', 'created', 'id', v_appointment_id);
        END IF;
    END IF;
END;
$procedure$;
