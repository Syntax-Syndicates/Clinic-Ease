// backend/controllers/reportController.js
const db = require('../config/db');

const getAppointmentReport = async (req, res) => {
    try {
        const totalQuery = await db.query('SELECT COUNT(*) FROM appointments WHERE is_deleted = FALSE');
        const statusQuery = await db.query(
            'SELECT status, COUNT(*) FROM appointments WHERE is_deleted = FALSE GROUP BY status'
        );
        const monthlyQuery = await db.query(
            `SELECT TO_CHAR(appointment_date, 'YYYY-MM') as month, COUNT(*)
             FROM appointments WHERE is_deleted = FALSE
             GROUP BY month ORDER BY month DESC LIMIT 6`
        );
        res.json({
            total: parseInt(totalQuery.rows[0].count),
            byStatus: statusQuery.rows,
            monthly: monthlyQuery.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

const getPatientReport = async (req, res) => {
    try {
        const totalPatients = await db.query('SELECT COUNT(*) FROM patients WHERE is_deleted = FALSE');
        const totalDoctors = await db.query('SELECT COUNT(*) FROM doctors WHERE is_deleted = FALSE');
        const newThisMonth = await db.query(
            `SELECT COUNT(*) FROM patients
             WHERE is_deleted = FALSE AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`
        );
        res.json({
            totalPatients: parseInt(totalPatients.rows[0].count),
            totalDoctors: parseInt(totalDoctors.rows[0].count),
            newPatientsThisMonth: parseInt(newThisMonth.rows[0].count)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

module.exports = { getAppointmentReport, getPatientReport };