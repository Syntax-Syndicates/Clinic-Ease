// backend/controllers/patientController.js
const patientModel = require('../models/patientModel');

const getAllPatients = async (req, res) => {
    try {
        const patients = await patientModel.getAllPatients();
        res.json(patients);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch patients' });
    }
};

const getPatientById = async (req, res) => {
    try {
        const patient = await patientModel.getPatientById(req.params.id);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.json(patient);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch patient' });
    }
};

const createPatient = async (req, res) => {
    try {
        const { username, password, ...patientData } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Generate a random password if none provided
        let finalPassword = password;
        let generatedPassword = null;
        if (!finalPassword) {
            // 8-character random alphanumeric password
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let randomPass = '';
            for (let i = 0; i < 8; i++) {
                randomPass += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            finalPassword = randomPass;
            generatedPassword = randomPass;
        }

        const userModel = require('../models/userModel');
        const bcrypt = require('bcrypt');

        const existingUser = await userModel.findUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(finalPassword, 10);
        const userId = await userModel.createUser(username, hashedPassword, 'patient');
        const patientId = await patientModel.createPatient(patientData, userId);

        // Send back generated password only if it was auto-generated
        const response = { message: 'Patient created successfully', id: patientId };
        if (generatedPassword) {
            response.generatedPassword = generatedPassword;
        }
        res.status(201).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create patient' });
    }
};

const updatePatient = async (req, res) => {
    try {
        await patientModel.updatePatient(req.params.id, req.body);
        res.json({ message: 'Patient updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update patient' });
    }
};

const deletePatient = async (req, res) => {
    try {
        await patientModel.deletePatient(req.params.id);
        res.json({ message: 'Patient soft deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete patient' });
    }
};

module.exports = { getAllPatients, getPatientById, createPatient, updatePatient, deletePatient };