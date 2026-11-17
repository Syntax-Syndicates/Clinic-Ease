const { Pool } = require('pg');
require('dotenv').config();
require('./loadUserEnvironment')();

if (!process.env.DB_PASSWORD) {
    throw new Error('DB_PASSWORD is not set. Configure it in the Windows user environment or process environment.');
}

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'clinicease_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

pool.connect((err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to PostgreSQL database');
    }
});

module.exports = pool;