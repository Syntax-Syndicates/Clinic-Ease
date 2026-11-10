// backend/models/medicalRecordModel.js
const db = require('../config/db');

const getMedicalRecordsByPatientId = async (patientId) => {
    const result = await db.query(
        `SELECT mr.*,
                a.appointment_date, a.appointment_time,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name
         FROM medical_records mr
         JOIN appointments a ON mr.appointment_id = a.id
         JOIN doctors d ON mr.doctor_id = d.id
         WHERE mr.patient_id = $1 AND mr.is_deleted = FALSE
         ORDER BY a.appointment_date DESC`,
        [patientId]
    );
    return result.rows;
};

const getMedicalRecordById = async (id) => {
    const result = await db.query(
        'SELECT * FROM medical_records WHERE id = $1 AND is_deleted = FALSE',
        [id]
    );
    return result.rows[0];
};

// NEW: Check by appointment_id
const getMedicalRecordByAppointmentId = async (appointmentId) => {
    const result = await db.query(
        'SELECT * FROM medical_records WHERE appointment_id = $1 AND is_deleted = FALSE',
        [appointmentId]
    );
    return result.rows[0];
};

const createMedicalRecord = async (recordData) => {
    const { appointment_id, patient_id, doctor_id, diagnosis, prescription, consultation_notes, follow_up_date } = recordData;
    const result = await db.query(
        `INSERT INTO medical_records (appointment_id, patient_id, doctor_id, diagnosis, prescription, consultation_notes, follow_up_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [appointment_id, patient_id, doctor_id, diagnosis, prescription, consultation_notes, follow_up_date]
    );
    return result.rows[0].id;
};

const updateMedicalRecord = async (id, recordData) => {
    const { diagnosis, prescription, consultation_notes, follow_up_date } = recordData;
    await db.query(
        `UPDATE medical_records SET
            diagnosis = $1, prescription = $2, consultation_notes = $3, follow_up_date = $4
         WHERE id = $5`,
        [diagnosis, prescription, consultation_notes, follow_up_date, id]
    );
};

const deleteMedicalRecord = async (id) => {
    await db.query('UPDATE medical_records SET is_deleted = TRUE WHERE id = $1', [id]);
};

module.exports = {
    getMedicalRecordsByPatientId,
    getMedicalRecordById,
    getMedicalRecordByAppointmentId,
    createMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord
};