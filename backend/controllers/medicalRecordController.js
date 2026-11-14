// backend/controllers/medicalRecordController.js
const medicalRecordModel = require('../models/medicalRecordModel');
const db = require('../config/db');

const getMedicalRecords = async (req, res) => {
    try {
        let patientId = req.params.patientId;
        if (req.user.role === 'patient') {
            patientId = req.user.patientId;
        }
        const records = await medicalRecordModel.getMedicalRecordsByPatientId(patientId);
        res.json(records);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch medical records' });
    }
};

const createMedicalRecord = async (req, res) => {
    let client;
    let transactionStarted = false;
    try {
        const { appointment_id, patient_id, doctor_id, diagnosis, prescription, consultation_notes, follow_up_date } = req.body;
        if (![appointment_id, patient_id, doctor_id].every((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0)) {
            return res.status(400).json({ error: 'Appointment, patient, and doctor IDs are required.' });
        }
        client = await db.connect();
        await client.query('BEGIN');
        transactionStarted = true;
        const appointmentResult = await client.query(
            `SELECT patient_id, doctor_id, status FROM appointments
             WHERE id = $1 AND is_deleted = FALSE FOR UPDATE`,
            [appointment_id]
        );
        const appointment = appointmentResult.rows[0];
        if (!appointment) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(404).json({ error: 'Appointment not found.' });
        }
        if (Number(appointment.patient_id) !== Number(patient_id) || Number(appointment.doctor_id) !== Number(doctor_id)) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(400).json({ error: 'Patient and doctor must match the appointment.' });
        }
        if (appointment.status !== 'approved') {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(409).json({ error: 'A medical record can only be added to an approved appointment.' });
        }

        const existing = await client.query(
            'SELECT id FROM medical_records WHERE appointment_id = $1 AND is_deleted = FALSE',
            [appointment_id]
        );
        if (existing.rows[0]) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(409).json({ error: 'A medical record already exists for this appointment.' });
        }
        await client.query(
            "UPDATE appointments SET status = 'completed' WHERE id = $1",
            [appointment_id]
        );
        const id = await medicalRecordModel.createMedicalRecord(req.body, client);
        await client.query('COMMIT');
        transactionStarted = false;

        res.status(201).json({ message: 'Medical record created successfully', id });
    } catch (error) {
        if (transactionStarted && client) await client.query('ROLLBACK');
        console.error(error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'A medical record already exists for this appointment.' });
        }
        res.status(500).json({ error: 'Failed to create medical record' });
    } finally {
        if (client) client.release();
    }
};

const updateMedicalRecord = async (req, res) => {
    try {
        await medicalRecordModel.updateMedicalRecord(req.params.id, req.body);
        res.json({ message: 'Medical record updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update medical record' });
    }
};

const deleteMedicalRecord = async (req, res) => {
    try {
        await medicalRecordModel.deleteMedicalRecord(req.params.id);
        res.json({ message: 'Medical record soft deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete medical record' });
    }
};

// admin-only: get single medical record by id
const getMedicalRecordById = async (req, res) => {
    try {
        const record = await medicalRecordModel.getMedicalRecordById(req.params.id);
        if (!record) return res.status(404).json({ error: 'Medical record not found' });
        res.json(record);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch medical record' });
    }
};

module.exports = { getMedicalRecords, getMedicalRecordById, createMedicalRecord, updateMedicalRecord, deleteMedicalRecord };