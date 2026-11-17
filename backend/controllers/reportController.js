// backend/controllers/reportController.js
const reportModel = require('../models/reportModel');

const getAppointmentReport = async (req, res) => {
    try {
        res.json(await reportModel.getAppointmentReport());
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

const getPatientReport = async (req, res) => {
    try {
        res.json(await reportModel.getPatientReport());
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

module.exports = { getAppointmentReport, getPatientReport };