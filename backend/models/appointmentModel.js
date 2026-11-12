// backend/models/appointmentModel.js
const db = require('../config/db');
const {
    AvailabilityError,
    assertAppointmentAvailableBySchedule,
    getAvailableSlots,
    hasOverlap,
    SLOT_DURATION_MINUTES,
} = require('../utils/appointmentAvailability');

const getAllAppointments = async () => {
    const result = await db.query(
        `SELECT a.*,
                p.first_name as patient_first_name, p.last_name as patient_last_name,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN doctors d ON a.doctor_id = d.id
         WHERE a.is_deleted = FALSE
         ORDER BY a.appointment_date DESC, a.appointment_time ASC`
    );
    return result.rows;
};

const getAppointmentsByPatientId = async (patientId) => {
    const result = await db.query(
        `SELECT a.*,
                p.first_name as patient_first_name, p.last_name as patient_last_name,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name,
                d.specialization
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN doctors d ON a.doctor_id = d.id
         WHERE a.patient_id = $1 AND a.is_deleted = FALSE
         ORDER BY a.appointment_date DESC, a.appointment_time ASC`,
        [patientId]
    );
    return result.rows;
};

const getAppointmentById = async (id) => {
    const result = await db.query(
        `SELECT a.*,
                p.first_name as patient_first_name, p.last_name as patient_last_name,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN doctors d ON a.doctor_id = d.id
         WHERE a.id = $1 AND a.is_deleted = FALSE`,
        [id]
    );
    return result.rows[0];
};

const getAppointmentAvailability = async (doctorId, appointmentDate) => {
    const doctorResult = await db.query(
        'SELECT schedule FROM doctors WHERE id = $1 AND is_deleted = FALSE',
        [doctorId]
    );
    if (!doctorResult.rows[0]) return null;

    const appointmentResult = await db.query(
        `SELECT appointment_time
         FROM appointments
         WHERE doctor_id = $1
           AND appointment_date = $2
           AND is_deleted = FALSE
           AND status IS DISTINCT FROM 'cancelled'`,
        [doctorId, appointmentDate]
    );

    return {
        doctor_id: Number(doctorId),
        date: appointmentDate,
        slot_duration_minutes: SLOT_DURATION_MINUTES,
        available_slots: getAvailableSlots(
            doctorResult.rows[0].schedule,
            appointmentDate,
            appointmentResult.rows.map((appointment) => appointment.appointment_time)
        ),
    };
};

const createAppointment = async (appointmentData) => {
    const { patient_id, doctor_id, appointment_date, appointment_time, status, notes } = appointmentData;
    const client = await db.connect();
    let transactionStarted = false;
    try {
        await client.query('BEGIN');
        transactionStarted = true;
        await client.query(
            'SELECT pg_advisory_xact_lock($1::integer, hashtext($2))',
            [doctor_id, appointment_date]
        );

        const doctorResult = await client.query(
            'SELECT schedule FROM doctors WHERE id = $1 AND is_deleted = FALSE',
            [doctor_id]
        );
        if (!doctorResult.rows[0]) {
            throw new AvailabilityError('Doctor not found.', 404);
        }
        const start = assertAppointmentAvailableBySchedule(
            doctorResult.rows[0].schedule,
            appointment_date,
            appointment_time
        );

        const patientResult = await client.query(
            'SELECT id FROM patients WHERE id = $1 AND is_deleted = FALSE',
            [patient_id]
        );
        if (!patientResult.rows[0]) {
            throw new AvailabilityError('Patient not found.', 404);
        }

        const occupiedResult = await client.query(
            `SELECT appointment_time
             FROM appointments
             WHERE doctor_id = $1
               AND appointment_date = $2
               AND is_deleted = FALSE
               AND status IS DISTINCT FROM 'cancelled'`,
            [doctor_id, appointment_date]
        );
        if (hasOverlap(
            `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
            occupiedResult.rows.map((appointment) => appointment.appointment_time)
        )) {
            throw new AvailabilityError('The selected appointment slot is no longer available.', 409);
        }

        const result = await client.query(
            `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, notes)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [patient_id, doctor_id, appointment_date, appointment_time, status || 'pending', notes || null]
        );
        await client.query('COMMIT');
        return result.rows[0].id;
    } catch (error) {
        if (transactionStarted) await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const updateAppointment = async (id, appointmentData) => {
    const { patient_id, doctor_id, appointment_date, appointment_time, status, notes } = appointmentData;
    const client = await db.connect();
    let transactionStarted = false;
    try {
        await client.query('BEGIN');
        transactionStarted = true;
        await client.query(
            'SELECT pg_advisory_xact_lock($1::integer, hashtext($2))',
            [doctor_id, appointment_date]
        );

        const appointmentResult = await client.query(
            'SELECT id FROM appointments WHERE id = $1 AND is_deleted = FALSE FOR UPDATE',
            [id]
        );
        if (!appointmentResult.rows[0]) {
            throw new AvailabilityError('Appointment not found.', 404);
        }

        if (status !== 'cancelled') {
            const doctorResult = await client.query(
                'SELECT schedule FROM doctors WHERE id = $1 AND is_deleted = FALSE',
                [doctor_id]
            );
            if (!doctorResult.rows[0]) {
                throw new AvailabilityError('Doctor not found.', 404);
            }
            const start = assertAppointmentAvailableBySchedule(
                doctorResult.rows[0].schedule,
                appointment_date,
                appointment_time
            );
            const occupiedResult = await client.query(
                `SELECT appointment_time
                 FROM appointments
                 WHERE doctor_id = $1
                   AND appointment_date = $2
                   AND id <> $3
                   AND is_deleted = FALSE
                   AND status IS DISTINCT FROM 'cancelled'`,
                [doctor_id, appointment_date, id]
            );
            if (hasOverlap(
                `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
                occupiedResult.rows.map((appointment) => appointment.appointment_time)
            )) {
                throw new AvailabilityError('The selected appointment slot is no longer available.', 409);
            }
        }

        await client.query(
            `UPDATE appointments SET
                patient_id = $1, doctor_id = $2, appointment_date = $3, appointment_time = $4, status = $5, notes = $6
             WHERE id = $7`,
            [patient_id, doctor_id, appointment_date, appointment_time, status, notes, id]
        );
        await client.query('COMMIT');
    } catch (error) {
        if (transactionStarted) await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const deleteAppointment = async (id) => {
    await db.query('UPDATE appointments SET is_deleted = TRUE WHERE id = $1', [id]);
};

module.exports = {
    getAllAppointments,
    getAppointmentsByPatientId,
    getAppointmentById,
    getAppointmentAvailability,
    createAppointment,
    updateAppointment,
    deleteAppointment,
};