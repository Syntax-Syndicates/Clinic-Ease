-- Stored procedure for appointment.availability_inputs.
DROP PROCEDURE IF EXISTS clinicease_appointment_availability_inputs(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_appointment_availability_inputs(
    IN p_doctor_id integer,
    IN p_date date,
    IN p_exclude_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_schedule text;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'doctor_id', p_doctor_id,
        'date', p_date,
        'exclude_id', p_exclude_id
    );
    SELECT d.schedule INTO v_schedule FROM doctors d
    WHERE d.id = (p_payload->>'doctor_id')::integer
      AND d.is_deleted = FALSE AND d.is_active = TRUE;
    IF NOT FOUND THEN
        result := NULL;
    ELSE
        SELECT jsonb_build_object(
            'schedule', v_schedule,
            'appointment_times', COALESCE(jsonb_agg(a.appointment_time ORDER BY a.appointment_time)
                FILTER (WHERE a.id IS NOT NULL), '[]'::jsonb)
        )
        INTO result
        FROM appointments a
        WHERE a.doctor_id = (p_payload->>'doctor_id')::integer
          AND a.appointment_date = (p_payload->>'date')::date
          AND (p_payload->>'exclude_id' IS NULL OR a.id <> (p_payload->>'exclude_id')::integer)
          AND a.is_deleted = FALSE AND a.status NOT IN ('cancelled', 'rejected');
    END IF;
END;
$procedure$;
-- Stored procedure for appointment.cancel.
DROP PROCEDURE IF EXISTS clinicease_appointment_cancel(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_appointment_cancel(
    IN p_id integer,
    IN p_patient_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_patient_id integer;
    v_appointment_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'patient_id', p_patient_id
    );
    UPDATE appointments SET status = 'cancelled'
    WHERE id = (p_payload->>'id')::integer
      AND ((p_payload->>'patient_id') IS NULL OR patient_id = (p_payload->>'patient_id')::integer)
      AND is_deleted = FALSE AND status IN ('pending', 'approved')
    RETURNING id INTO v_appointment_id;
    IF v_appointment_id IS NOT NULL THEN
        result := to_jsonb('cancelled'::text);
    ELSE
        SELECT patient_id INTO v_patient_id FROM appointments
        WHERE id = (p_payload->>'id')::integer AND is_deleted = FALSE;
        IF NOT FOUND THEN
            result := to_jsonb('not_found'::text);
        ELSIF p_payload->>'patient_id' IS NOT NULL
              AND v_patient_id <> (p_payload->>'patient_id')::integer THEN
            result := to_jsonb('forbidden'::text);
        ELSE
            result := to_jsonb('not_cancellable'::text);
        END IF;
    END IF;
END;
$procedure$;
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
    v_schedule text;
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
    PERFORM pg_advisory_xact_lock(v_doctor_id, hashtext(p_payload->>'appointment_date'));
    SELECT schedule INTO v_schedule FROM doctors
    WHERE id = v_doctor_id AND is_deleted = FALSE AND is_active = TRUE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Doctor not found or is not accepting appointments.'
            USING ERRCODE = 'P0001', DETAIL = 'DOCTOR_UNAVAILABLE';
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
              < ((p_payload->>'appointment_date')::date + (p_payload->>'appointment_time')::time + INTERVAL '30 minutes')
          AND (a.appointment_date + a.appointment_time + INTERVAL '30 minutes')
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
-- Stored procedure for appointment.decide.
DROP PROCEDURE IF EXISTS clinicease_appointment_decide(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_appointment_decide(
    IN p_id integer,
    IN p_doctor_id integer,
    IN p_status text,
    IN p_rejection_reason text,
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
        'id', p_id,
        'doctor_id', p_doctor_id,
        'status', p_status,
        'rejection_reason', p_rejection_reason
    );
    UPDATE appointments SET status = p_payload->>'status',
        rejection_reason = p_payload->>'rejection_reason'
    WHERE id = (p_payload->>'id')::integer
      AND doctor_id = (p_payload->>'doctor_id')::integer
      AND status = 'pending' AND is_deleted = FALSE
    RETURNING id INTO v_appointment_id;
    IF v_appointment_id IS NOT NULL THEN
        result := to_jsonb('updated'::text);
    ELSE
        SELECT doctor_id, status INTO v_appointment_record
        FROM appointments WHERE id = (p_payload->>'id')::integer AND is_deleted = FALSE;
        IF NOT FOUND THEN
            result := to_jsonb('not_found'::text);
        ELSIF v_appointment_record.doctor_id <> (p_payload->>'doctor_id')::integer THEN
            result := to_jsonb('forbidden'::text);
        ELSE
            result := to_jsonb('not_pending'::text);
        END IF;
    END IF;
END;
$procedure$;
-- Stored procedure for appointment.find_by_id.
DROP PROCEDURE IF EXISTS clinicease_appointment_find_by_id(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_appointment_find_by_id(
    IN p_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id
    );
    SELECT to_jsonb(row_data) INTO result FROM (
        SELECT a.*, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
               p.email AS patient_email, p.contact_number AS patient_contact_number,
               d.first_name AS doctor_first_name, d.last_name AS doctor_last_name,
               d.specialization, d.email AS doctor_email, d.contact_number AS doctor_contact_number
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.id = (p_payload->>'id')::integer AND a.is_deleted = FALSE
    ) row_data;
END;
$procedure$;
-- Stored procedure for appointment.list_all.
DROP PROCEDURE IF EXISTS clinicease_appointment_list_all(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_appointment_list_all(
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := '{}'::jsonb;
    SELECT COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.appointment_date DESC, row_data.appointment_time), '[]'::jsonb)
    INTO result FROM (
        SELECT a.*, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
               p.email AS patient_email, p.contact_number AS patient_contact_number,
               d.first_name AS doctor_first_name, d.last_name AS doctor_last_name,
               d.specialization, d.email AS doctor_email, d.contact_number AS doctor_contact_number
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.is_deleted = FALSE
    ) row_data;
END;
$procedure$;
-- Stored procedure for appointment.list_by_doctor.
DROP PROCEDURE IF EXISTS clinicease_appointment_list_by_doctor(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_appointment_list_by_doctor(
    IN p_doctor_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'doctor_id', p_doctor_id
    );
    SELECT COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.appointment_date, row_data.appointment_time), '[]'::jsonb)
    INTO result FROM (
        SELECT a.*, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
               p.email AS patient_email, p.contact_number AS patient_contact_number,
               d.first_name AS doctor_first_name, d.last_name AS doctor_last_name,
               d.specialization, d.email AS doctor_email, d.contact_number AS doctor_contact_number
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.doctor_id = (p_payload->>'doctor_id')::integer AND a.is_deleted = FALSE
    ) row_data;
END;
$procedure$;
-- Stored procedure for appointment.list_by_patient.
DROP PROCEDURE IF EXISTS clinicease_appointment_list_by_patient(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_appointment_list_by_patient(
    IN p_patient_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'patient_id', p_patient_id
    );
    SELECT COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.appointment_date DESC, row_data.appointment_time), '[]'::jsonb)
    INTO result FROM (
        SELECT a.*, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
               p.email AS patient_email, p.contact_number AS patient_contact_number,
               d.first_name AS doctor_first_name, d.last_name AS doctor_last_name,
               d.specialization, d.email AS doctor_email, d.contact_number AS doctor_contact_number
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.patient_id = (p_payload->>'patient_id')::integer AND a.is_deleted = FALSE
    ) row_data;
END;
$procedure$;
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
    v_schedule text;
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
    PERFORM pg_advisory_xact_lock(v_doctor_id, hashtext(p_payload->>'appointment_date'));
    PERFORM 1 FROM appointments
    WHERE id = (p_payload->>'id')::integer AND is_deleted = FALSE FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found.' USING ERRCODE = 'P0002';
    END IF;
    IF p_payload->>'status' NOT IN ('cancelled', 'rejected', 'completed') THEN
        SELECT schedule INTO v_schedule FROM doctors
        WHERE id = v_doctor_id AND is_deleted = FALSE AND is_active = TRUE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Doctor not found or is not accepting appointments.'
                USING ERRCODE = 'P0001', DETAIL = 'DOCTOR_UNAVAILABLE';
        END IF;
        IF EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.doctor_id = v_doctor_id
              AND a.appointment_date = (p_payload->>'appointment_date')::date
              AND a.id <> (p_payload->>'id')::integer
              AND a.is_deleted = FALSE AND a.status NOT IN ('cancelled', 'rejected')
              AND (a.appointment_date + a.appointment_time)
                  < ((p_payload->>'appointment_date')::date + (p_payload->>'appointment_time')::time + INTERVAL '30 minutes')
              AND (a.appointment_date + a.appointment_time + INTERVAL '30 minutes')
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
-- Stored procedure for auth.active_doctor.
DROP PROCEDURE IF EXISTS clinicease_auth_active_doctor(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_auth_active_doctor(
    IN p_user_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'user_id', p_user_id
    );
    SELECT jsonb_build_object('id', d.id) INTO result
    FROM doctors d JOIN users u ON u.id = d.user_id
    WHERE u.id = (p_payload->>'user_id')::integer
      AND u.is_deleted = FALSE AND d.is_deleted = FALSE AND d.is_active = TRUE;
END;
$procedure$;
-- Stored procedure for auth.register_patient.
DROP PROCEDURE IF EXISTS clinicease_auth_register_patient(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_auth_register_patient(
    IN p_username text,
    IN p_password_hash text,
    IN p_first_name text,
    IN p_last_name text,
    IN p_date_of_birth date,
    IN p_gender text,
    IN p_address text,
    IN p_contact_number text,
    IN p_email text,
    IN p_blood_type text,
    IN p_allergies text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_user_id integer;
    v_patient_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'username', p_username,
        'password_hash', p_password_hash,
        'patient', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'date_of_birth', p_date_of_birth, 'gender', p_gender, 'address', p_address, 'contact_number', p_contact_number, 'email', p_email, 'blood_type', p_blood_type, 'allergies', p_allergies)
    );
    INSERT INTO users (username, password_hash, role)
    VALUES (p_payload->>'username', p_payload->>'password_hash', 'patient')
    RETURNING id INTO v_user_id;
    INSERT INTO patients (
        user_id, first_name, last_name, date_of_birth, gender, address,
        contact_number, email, blood_type, allergies
    )
    VALUES (
        v_user_id,
        p_payload->'patient'->>'first_name',
        p_payload->'patient'->>'last_name',
        (p_payload->'patient'->>'date_of_birth')::date,
        p_payload->'patient'->>'gender',
        p_payload->'patient'->>'address',
        p_payload->'patient'->>'contact_number',
        p_payload->'patient'->>'email',
        p_payload->'patient'->>'blood_type',
        p_payload->'patient'->>'allergies'
    )
    RETURNING id INTO v_patient_id;
    result := jsonb_build_object('user_id', v_user_id, 'patient_id', v_patient_id);
END;
$procedure$;
-- Stored procedure for doctor.create.
DROP PROCEDURE IF EXISTS clinicease_doctor_create(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_doctor_create(
    IN p_password_hash text,
    IN p_first_name text,
    IN p_last_name text,
    IN p_specialization text,
    IN p_schedule text,
    IN p_contact_number text,
    IN p_email text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_user_id integer;
    v_doctor_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'password_hash', p_password_hash,
        'doctor', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'specialization', p_specialization, 'schedule', p_schedule, 'contact_number', p_contact_number, 'email', p_email)
    );
    INSERT INTO users (username, password_hash, role)
    VALUES (p_payload->'doctor'->>'email', p_payload->>'password_hash', 'doctor')
    RETURNING id INTO v_user_id;
    INSERT INTO doctors (
        user_id, first_name, last_name, specialization, schedule, contact_number, email
    )
    VALUES (
        v_user_id,
        p_payload->'doctor'->>'first_name',
        p_payload->'doctor'->>'last_name',
        p_payload->'doctor'->>'specialization',
        p_payload->'doctor'->>'schedule',
        p_payload->'doctor'->>'contact_number',
        p_payload->'doctor'->>'email'
    )
    RETURNING id INTO v_doctor_id;
    result := to_jsonb(v_doctor_id);
END;
$procedure$;
-- Stored procedure for doctor.delete.
DROP PROCEDURE IF EXISTS clinicease_doctor_delete(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_doctor_delete(
    IN p_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_user_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id
    );
    UPDATE doctors SET is_deleted = TRUE, is_active = FALSE
    WHERE id = (p_payload->>'id')::integer
    RETURNING user_id INTO v_user_id;
    IF v_user_id IS NOT NULL THEN
        UPDATE users SET is_deleted = TRUE WHERE id = v_user_id;
    END IF;
    result := to_jsonb(TRUE);
END;
$procedure$;
-- Stored procedure for doctor.find_by_id.
DROP PROCEDURE IF EXISTS clinicease_doctor_find_by_id(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_doctor_find_by_id(
    IN p_id integer,
    IN p_include_inactive boolean,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'include_inactive', p_include_inactive
    );
    SELECT to_jsonb(row_data) INTO result
    FROM (
        SELECT id, first_name, last_name, specialization, schedule, contact_number,
               email, is_active, is_deleted, (user_id IS NOT NULL) AS has_account
        FROM doctors
        WHERE id = (p_payload->>'id')::integer AND is_deleted = FALSE
          AND (COALESCE((p_payload->>'include_inactive')::boolean, FALSE) OR is_active = TRUE)
    ) row_data;
END;
$procedure$;
-- Stored procedure for doctor.find_by_user_id.
DROP PROCEDURE IF EXISTS clinicease_doctor_find_by_user_id(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_doctor_find_by_user_id(
    IN p_user_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'user_id', p_user_id
    );
    SELECT jsonb_build_object('id', id, 'first_name', first_name, 'last_name', last_name)
    INTO result
    FROM doctors WHERE user_id = (p_payload->>'user_id')::integer
      AND is_deleted = FALSE AND is_active = TRUE;
END;
$procedure$;
-- Stored procedure for doctor.list.
DROP PROCEDURE IF EXISTS clinicease_doctor_list(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_doctor_list(
    IN p_include_inactive boolean,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'include_inactive', p_include_inactive
    );
    SELECT COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.id), '[]'::jsonb)
    INTO result
    FROM (
        SELECT id, first_name, last_name, specialization, schedule, contact_number,
               email, is_active, is_deleted, (user_id IS NOT NULL) AS has_account
        FROM doctors
        WHERE is_deleted = FALSE
          AND (COALESCE((p_payload->>'include_inactive')::boolean, FALSE) OR is_active = TRUE)
    ) row_data;
END;
$procedure$;
-- Stored procedure for doctor.set_active.
DROP PROCEDURE IF EXISTS clinicease_doctor_set_active(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_doctor_set_active(
    IN p_id integer,
    IN p_is_active boolean,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_user_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'is_active', p_is_active
    );
    UPDATE doctors SET is_active = (p_payload->>'is_active')::boolean
    WHERE id = (p_payload->>'id')::integer AND is_deleted = FALSE
    RETURNING user_id INTO v_user_id;
    IF NOT FOUND THEN
        result := to_jsonb(FALSE);
    ELSE
        IF v_user_id IS NOT NULL THEN
            UPDATE users SET is_deleted = NOT (p_payload->>'is_active')::boolean
            WHERE id = v_user_id;
        END IF;
        result := to_jsonb(TRUE);
    END IF;
END;
$procedure$;
-- Stored procedure for doctor.update.
DROP PROCEDURE IF EXISTS clinicease_doctor_update(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_doctor_update(
    IN p_id integer,
    IN p_first_name text,
    IN p_last_name text,
    IN p_specialization text,
    IN p_schedule text,
    IN p_contact_number text,
    IN p_email text,
    IN p_password_hash text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_user_id integer;
    v_doctor_record record;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'doctor', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'specialization', p_specialization, 'schedule', p_schedule, 'contact_number', p_contact_number, 'email', p_email),
        'password_hash', p_password_hash
    );
    SELECT d.user_id, d.email INTO v_doctor_record
    FROM doctors d
    WHERE d.id = (p_payload->>'id')::integer AND d.is_deleted = FALSE
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Doctor not found.' USING ERRCODE = 'P0002';
    END IF;
    UPDATE doctors SET
        first_name = p_payload->'doctor'->>'first_name',
        last_name = p_payload->'doctor'->>'last_name',
        specialization = p_payload->'doctor'->>'specialization',
        schedule = p_payload->'doctor'->>'schedule',
        contact_number = p_payload->'doctor'->>'contact_number',
        email = p_payload->'doctor'->>'email'
    WHERE id = (p_payload->>'id')::integer;
    IF v_doctor_record.user_id IS NOT NULL
       AND (v_doctor_record.email IS DISTINCT FROM p_payload->'doctor'->>'email'
            OR p_payload->>'password_hash' IS NOT NULL) THEN
        UPDATE users SET
            username = CASE
                WHEN v_doctor_record.email IS DISTINCT FROM p_payload->'doctor'->>'email'
                THEN p_payload->'doctor'->>'email' ELSE username
            END,
            password_hash = COALESCE(p_payload->>'password_hash', password_hash)
        WHERE id = v_doctor_record.user_id;
    ELSIF p_payload->>'password_hash' IS NOT NULL THEN
        INSERT INTO users (username, password_hash, role)
        VALUES (p_payload->'doctor'->>'email', p_payload->>'password_hash', 'doctor')
        RETURNING id INTO v_user_id;
        UPDATE doctors SET user_id = v_user_id WHERE id = (p_payload->>'id')::integer;
    END IF;
    result := to_jsonb(TRUE);
END;
$procedure$;
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
-- Stored procedure for medical_record.delete.
DROP PROCEDURE IF EXISTS clinicease_medical_record_delete(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_medical_record_delete(
    IN p_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id
    );
    UPDATE medical_records SET is_deleted = TRUE WHERE id = (p_payload->>'id')::integer;
    result := to_jsonb(TRUE);
END;
$procedure$;
-- Stored procedure for medical_record.find_by_appointment.
DROP PROCEDURE IF EXISTS clinicease_medical_record_find_by_appointment(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_medical_record_find_by_appointment(
    IN p_appointment_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'appointment_id', p_appointment_id
    );
    SELECT to_jsonb(mr) INTO result FROM medical_records mr
    WHERE mr.appointment_id = (p_payload->>'appointment_id')::integer AND mr.is_deleted = FALSE;
END;
$procedure$;
-- Stored procedure for medical_record.find_by_id.
DROP PROCEDURE IF EXISTS clinicease_medical_record_find_by_id(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_medical_record_find_by_id(
    IN p_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id
    );
    SELECT to_jsonb(mr) INTO result FROM medical_records mr
    WHERE mr.id = (p_payload->>'id')::integer AND mr.is_deleted = FALSE;
END;
$procedure$;
-- Stored procedure for medical_record.list_by_patient.
DROP PROCEDURE IF EXISTS clinicease_medical_record_list_by_patient(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_medical_record_list_by_patient(
    IN p_patient_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'patient_id', p_patient_id
    );
    SELECT COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.appointment_date DESC), '[]'::jsonb)
    INTO result FROM (
        SELECT mr.*, a.appointment_date, a.appointment_time,
               d.first_name AS doctor_first_name, d.last_name AS doctor_last_name
        FROM medical_records mr
        JOIN appointments a ON mr.appointment_id = a.id
        JOIN doctors d ON mr.doctor_id = d.id
        WHERE mr.patient_id = (p_payload->>'patient_id')::integer AND mr.is_deleted = FALSE
    ) row_data;
END;
$procedure$;
-- Stored procedure for medical_record.update.
DROP PROCEDURE IF EXISTS clinicease_medical_record_update(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_medical_record_update(
    IN p_id integer,
    IN p_diagnosis text,
    IN p_prescription text,
    IN p_consultation_notes text,
    IN p_follow_up_date date,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'diagnosis', p_diagnosis,
        'prescription', p_prescription,
        'consultation_notes', p_consultation_notes,
        'follow_up_date', p_follow_up_date
    );
    UPDATE medical_records SET
        diagnosis = p_payload->>'diagnosis',
        prescription = p_payload->>'prescription',
        consultation_notes = p_payload->>'consultation_notes',
        follow_up_date = (p_payload->>'follow_up_date')::date
    WHERE id = (p_payload->>'id')::integer;
    result := to_jsonb(TRUE);
END;
$procedure$;
-- Stored procedure for patient.create.
DROP PROCEDURE IF EXISTS clinicease_patient_create(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_patient_create(
    IN p_user_id integer,
    IN p_first_name text,
    IN p_last_name text,
    IN p_date_of_birth date,
    IN p_gender text,
    IN p_address text,
    IN p_contact_number text,
    IN p_email text,
    IN p_blood_type text,
    IN p_allergies text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_patient_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'user_id', p_user_id,
        'patient', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'date_of_birth', p_date_of_birth, 'gender', p_gender, 'address', p_address, 'contact_number', p_contact_number, 'email', p_email, 'blood_type', p_blood_type, 'allergies', p_allergies)
    );
    INSERT INTO patients (
        user_id, first_name, last_name, date_of_birth, gender, address,
        contact_number, email, blood_type, allergies
    )
    VALUES (
        (p_payload->>'user_id')::integer,
        p_payload->'patient'->>'first_name',
        p_payload->'patient'->>'last_name',
        (p_payload->'patient'->>'date_of_birth')::date,
        p_payload->'patient'->>'gender',
        p_payload->'patient'->>'address',
        p_payload->'patient'->>'contact_number',
        p_payload->'patient'->>'email',
        p_payload->'patient'->>'blood_type',
        p_payload->'patient'->>'allergies'
    )
    RETURNING id INTO v_patient_id;
    result := to_jsonb(v_patient_id);
END;
$procedure$;
-- Stored procedure for patient.delete.
DROP PROCEDURE IF EXISTS clinicease_patient_delete(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_patient_delete(
    IN p_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id
    );
    UPDATE patients SET is_deleted = TRUE WHERE id = (p_payload->>'id')::integer;
    result := to_jsonb(TRUE);
END;
$procedure$;
-- Stored procedure for patient.find_by_id.
DROP PROCEDURE IF EXISTS clinicease_patient_find_by_id(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_patient_find_by_id(
    IN p_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id
    );
    SELECT to_jsonb(row_data) INTO result
    FROM (
        SELECT p.*, u.username
        FROM patients p JOIN users u ON p.user_id = u.id
        WHERE p.id = (p_payload->>'id')::integer AND p.is_deleted = FALSE
    ) row_data;
END;
$procedure$;
-- Stored procedure for patient.find_by_user_id.
DROP PROCEDURE IF EXISTS clinicease_patient_find_by_user_id(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_patient_find_by_user_id(
    IN p_user_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'user_id', p_user_id
    );
    SELECT to_jsonb(p) INTO result FROM patients p
    WHERE p.user_id = (p_payload->>'user_id')::integer AND p.is_deleted = FALSE;
END;
$procedure$;
-- Stored procedure for patient.list.
DROP PROCEDURE IF EXISTS clinicease_patient_list(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_patient_list(
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := '{}'::jsonb;
    SELECT COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.id), '[]'::jsonb)
    INTO result
    FROM (
        SELECT p.*, u.username
        FROM patients p JOIN users u ON p.user_id = u.id
        WHERE p.is_deleted = FALSE AND u.is_deleted = FALSE
    ) row_data;
END;
$procedure$;
-- Stored procedure for patient.update.
DROP PROCEDURE IF EXISTS clinicease_patient_update(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_patient_update(
    IN p_id integer,
    IN p_first_name text,
    IN p_last_name text,
    IN p_date_of_birth date,
    IN p_gender text,
    IN p_address text,
    IN p_contact_number text,
    IN p_email text,
    IN p_blood_type text,
    IN p_allergies text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'patient', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'date_of_birth', p_date_of_birth, 'gender', p_gender, 'address', p_address, 'contact_number', p_contact_number, 'email', p_email, 'blood_type', p_blood_type, 'allergies', p_allergies)
    );
    UPDATE patients SET
        first_name = p_payload->'patient'->>'first_name',
        last_name = p_payload->'patient'->>'last_name',
        date_of_birth = (p_payload->'patient'->>'date_of_birth')::date,
        gender = p_payload->'patient'->>'gender',
        address = p_payload->'patient'->>'address',
        contact_number = p_payload->'patient'->>'contact_number',
        email = p_payload->'patient'->>'email',
        blood_type = p_payload->'patient'->>'blood_type',
        allergies = p_payload->'patient'->>'allergies'
    WHERE id = (p_payload->>'id')::integer;
    result := to_jsonb(TRUE);
END;
$procedure$;
-- Stored procedure for patient.update_by_user_id.
DROP PROCEDURE IF EXISTS clinicease_patient_update_by_user_id(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_patient_update_by_user_id(
    IN p_user_id integer,
    IN p_first_name text,
    IN p_last_name text,
    IN p_date_of_birth date,
    IN p_gender text,
    IN p_address text,
    IN p_contact_number text,
    IN p_email text,
    IN p_blood_type text,
    IN p_allergies text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'user_id', p_user_id,
        'patient', jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'date_of_birth', p_date_of_birth, 'gender', p_gender, 'address', p_address, 'contact_number', p_contact_number, 'email', p_email, 'blood_type', p_blood_type, 'allergies', p_allergies)
    );
    UPDATE patients SET
        first_name = COALESCE(p_payload->'patient'->>'first_name', first_name),
        last_name = COALESCE(p_payload->'patient'->>'last_name', last_name),
        date_of_birth = COALESCE((p_payload->'patient'->>'date_of_birth')::date, date_of_birth),
        gender = COALESCE(p_payload->'patient'->>'gender', gender),
        address = COALESCE(p_payload->'patient'->>'address', address),
        contact_number = COALESCE(p_payload->'patient'->>'contact_number', contact_number),
        email = COALESCE(p_payload->'patient'->>'email', email),
        blood_type = COALESCE(p_payload->'patient'->>'blood_type', blood_type),
        allergies = COALESCE(p_payload->'patient'->>'allergies', allergies)
    WHERE user_id = (p_payload->>'user_id')::integer AND is_deleted = FALSE;
    result := to_jsonb(TRUE);
END;
$procedure$;
-- Stored procedure for report.appointments.
DROP PROCEDURE IF EXISTS clinicease_report_appointments(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_report_appointments(
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := '{}'::jsonb;
    SELECT jsonb_build_object(
        'total', (SELECT COUNT(*) FROM appointments WHERE is_deleted = FALSE),
        'byStatus', COALESCE((
            SELECT jsonb_agg(to_jsonb(row_data))
            FROM (
                SELECT status, COUNT(*)::text AS count FROM appointments
                WHERE is_deleted = FALSE GROUP BY status
            ) row_data
        ), '[]'::jsonb),
        'monthly', COALESCE((
            SELECT jsonb_agg(to_jsonb(row_data) ORDER BY row_data.month DESC)
            FROM (
                SELECT TO_CHAR(appointment_date, 'YYYY-MM') AS month, COUNT(*)::text AS count
                FROM appointments WHERE is_deleted = FALSE
                GROUP BY month ORDER BY month DESC LIMIT 6
            ) row_data
        ), '[]'::jsonb)
    ) INTO result;
END;
$procedure$;
-- Stored procedure for report.patients.
DROP PROCEDURE IF EXISTS clinicease_report_patients(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_report_patients(
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := '{}'::jsonb;
    SELECT jsonb_build_object(
        'totalPatients', (SELECT COUNT(*) FROM patients WHERE is_deleted = FALSE),
        'totalDoctors', (SELECT COUNT(*) FROM doctors WHERE is_deleted = FALSE),
        'newPatientsThisMonth', (
            SELECT COUNT(*) FROM patients
            WHERE is_deleted = FALSE AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
        )
    ) INTO result;
END;
$procedure$;
-- Stored procedure for user.create.
DROP PROCEDURE IF EXISTS clinicease_user_create(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_user_create(
    IN p_username text,
    IN p_password_hash text,
    IN p_role text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_user_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'username', p_username,
        'password_hash', p_password_hash,
        'role', p_role
    );
    INSERT INTO users (username, password_hash, role)
    VALUES (p_payload->>'username', p_payload->>'password_hash', p_payload->>'role')
    RETURNING id INTO v_user_id;
    result := to_jsonb(v_user_id);
END;
$procedure$;
-- Stored procedure for user.find_by_id.
DROP PROCEDURE IF EXISTS clinicease_user_find_by_id(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_user_find_by_id(
    IN p_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id
    );
    SELECT to_jsonb(u) INTO result FROM users u
    WHERE u.id = (p_payload->>'id')::integer AND u.is_deleted = FALSE;
END;
$procedure$;
-- Stored procedure for user.find_by_username.
DROP PROCEDURE IF EXISTS clinicease_user_find_by_username(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_user_find_by_username(
    IN p_username text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'username', p_username
    );
    SELECT to_jsonb(u) INTO result FROM users u
    WHERE u.username = p_payload->>'username' AND u.is_deleted = FALSE;
END;
$procedure$;
-- Stored procedure for user.update_password.
DROP PROCEDURE IF EXISTS clinicease_user_update_password(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_user_update_password(
    IN p_id integer,
    IN p_password_hash text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'password_hash', p_password_hash
    );
    UPDATE users SET password_hash = p_payload->>'password_hash'
    WHERE id = (p_payload->>'id')::integer;
    result := to_jsonb(TRUE);
END;
$procedure$;
-- Stored procedure for user.update_password_by_username.
DROP PROCEDURE IF EXISTS clinicease_user_update_password_by_username(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_user_update_password_by_username(
    IN p_password_hash text,
    IN p_username text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'password_hash', p_password_hash,
        'username', p_username
    );
    UPDATE users SET password_hash = p_payload->>'password_hash'
    WHERE username = p_payload->>'username';
    result := to_jsonb(TRUE);
END;
$procedure$;
-- Stored procedure for user.update_username.
DROP PROCEDURE IF EXISTS clinicease_user_update_username(jsonb);
CREATE OR REPLACE PROCEDURE clinicease_user_update_username(
    IN p_id integer,
    IN p_username text,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_user_id integer;
    p_payload jsonb;
BEGIN
    p_payload := jsonb_build_object(
        'id', p_id,
        'username', p_username
    );
    UPDATE users SET username = p_payload->>'username'
    WHERE id = (p_payload->>'id')::integer
      AND role = 'doctor' AND is_deleted = FALSE
    RETURNING id INTO v_user_id;
    result := to_jsonb(v_user_id IS NOT NULL);
END;
$procedure$;
