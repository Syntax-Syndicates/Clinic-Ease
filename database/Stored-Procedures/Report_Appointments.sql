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
