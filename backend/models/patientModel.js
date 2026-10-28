// backend/models/patientModel.js
const db = require('../config/db');

const getAllPatients = async () => {
    const result = await db.query(
        `SELECT p.*, u.username
         FROM patients p
         JOIN users u ON p.user_id = u.id
         WHERE p.is_deleted = FALSE AND u.is_deleted = FALSE
         ORDER BY p.id ASC`
    );
    return result.rows;
};

const getPatientById = async (id) => {
    const result = await db.query(
        `SELECT p.*, u.username
         FROM patients p
         JOIN users u ON p.user_id = u.id
         WHERE p.id = $1 AND p.is_deleted = FALSE`,
        [id]
    );
    return result.rows[0];
};

const getPatientByUserId = async (userId) => {
    const result = await db.query(
        'SELECT * FROM patients WHERE user_id = $1 AND is_deleted = FALSE',
        [userId]
    );
    return result.rows[0];
};

const createPatient = async (patientData, userId) => {
    const { first_name, last_name, date_of_birth, gender, address, contact_number, email, blood_type, allergies } = patientData;
    const result = await db.query(
        `INSERT INTO patients (user_id, first_name, last_name, date_of_birth, gender, address, contact_number, email, blood_type, allergies)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [userId, first_name, last_name, date_of_birth, gender, address, contact_number, email, blood_type, allergies]
    );
    return result.rows[0].id;
};

const updatePatient = async (id, patientData) => {
    const { first_name, last_name, date_of_birth, gender, address, contact_number, email, blood_type, allergies } = patientData;
    await db.query(
        `UPDATE patients SET
            first_name = $1, last_name = $2, date_of_birth = $3, gender = $4,
            address = $5, contact_number = $6, email = $7, blood_type = $8, allergies = $9
         WHERE id = $10`,
        [first_name, last_name, date_of_birth, gender, address, contact_number, email, blood_type, allergies, id]
    );
};

const updatePatientByUserId = async (userId, patientData) => {
    const { first_name, last_name, date_of_birth, gender, address, contact_number, email, blood_type, allergies } = patientData;
    await db.query(
        `UPDATE patients SET
            first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            date_of_birth = COALESCE($3, date_of_birth),
            gender = COALESCE($4, gender),
            address = COALESCE($5, address),
            contact_number = COALESCE($6, contact_number),
            email = COALESCE($7, email),
            blood_type = COALESCE($8, blood_type),
            allergies = COALESCE($9, allergies)
         WHERE user_id = $10 AND is_deleted = FALSE`,
        [first_name, last_name, date_of_birth, gender, address, contact_number, email, blood_type, allergies, userId]
    );
};

const deletePatient = async (id) => {
    await db.query('UPDATE patients SET is_deleted = TRUE WHERE id = $1', [id]);
};

module.exports = { getAllPatients, getPatientById, getPatientByUserId, createPatient, updatePatient, deletePatient };