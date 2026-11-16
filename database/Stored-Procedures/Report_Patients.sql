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
