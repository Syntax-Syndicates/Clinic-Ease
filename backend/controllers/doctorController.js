// backend/controllers/doctorController.js
const doctorModel = require('../models/doctorModel');
const bcrypt = require('bcrypt');
const { parseSchedule, AvailabilityError } = require('../utils/appointmentAvailability');

const validateDoctorSchedule = (schedule) => {
    try {
        parseSchedule(schedule);
    } catch (error) {
        if (error instanceof AvailabilityError) return error.message;
        throw error;
    }
    return null;
};

const isValidEmail = (email) => typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const getAllDoctors = async (req, res) => {
    try {
        const doctors = await doctorModel.getAllDoctors(req.user.role === 'admin');
        res.json(doctors);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
};

const getDoctorById = async (req, res) => {
    try {
        const doctor = await doctorModel.getDoctorById(req.params.id, req.user.role === 'admin');
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.json(doctor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch doctor' });
    }
};

const createDoctor = async (req, res) => {
    try {
        const { first_name, last_name, specialization, schedule, contact_number, email, password } = req.body;
        if (!first_name || !last_name || !email || !password || !specialization || !schedule) {
            return res.status(400).json({ error: 'Name, email, password, specialization, and schedule are required.' });
        }
        if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid doctor email address.' });
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }
        const scheduleError = validateDoctorSchedule(schedule);
        if (scheduleError) return res.status(400).json({ error: scheduleError });
        const doctorData = { ...req.body, email: email.trim().toLowerCase() };
        const id = await doctorModel.createDoctor(doctorData, await bcrypt.hash(password, 10));
        res.status(201).json({ message: 'Doctor account created successfully', id });
    } catch (error) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }
        res.status(500).json({ error: 'Failed to create doctor' });
    }
};

const updateDoctor = async (req, res) => {
    try {
        const { first_name, last_name, specialization, schedule, contact_number, email, password } = req.body;
        if (!first_name || !last_name || !email || !specialization || !schedule) {
            return res.status(400).json({ error: 'Name, email, specialization, and schedule are required.' });
        }
        if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid doctor email address.' });
        if (password && password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }
        const scheduleError = validateDoctorSchedule(schedule);
        if (scheduleError) return res.status(400).json({ error: scheduleError });
        const existingDoctor = await doctorModel.getDoctorById(req.params.id, true);
        if (!existingDoctor) return res.status(404).json({ error: 'Doctor not found.' });
        if (!existingDoctor.has_account && !password) {
            return res.status(400).json({ error: 'A password is required to create this doctor account.' });
        }
        await doctorModel.updateDoctor(
            req.params.id,
            { ...req.body, email: email.trim().toLowerCase() },
            password ? await bcrypt.hash(password, 10) : null
        );
        res.json({ message: 'Doctor updated successfully' });
    } catch (error) {
        console.error(error);
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === '23505') {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }
        res.status(500).json({ error: 'Failed to update doctor' });
    }
};

const setDoctorActive = async (req, res) => {
    try {
        if (typeof req.body.is_active !== 'boolean') {
            return res.status(400).json({ error: 'is_active must be a boolean.' });
        }
        const updated = await doctorModel.setDoctorActive(req.params.id, req.body.is_active);
        if (!updated) return res.status(404).json({ error: 'Doctor not found.' });
        res.json({ message: `Doctor account ${req.body.is_active ? 'activated' : 'deactivated'} successfully.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update doctor account status' });
    }
};

const deleteDoctor = async (req, res) => {
    try {
        await doctorModel.deleteDoctor(req.params.id);
        res.json({ message: 'Doctor soft deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete doctor' });
    }
};

module.exports = { getAllDoctors, getDoctorById, createDoctor, updateDoctor, setDoctorActive, deleteDoctor };