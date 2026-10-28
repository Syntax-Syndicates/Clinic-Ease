// backend/models/appointmentModel.js
const db = require('../config/db');

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

const createAppointment = async (appointmentData) => {
    const { patient_id, doctor_id, appointment_date, appointment_time, status, notes } = appointmentData;
    const result = await db.query(
        `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [patient_id, doctor_id, appointment_date, appointment_time, status || 'pending', notes]
    );
    return result.rows[0].id;
};

const updateAppointment = async (id, appointmentData) => {
    const { patient_id, doctor_id, appointment_date, appointment_time, status, notes } = appointmentData;
    await db.query(
        `UPDATE appointments SET
            patient_id = $1, doctor_id = $2, appointment_date = $3, appointment_time = $4, status = $5, notes = $6
         WHERE id = $7`,
        [patient_id, doctor_id, appointment_date, appointment_time, status, notes, id]
    );
};

const deleteAppointment = async (id) => {
    await db.query('UPDATE appointments SET is_deleted = TRUE WHERE id = $1', [id]);
};

module.exports = { getAllAppointments, getAppointmentsByPatientId, getAppointmentById, createAppointment, updateAppointment, deleteAppointment };