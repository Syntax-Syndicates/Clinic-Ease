// backend/routes/patientRoutes.js
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { verifyToken, checkRole } = require('../middleware/auth');

router.get('/', verifyToken, checkRole(['admin']), patientController.getAllPatients);
router.get('/:id', verifyToken, checkRole(['admin']), patientController.getPatientById);
router.post('/', verifyToken, checkRole(['admin']), patientController.createPatient);
router.put('/:id', verifyToken, checkRole(['admin']), patientController.updatePatient);
router.delete('/:id', verifyToken, checkRole(['admin']), patientController.deletePatient);

module.exports = router;