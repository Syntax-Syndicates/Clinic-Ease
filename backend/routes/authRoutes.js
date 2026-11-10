// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, checkRole } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', verifyToken, authController.getProfile);
router.put('/me', verifyToken, checkRole(['patient']), authController.updateProfile);
router.put('/change-password', verifyToken, authController.changePassword);

module.exports = router;