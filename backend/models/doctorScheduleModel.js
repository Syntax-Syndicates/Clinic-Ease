const db = require('../config/db');

const getDoctorSchedule = async (doctorId) => {
    const result = await db.query(
        `SELECT d.schedule AS legacy_schedule,
                d.schedule_configured,
                d.appointment_duration_minutes,
                COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'weekday', s.weekday,
                        'start_time', s.start_time,
                        'end_time', s.end_time
                    ) ORDER BY s.weekday, s.start_time)
                    FROM doctor_schedules s
                    WHERE s.doctor_id = d.id
                ), '[]'::jsonb) AS working_days,
                COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', u.id,
                        'unavailable_date', u.unavailable_date,
                        'reason', u.reason
                    ) ORDER BY u.unavailable_date)
                    FROM doctor_unavailability u
                    WHERE u.doctor_id = d.id
                ), '[]'::jsonb) AS unavailable_dates
         FROM doctors d
         WHERE d.id = $1 AND d.is_deleted = FALSE`,
        [doctorId]
    );
    return result.rows[0] || null;
};

const saveDoctorSchedule = async (doctorId, workingDays, appointmentDurationMinutes) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock($1, 0)', [doctorId]);
        const doctor = await client.query(
            'SELECT id FROM doctors WHERE id = $1 AND is_deleted = FALSE FOR UPDATE',
            [doctorId]
        );
        if (!doctor.rowCount) {
            await client.query('ROLLBACK');
            return false;
        }

        await client.query('DELETE FROM doctor_schedules WHERE doctor_id = $1', [doctorId]);
        for (const day of workingDays) {
            await client.query(
                `INSERT INTO doctor_schedules (doctor_id, weekday, start_time, end_time)
                 VALUES ($1, $2, $3, $4)`,
                [doctorId, day.weekday, day.start_time, day.end_time]
            );
        }
        await client.query(
            `UPDATE doctors
             SET schedule_configured = TRUE, appointment_duration_minutes = $2
             WHERE id = $1`,
            [doctorId, appointmentDurationMinutes]
        );
        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const addUnavailableDate = async (doctorId, date, reason) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock($1, 0)', [doctorId]);
        const result = await client.query(
            `INSERT INTO doctor_unavailability (doctor_id, unavailable_date, reason)
             VALUES ($1, $2, $3)
             ON CONFLICT (doctor_id, unavailable_date) DO UPDATE SET reason = EXCLUDED.reason
             RETURNING id, unavailable_date, reason`,
            [doctorId, date, reason]
        );
        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const deleteUnavailableDate = async (doctorId, unavailableId) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock($1, 0)', [doctorId]);
        const result = await client.query(
            'DELETE FROM doctor_unavailability WHERE id = $1 AND doctor_id = $2 RETURNING id',
            [unavailableId, doctorId]
        );
        await client.query('COMMIT');
        return result.rowCount > 0;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    getDoctorSchedule,
    saveDoctorSchedule,
    addUnavailableDate,
    deleteUnavailableDate,
};
