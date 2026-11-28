const queueModel = require('../models/queueModel');
const { parseDate } = require('../utils/appointmentAvailability');

const validId = (value) => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));
const queueStatuses = ['waiting', 'serving', 'completed', 'skipped'];

const today = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getQueue = async (req, res) => {
    const doctorId = req.user.role === 'doctor' ? req.user.doctorId : req.query.doctor_id;
    const queueDate = req.query.date || today();
    if (!validId(doctorId)) {
        return res.status(400).json({ error: 'doctor_id must be a positive integer.' });
    }

    try {
        parseDate(queueDate, new Date(), true);
    } catch (error) {
        return res.status(error.status || 400).json({ error: error.message });
    }

    try {
        const queue = await queueModel.getQueue(Number(doctorId), queueDate);
        res.json(queue);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch patient queue.' });
    }
};

const getPatientQueue = async (req, res) => {
    if (!validId(req.user.patientId)) {
        return res.status(404).json({ error: 'Patient profile not found.' });
    }

    try {
        const queue = await queueModel.getPatientQueue(Number(req.user.patientId));
        res.json(queue);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch your patient queue.' });
    }
};

const registerWalkIn = async (req, res) => {
    const { patient_id, doctor_id } = req.body;
    if (!validId(patient_id) || !validId(doctor_id)) {
        return res.status(400).json({ error: 'patient_id and doctor_id must be positive integers.' });
    }

    try {
        const appointment = await queueModel.registerWalkIn(Number(patient_id), Number(doctor_id));
        res.status(201).json({ message: 'Walk-in added to the patient queue.', appointment });
    } catch (error) {
        if (error.code === 'P0002' && error.detail === 'PATIENT_NOT_FOUND') {
            return res.status(404).json({ error: 'Patient not found.' });
        }
        if (error.detail === 'DOCTOR_UNAVAILABLE') {
            return res.status(404).json({ error: 'Doctor not found or is not accepting patients.' });
        }
        if (error.code === '23503') {
            return res.status(400).json({ error: 'The selected patient or doctor does not exist.' });
        }
        console.error(error);
        return res.status(500).json({ error: 'Failed to register walk-in patient.' });
    }
};

const updateQueueStatus = async (req, res) => {
    const { status, doctor_id } = req.body;
    if (!validId(req.params.id)) {
        return res.status(400).json({ error: 'Appointment ID must be a positive integer.' });
    }
    if (!queueStatuses.includes(status)) {
        return res.status(400).json({ error: 'Queue status must be waiting, serving, completed, or skipped.' });
    }
    const doctorId = req.user.role === 'doctor' ? req.user.doctorId : doctor_id;
    if (!validId(doctorId)) {
        return res.status(400).json({ error: 'doctor_id must be a positive integer.' });
    }

    try {
        const result = await queueModel.updateQueueStatus(Number(req.params.id), Number(doctorId), status);
        if (result === 'not_found') return res.status(404).json({ error: 'Queue entry not found.' });
        if (result === 'forbidden') return res.status(403).json({ error: "You cannot manage another doctor's queue." });
        if (result === 'not_in_queue') return res.status(409).json({ error: 'This appointment is not active in the queue.' });
        if (result === 'not_today') return res.status(409).json({ error: 'Queue statuses can only be changed on the appointment date.' });
        if (result === 'invalid_transition') {
            return res.status(409).json({ error: 'That queue status change is not allowed.' });
        }
        if (result === 'serving_exists') {
            return res.status(409).json({ error: 'Another patient is already being served by this doctor.' });
        }
        res.json({ message: 'Queue status updated.', queue_status: status });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update patient queue status.' });
    }
};

module.exports = {
    getQueue,
    getPatientQueue,
    registerWalkIn,
    updateQueueStatus,
};
