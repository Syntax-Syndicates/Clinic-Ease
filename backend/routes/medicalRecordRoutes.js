// backend/routes/medicalRecordRoutes.js
const express = require('express');
const router = express.Router();
const medicalRecordController = require('../controllers/medicalRecordController');
const { verifyToken, checkRole } = require('../middleware/auth');

// Get a single medical record by its own ID (admin only)
router.get('/record/:id', verifyToken, checkRole(['admin']), medicalRecordController.getMedicalRecordById);

// Get all medical records for a patient (patient can view own, admin any)
router.get('/:patientId', verifyToken, medicalRecordController.getMedicalRecords);

// Create, update, delete
router.post('/', verifyToken, checkRole(['admin']), medicalRecordController.createMedicalRecord);
router.put('/:id', verifyToken, checkRole(['admin']), medicalRecordController.updateMedicalRecord);
router.delete('/:id', verifyToken, checkRole(['admin']), medicalRecordController.deleteMedicalRecord);

module.exports = router;