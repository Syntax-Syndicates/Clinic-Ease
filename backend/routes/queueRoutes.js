const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { verifyToken, checkRole } = require('../middleware/auth');

router.get('/me', verifyToken, checkRole(['patient']), queueController.getPatientQueue);
router.get('/', verifyToken, checkRole(['admin', 'doctor']), queueController.getQueue);
router.post('/walk-ins', verifyToken, checkRole(['admin']), queueController.registerWalkIn);
router.put('/:id/status', verifyToken, checkRole(['admin', 'doctor']), queueController.updateQueueStatus);

module.exports = router;
