const bcrypt = require('bcrypt');
const pool = require('./config/db');
const callProcedure = require('./db/callProcedure');

async function fixPasswords() {
    const { ADMIN_PASSWORD, PATIENT_PASSWORD } = process.env;
    if (!ADMIN_PASSWORD || !PATIENT_PASSWORD) {
        throw new Error('Set ADMIN_PASSWORD and PATIENT_PASSWORD in backend/.env before running this script.');
    }

    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const patientHash = await bcrypt.hash(PATIENT_PASSWORD, 10);

    await callProcedure(
        'CALL clinicease_user_update_password_by_username($1, $2, NULL)',
        [adminHash, 'admin']
    );
    await callProcedure(
        'CALL clinicease_user_update_password_by_username($1, $2, NULL)',
        [patientHash, 'juan123']
    );
    await callProcedure(
        'CALL clinicease_user_update_password_by_username($1, $2, NULL)',
        [patientHash, 'maria123']
    );

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