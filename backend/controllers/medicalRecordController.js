// backend/controllers/medicalRecordController.js
const medicalRecordModel = require('../models/medicalRecordModel');

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
        const { appointment_id, patient_id, doctor_id } = req.body;
        if (![appointment_id, patient_id, doctor_id].every((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0)) {
            return res.status(400).json({ error: 'Appointment, patient, and doctor IDs are required.' });
        }
        const result = await medicalRecordModel.createMedicalRecord(req.body);
        if (result.status === 'not_found') {
            return res.status(404).json({ error: 'Appointment not found.' });
        }
        if (result.status === 'appointment_mismatch') {
            return res.status(400).json({ error: 'Patient and doctor must match the appointment.' });
        }
        if (result.status === 'appointment_not_approved') {
            return res.status(409).json({ error: 'A medical record can only be added to an approved appointment.' });
        }
        if (result.status === 'already_exists') {
            return res.status(409).json({ error: 'A medical record already exists for this appointment.' });
        }

        res.status(201).json({ message: 'Medical record created successfully', id: result.id });
    } catch (error) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'A medical record already exists for this appointment.' });
        }
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