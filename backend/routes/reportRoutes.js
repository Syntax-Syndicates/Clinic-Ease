// backend/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, checkRole } = require('../middleware/auth');

router.get('/appointments', verifyToken, checkRole(['admin']), reportController.getAppointmentReport);
router.get('/patients', verifyToken, checkRole(['admin']), reportController.getPatientReport);

module.exports = router;