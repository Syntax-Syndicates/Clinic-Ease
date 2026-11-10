// backend/routes/doctorRoutes.js
const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { verifyToken, checkRole } = require('../middleware/auth');

router.get('/', verifyToken, doctorController.getAllDoctors);
router.get('/:id', verifyToken, doctorController.getDoctorById);
router.post('/', verifyToken, checkRole(['admin']), doctorController.createDoctor);
router.put('/:id', verifyToken, checkRole(['admin']), doctorController.updateDoctor);
router.delete('/:id', verifyToken, checkRole(['admin']), doctorController.deleteDoctor);

module.exports = router;