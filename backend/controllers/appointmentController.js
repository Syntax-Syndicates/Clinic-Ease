// backend/controllers/appointmentController.js
const appointmentModel = require('../models/appointmentModel');
const { AvailabilityError, parseDate, parseTime } = require('../utils/appointmentAvailability');

const validId = (value) => {
    if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0;
    return typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
};

const respondWithAppointmentError = (res, error, fallbackMessage) => {
    if (error instanceof AvailabilityError) {
        return res.status(error.status).json({ error: error.message });
    }
    if (error.code === '23505' && error.constraint === 'uq_appointments_active_doctor_slot') {
        return res.status(409).json({ error: 'The selected appointment slot is no longer available.' });
    }
    if (error.code === '23503') {
        return res.status(400).json({ error: 'The selected patient or doctor does not exist.' });
    }
    console.error(error);
    return res.status(500).json({ error: fallbackMessage });
};

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

const getAppointmentAvailability = async (req, res) => {
    try {
        const { doctor_id, date } = req.query;
        if (!validId(doctor_id)) {
            return res.status(400).json({ error: 'doctor_id must be a positive integer.' });
        }
        parseDate(date);
        const availability = await appointmentModel.getAppointmentAvailability(Number(doctor_id), date);
        if (!availability) {
            return res.status(404).json({ error: 'Doctor not found.' });
        }
        res.json(availability);
    } catch (error) {
        return respondWithAppointmentError(res, error, 'Failed to check appointment availability');
    }
};

const createAppointment = async (req, res) => {
    try {
        const { doctor_id, appointment_date, appointment_time } = req.body;
        if (!validId(doctor_id)) {
            return res.status(400).json({ error: 'doctor_id must be a positive integer.' });
        }
        if (!appointment_date) {
            return res.status(400).json({ error: 'appointment_date is required.' });
        }
        if (!appointment_time) {
            return res.status(400).json({ error: 'appointment_time is required.' });
        }
        parseDate(appointment_date);
        parseTime(appointment_time);

        let patient_id = req.body.patient_id;
        if (req.user.role === 'patient') {
            patient_id = req.user.patientId;
            if (!patient_id) {
                return res.status(400).json({ error: 'Patient profile not found' });
            }
        } else if (!validId(patient_id)) {
            return res.status(400).json({ error: 'patient_id must be a positive integer.' });
        }

        const status = req.user.role === 'patient' ? 'pending' : (req.body.status || 'pending');
        if (!['pending', 'confirmed'].includes(status)) {
            return res.status(400).json({ error: 'New appointments must be pending or confirmed.' });
        }
        const appointmentData = {
            ...req.body,
            patient_id: Number(patient_id),
            doctor_id: Number(doctor_id),
            status,
        };
        const id = await appointmentModel.createAppointment(appointmentData);
        res.status(201).json({ message: 'Appointment booked successfully', id });
    } catch (error) {
        return respondWithAppointmentError(res, error, 'Failed to create appointment');
    }
};

const updateAppointment = async (req, res) => {
    try {
        const { patient_id, doctor_id, appointment_date, appointment_time, status } = req.body;
        if (!validId(req.params.id) || !validId(patient_id) || !validId(doctor_id)) {
            return res.status(400).json({ error: 'Appointment, patient, and doctor IDs must be positive integers.' });
        }
        if (!appointment_date || !appointment_time || !status) {
            return res.status(400).json({ error: 'Date, time, and status are required.' });
        }
        if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid appointment status.' });
        }
        parseDate(appointment_date, new Date(), status === 'cancelled');
        parseTime(appointment_time, status !== 'cancelled');
        await appointmentModel.updateAppointment(Number(req.params.id), {
            ...req.body,
            patient_id: Number(patient_id),
            doctor_id: Number(doctor_id),
        });
        res.json({ message: 'Appointment updated successfully' });
    } catch (error) {
        return respondWithAppointmentError(res, error, 'Failed to update appointment');
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

module.exports = {
    getAllAppointments,
    getUserAppointments,
    getAppointmentById,
    getAppointmentAvailability,
    createAppointment,
    updateAppointment,
    deleteAppointment,
};