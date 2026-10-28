// backend/controllers/appointmentController.js
const appointmentModel = require('../models/appointmentModel');

const getAllAppointments = async (req, res) => {
    try {
        const appointments = await appointmentModel.getAllAppointments();
        res.json(appointments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
};

const getUserAppointments = async (req, res) => {
    try {
        const patientId = req.user.patientId;
        if (!patientId) {
            return res.status(400).json({ error: 'No patient profile found' });
        }
        const appointments = await appointmentModel.getAppointmentsByPatientId(patientId);
        res.json(appointments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
};

const getAppointmentById = async (req, res) => {
    try {
        const appointment = await appointmentModel.getAppointmentById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        res.json(appointment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch appointment' });
    }
};

const createAppointment = async (req, res) => {
    try {
        let patient_id = req.body.patient_id;
        if (req.user.role === 'patient') {
            patient_id = req.user.patientId;
            if (!patient_id) {
                return res.status(400).json({ error: 'Patient profile not found' });
            }
        }
        const appointmentData = { ...req.body, patient_id };
        const id = await appointmentModel.createAppointment(appointmentData);
        res.status(201).json({ message: 'Appointment booked successfully', id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create appointment' });
    }
};

const updateAppointment = async (req, res) => {
    try {
        await appointmentModel.updateAppointment(req.params.id, req.body);
        res.json({ message: 'Appointment updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update appointment' });
    }
};

const deleteAppointment = async (req, res) => {
    try {
        await appointmentModel.deleteAppointment(req.params.id);
        res.json({ message: 'Appointment cancelled (soft delete) successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to cancel appointment' });
    }
};

module.exports = { getAllAppointments, getUserAppointments, getAppointmentById, createAppointment, updateAppointment, deleteAppointment };