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
        let appointments;
        if (req.user.role === 'admin') {
            appointments = await appointmentModel.getAllAppointments();
        } else if (req.user.role === 'doctor') {
            appointments = await appointmentModel.getAppointmentsByDoctorId(req.user.doctorId);
        } else {
            const patientId = req.user.patientId;
            if (!patientId) return res.status(400).json({ error: 'No patient profile found' });
            appointments = await appointmentModel.getAppointmentsByPatientId(patientId);
        }
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
        if (req.user.role === 'patient' && Number(appointment.patient_id) !== Number(req.user.patientId)) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        if (req.user.role === 'doctor' && Number(appointment.doctor_id) !== Number(req.user.doctorId)) {
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
        if (!['patient', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only patients and administrators can check booking availability.' });
        }
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
        if (!['patient', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only patients and administrators can book appointments.' });
        }
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

        const appointmentData = {
            ...req.body,
            patient_id: Number(patient_id),
            doctor_id: Number(doctor_id),
            status: 'pending',
        };
        const id = await appointmentModel.createAppointment(appointmentData);
        res.status(201).json({ message: 'Appointment request submitted and is pending doctor approval.', id, status: 'pending' });
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
        if (!['pending', 'approved', 'rejected', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid appointment status.' });
        }
        if (status === 'rejected' && !String(req.body.rejection_reason || '').trim()) {
            return res.status(400).json({ error: 'A rejection reason is required.' });
        }
        parseDate(appointment_date, new Date(), ['cancelled', 'rejected', 'completed'].includes(status));
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
        if (!validId(req.params.id)) {
            return res.status(400).json({ error: 'Appointment ID must be a positive integer.' });
        }
        if (req.user.role === 'patient' && !validId(req.user.patientId)) {
            return res.status(400).json({ error: 'Patient profile not found.' });
        }
        const result = await appointmentModel.cancelAppointment(
            req.params.id,
            req.user.role === 'patient' ? req.user.patientId : null
        );
        if (result === 'not_found' || result === 'forbidden') {
            return res.status(404).json({ error: 'Appointment not found.' });
        }
        if (result === 'not_cancellable') {
            return res.status(409).json({ error: 'Only pending or approved appointments can be cancelled.' });
        }
        res.json({ message: 'Appointment cancelled successfully', status: 'cancelled' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to cancel appointment' });
    }
};

const decideAppointment = async (req, res) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).json({ error: 'Appointment ID must be a positive integer.' });
        }
        const { decision, rejection_reason } = req.body;
        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({ error: 'Decision must be approved or rejected.' });
        }
        const reason = typeof rejection_reason === 'string' ? rejection_reason.trim() : '';
        if (decision === 'rejected' && !reason) {
            return res.status(400).json({ error: 'A rejection reason is required.' });
        }
        const result = await appointmentModel.decideAppointment(
            req.params.id,
            req.user.doctorId,
            decision,
            decision === 'rejected' ? reason : null
        );
        if (result === 'not_found') return res.status(404).json({ error: 'Appointment not found.' });
        if (result === 'forbidden') return res.status(403).json({ error: 'You cannot manage appointments assigned to another doctor.' });
        if (result === 'not_pending') return res.status(409).json({ error: 'Only pending appointments can be approved or rejected.' });
        res.json({ message: `Appointment ${decision}.`, status: decision });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update appointment decision.' });
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
    decideAppointment,
};