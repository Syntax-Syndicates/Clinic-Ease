// backend/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const patientModel = require('../models/patientModel');

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const user = await userModel.findUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Get patient info if role is patient
        let patientInfo = null;
        if (user.role === 'patient') {
            patientInfo = await patientModel.getPatientByUserId(user.id);
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, patientId: patientInfo?.id || null },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                patientId: patientInfo?.id || null
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

const register = async (req, res) => {
    try {
        const { username, password, first_name, last_name, date_of_birth, gender, address, contact_number, email, blood_type, allergies } = req.body;

        if (!username || !password || !first_name || !last_name) {
            return res.status(400).json({ error: 'Required fields missing' });
        }

        const existingUser = await userModel.findUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await userModel.createUser(username, hashedPassword, 'patient');

        await patientModel.createPatient({
            first_name, last_name, date_of_birth, gender, address, contact_number, email, blood_type, allergies
        }, userId);

        res.status(201).json({ message: 'Registration successful. Please login.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};

const getProfile = async (req, res) => {
    try {
        const profile = {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role,
            patientId: req.user.patientId || null,
        };

        if (req.user.role === 'patient') {
            const patient = await patientModel.getPatientByUserId(req.user.id);
            if (patient) {
                profile.patient = patient;
            }
        }

        res.json(profile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

const updateProfile = async (req, res) => {
    try {
        if (req.user.role !== 'patient') {
            return res.status(403).json({ error: 'Only patients can update profile details' });
        }

        const patient = await patientModel.getPatientByUserId(req.user.id);
        if (!patient) {
            return res.status(404).json({ error: 'Patient profile not found' });
        }

        const updateData = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            date_of_birth: req.body.date_of_birth,
            gender: req.body.gender,
            address: req.body.address,
            contact_number: req.body.contact_number,
            email: req.body.email,
            blood_type: req.body.blood_type,
            allergies: req.body.allergies,
        };

        await patientModel.updatePatientByUserId(req.user.id, updateData);
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }
        if (currentPassword === newPassword) {
            return res.status(400).json({ error: 'New password must be different from current password' });
        }

        const user = await userModel.findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await userModel.updatePassword(req.user.id, hashedPassword);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};

module.exports = { login, register, getProfile, updateProfile, changePassword };