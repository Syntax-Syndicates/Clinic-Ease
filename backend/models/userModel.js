// backend/models/userModel.js
const db = require('../config/db');

const findUserByUsername = async (username) => {
    const result = await db.query(
        'SELECT * FROM users WHERE username = $1 AND is_deleted = FALSE',
        [username]
    );
    return result.rows[0];
};

const findUserById = async (id) => {
    const result = await db.query(
        'SELECT * FROM users WHERE id = $1 AND is_deleted = FALSE',
        [id]
    );
    return result.rows[0];
};

const createUser = async (username, hashedPassword, role) => {
    const result = await db.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
        [username, hashedPassword, role]
    );
    return result.rows[0].id;
};

const updatePassword = async (id, hashedPassword) => {
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, id]);
};

module.exports = { findUserByUsername, findUserById, createUser, updatePassword };