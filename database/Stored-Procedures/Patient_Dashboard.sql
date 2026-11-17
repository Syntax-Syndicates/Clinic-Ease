-- Stored procedure for patient.dashboard.
DROP PROCEDURE IF EXISTS clinicease_patient_dashboard(integer);
CREATE OR REPLACE PROCEDURE clinicease_patient_dashboard(
    IN p_user_id integer,
    OUT result jsonb
)
LANGUAGE plpgsql
AS $procedure$
BEGIN
    SELECT jsonb_build_object(
        'patient', jsonb_build_object(
            'id', p.id,
            'first_name', p.first_name,
            'last_name', p.last_name,
            'date_of_birth', p.date_of_birth,
            'gender', p.gender,
            'address', p.address,
            'contact_number', p.contact_number,
            'email', p.email,
            'blood_type', p.blood_type,
            'allergies', p.allergies
        ),
        'total_appointments', (
            SELECT COUNT(*)
            FROM appointments a
            WHERE a.patient_id = p.id
              AND a.is_deleted = FALSE
        ),
        'upcoming_appointments', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', a.id,
                    'appointment_date', a.appointment_date,
                    'appointment_time', a.appointment_time,
                    'status', a.status,
                    'doctor_id', d.id,
                    'doctor_first_name', d.first_name,
                    'doctor_last_name', d.last_name,
                    'specialization', d.specialization
                )
                ORDER BY a.appointment_date, a.appointment_time
            )
            FROM appointments a
            JOIN doctors d ON d.id = a.doctor_id
            WHERE a.patient_id = p.id
              AND a.is_deleted = FALSE
              AND a.status IN ('pending', 'approved')
              AND (
                  a.appointment_date > CURRENT_DATE
                  OR (
                      a.appointment_date = CURRENT_DATE
                      AND a.appointment_time > LOCALTIME
                  )
              )
        ), '[]'::jsonb),
        'completed_appointments', (
            SELECT COUNT(*)
            FROM appointments a
            WHERE a.patient_id = p.id
              AND a.is_deleted = FALSE
              AND a.status = 'completed'
        ),
        'next_follow_up_date', (
            SELECT MIN(mr.follow_up_date)
            FROM medical_records mr
            WHERE mr.patient_id = p.id
              AND mr.is_deleted = FALSE
              AND mr.follow_up_date >= CURRENT_DATE
        )
    )
    INTO result
    FROM patients p
    WHERE p.user_id = p_user_id
      AND p.is_deleted = FALSE;
END;
$procedure$;
