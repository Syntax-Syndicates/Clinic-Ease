const bcrypt = require('bcrypt');
const pool = require('./config/db');

async function fixPasswords() {
    const { ADMIN_PASSWORD, PATIENT_PASSWORD } = process.env;
    if (!ADMIN_PASSWORD || !PATIENT_PASSWORD) {
        throw new Error('Set ADMIN_PASSWORD and PATIENT_PASSWORD in backend/.env before running this script.');
    }

    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const patientHash = await bcrypt.hash(PATIENT_PASSWORD, 10);

    await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [adminHash, 'admin']);
    await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [patientHash, 'juan123']);
    await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [patientHash, 'maria123']);

    console.log('Passwords updated successfully');
}

fixPasswords()
    .catch((error) => {
        console.error(`Failed to update passwords: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });