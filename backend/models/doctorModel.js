// backend/models/doctorModel.js
const db = require('../config/db');

const getAllDoctors = async (includeInactive = false) => {
    const result = await db.query(
        `SELECT id, first_name, last_name, specialization, schedule, contact_number, email,
                is_active, is_deleted, (user_id IS NOT NULL) AS has_account
         FROM doctors
         WHERE is_deleted = FALSE AND ($1::boolean OR is_active = TRUE)
         ORDER BY id ASC`,
        [includeInactive]
    );
    return result.rows;
};

const getDoctorById = async (id, includeInactive = false) => {
    const result = await db.query(
        `SELECT id, first_name, last_name, specialization, schedule, contact_number, email,
                is_active, is_deleted, (user_id IS NOT NULL) AS has_account
         FROM doctors
         WHERE id = $1 AND is_deleted = FALSE AND ($2::boolean OR is_active = TRUE)`,
        [id, includeInactive]
    );
    return result.rows[0];
};

const getDoctorByUserId = async (userId) => {
    const result = await db.query(
        'SELECT id, first_name, last_name FROM doctors WHERE user_id = $1 AND is_deleted = FALSE AND is_active = TRUE',
        [userId]
    );
    return result.rows[0];
};

const createDoctor = async (doctorData, hashedPassword) => {
    const { first_name, last_name, specialization, schedule, contact_number, email } = doctorData;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const userResult = await client.query(
            `INSERT INTO users (username, password_hash, role)
             VALUES ($1, $2, 'doctor') RETURNING id`,
            [email, hashedPassword]
        );
        const doctorResult = await client.query(
            `INSERT INTO doctors
                (user_id, first_name, last_name, specialization, schedule, contact_number, email)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [userResult.rows[0].id, first_name, last_name, specialization, schedule, contact_number, email]
        );
        await client.query('COMMIT');
        return doctorResult.rows[0].id;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const updateDoctor = async (id, doctorData, hashedPassword) => {
    const { first_name, last_name, specialization, schedule, contact_number, email } = doctorData;
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const currentDoctorResult = await client.query(
            'SELECT user_id, email FROM doctors WHERE id = $1 AND is_deleted = FALSE FOR UPDATE',
            [id]
        );
        if (!currentDoctorResult.rows[0]) {
            const error = new Error('Doctor not found.');
            error.status = 404;
            throw error;
        }
        const doctorResult = await client.query(
            `UPDATE doctors SET
                first_name = $1, last_name = $2, specialization = $3, schedule = $4,
                contact_number = $5, email = $6
             WHERE id = $7 AND is_deleted = FALSE
             RETURNING user_id`,
            [first_name, last_name, specialization, schedule, contact_number, email, id]
        );
        const emailChanged = currentDoctorResult.rows[0].email !== email;
        if (doctorResult.rows[0].user_id && (emailChanged || hashedPassword)) {
            if (emailChanged) {
                await client.query(
                    `UPDATE users SET username = $1, password_hash = COALESCE($2, password_hash)
                     WHERE id = $3`,
                    [email, hashedPassword || null, doctorResult.rows[0].user_id]
                );
            } else {
                await client.query(
                    'UPDATE users SET password_hash = $1 WHERE id = $2',
                    [hashedPassword, doctorResult.rows[0].user_id]
                );
            }
        } else if (hashedPassword) {
            const userResult = await client.query(
                `INSERT INTO users (username, password_hash, role)
                 VALUES ($1, $2, 'doctor') RETURNING id`,
                [email, hashedPassword]
            );
            await client.query('UPDATE doctors SET user_id = $1 WHERE id = $2', [userResult.rows[0].id, id]);
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const setDoctorActive = async (id, isActive) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            `UPDATE doctors SET is_active = $1
             WHERE id = $2 AND is_deleted = FALSE
             RETURNING user_id`,
            [isActive, id]
        );
        if (!result.rows[0]) {
            await client.query('ROLLBACK');
            return false;
        }
        if (result.rows[0].user_id) {
            await client.query('UPDATE users SET is_deleted = $1 WHERE id = $2', [!isActive, result.rows[0].user_id]);
        }
        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const deleteDoctor = async (id) => {
    const result = await db.query(
        `UPDATE doctors SET is_deleted = TRUE, is_active = FALSE
         WHERE id = $1 RETURNING user_id`,
        [id]
    );
    if (result.rows[0] && result.rows[0].user_id) {
        await db.query('UPDATE users SET is_deleted = TRUE WHERE id = $1', [result.rows[0].user_id]);
    }
};

module.exports = {
    getAllDoctors,
    getDoctorById,
    getDoctorByUserId,
    createDoctor,
    updateDoctor,
    setDoctorActive,
    deleteDoctor,
};