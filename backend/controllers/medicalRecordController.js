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
    try {
        const { appointment_id, patient_id, doctor_id, diagnosis, prescription, consultation_notes, follow_up_date } = req.body;

        // Check if a medical record already exists for this appointment
        const existing = await medicalRecordModel.getMedicalRecordByAppointmentId(appointment_id);
        if (existing) {
            return res.status(400).json({ error: 'A medical record already exists for this appointment' });
        }

        // Insert the medical record
        const id = await medicalRecordModel.createMedicalRecord(req.body);

        // Update the appointment status to 'completed'
        await db.query(
            'UPDATE appointments SET status = $1 WHERE id = $2',
            ['completed', appointment_id]
        );

        res.status(201).json({ message: 'Medical record created successfully', id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create medical record' });
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