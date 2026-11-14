// backend/routes/appointmentRoutes.js
const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { verifyToken, checkRole } = require('../middleware/auth');

router.get('/', verifyToken, (req, res, next) => {
    if (!['admin', 'patient', 'doctor'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Access forbidden: insufficient permissions' });
    }
    appointmentController.getAllAppointments(req, res, next);
});
router.get('/availability', verifyToken, checkRole(['admin', 'patient']), appointmentController.getAppointmentAvailability);
router.get('/:id', verifyToken, appointmentController.getAppointmentById);
router.post('/', verifyToken, appointmentController.createAppointment);
router.post('/:id/decision', verifyToken, checkRole(['doctor']), appointmentController.decideAppointment);
router.put('/:id', verifyToken, checkRole(['admin']), appointmentController.updateAppointment);
router.delete('/:id', verifyToken, checkRole(['admin', 'patient']), appointmentController.deleteAppointment);

module.exports = router;