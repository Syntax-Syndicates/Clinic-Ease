// backend/models/doctorModel.js
const db = require('../config/db');

const getAllDoctors = async () => {
    const result = await db.query(
        'SELECT * FROM doctors WHERE is_deleted = FALSE ORDER BY id ASC'
    );
    return result.rows;
};

const getDoctorById = async (id) => {
    const result = await db.query(
        'SELECT * FROM doctors WHERE id = $1 AND is_deleted = FALSE',
        [id]
    );
    return result.rows[0];
};

const createDoctor = async (doctorData) => {
    const { first_name, last_name, specialization, schedule, contact_number, email } = doctorData;
    const result = await db.query(
        `INSERT INTO doctors (first_name, last_name, specialization, schedule, contact_number, email)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [first_name, last_name, specialization, schedule, contact_number, email]
    );
    return result.rows[0].id;
};

const updateDoctor = async (id, doctorData) => {
    const { first_name, last_name, specialization, schedule, contact_number, email } = doctorData;
    await db.query(
        `UPDATE doctors SET
            first_name = $1, last_name = $2, specialization = $3, schedule = $4, contact_number = $5, email = $6
         WHERE id = $7`,
        [first_name, last_name, specialization, schedule, contact_number, email, id]
    );
};

const deleteDoctor = async (id) => {
    await db.query('UPDATE doctors SET is_deleted = TRUE WHERE id = $1', [id]);
};

module.exports = { getAllDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor };