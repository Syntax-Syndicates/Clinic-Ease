// backend/routes/doctorRoutes.js
const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const doctorScheduleController = require('../controllers/doctorScheduleController');
const { verifyToken, checkRole } = require('../middleware/auth');

router.get('/', verifyToken, doctorController.getAllDoctors);
router.get('/me/schedule', verifyToken, checkRole(['doctor']), doctorScheduleController.getMySchedule);
router.put('/me/schedule', verifyToken, checkRole(['doctor']), doctorScheduleController.updateMySchedule);
router.post('/me/unavailability', verifyToken, checkRole(['doctor']), doctorScheduleController.addUnavailableDate);
router.delete('/me/unavailability/:id', verifyToken, checkRole(['doctor']), doctorScheduleController.deleteUnavailableDate);
router.get('/:id', verifyToken, doctorController.getDoctorById);
router.post('/', verifyToken, checkRole(['admin']), doctorController.createDoctor);
router.put('/:id', verifyToken, checkRole(['admin']), doctorController.updateDoctor);
router.patch('/:id/status', verifyToken, checkRole(['admin']), doctorController.setDoctorActive);
router.delete('/:id', verifyToken, checkRole(['admin']), doctorController.deleteDoctor);

module.exports = router;