// backend/routes/appointmentRoutes.js
const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { verifyToken, checkRole } = require('../middleware/auth');

router.get('/', verifyToken, (req, res, next) => {
    if (req.user.role === 'admin') {
        appointmentController.getAllAppointments(req, res, next);
    } else {
        appointmentController.getUserAppointments(req, res, next);
    }
});
router.get('/:id', verifyToken, appointmentController.getAppointmentById);
router.post('/', verifyToken, appointmentController.createAppointment);
router.put('/:id', verifyToken, checkRole(['admin']), appointmentController.updateAppointment);
router.delete('/:id', verifyToken, appointmentController.deleteAppointment);

module.exports = router;