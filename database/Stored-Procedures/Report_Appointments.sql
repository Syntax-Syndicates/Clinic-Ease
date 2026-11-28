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
        'todayAppointments', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'appointment_time', a.appointment_time,
                    'patient_name', CONCAT_WS(' ', p.first_name, p.last_name),
                    'doctor_name', CONCAT_WS(' ', d.first_name, d.last_name),
                    'status', a.status
                )
                ORDER BY a.appointment_time
            )
            FROM appointments a
            JOIN patients p ON p.id = a.patient_id
            JOIN doctors d ON d.id = a.doctor_id
            WHERE a.appointment_date = CURRENT_DATE
              AND a.is_deleted = FALSE
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
