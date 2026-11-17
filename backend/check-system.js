const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '.env') });
require('./config/loadUserEnvironment')();

const requiredTables = [
    'users',
    'patients',
    'doctors',
    'appointments',
    'medical_records',
];
const requiredProcedures = [
    'clinicease_auth_active_doctor',
    'clinicease_auth_register_patient',
    'clinicease_appointment_availability_inputs',
    'clinicease_appointment_cancel',
    'clinicease_appointment_create',
    'clinicease_appointment_decide',
    'clinicease_appointment_find_by_id',
    'clinicease_appointment_list_all',
    'clinicease_appointment_list_by_doctor',
    'clinicease_appointment_list_by_patient',
    'clinicease_appointment_update',
    'clinicease_doctor_create',
    'clinicease_doctor_delete',
    'clinicease_doctor_find_by_id',
    'clinicease_doctor_find_by_user_id',
    'clinicease_doctor_list',
    'clinicease_doctor_set_active',
    'clinicease_doctor_update',
    'clinicease_medical_record_create',
    'clinicease_medical_record_delete',
    'clinicease_medical_record_find_by_appointment',
    'clinicease_medical_record_find_by_id',
    'clinicease_medical_record_list_by_patient',
    'clinicease_medical_record_update',
    'clinicease_patient_create',
    'clinicease_patient_dashboard',
    'clinicease_patient_delete',
    'clinicease_patient_find_by_id',
    'clinicease_patient_find_by_user_id',
    'clinicease_patient_list',
    'clinicease_patient_update',
    'clinicease_patient_update_by_user_id',
    'clinicease_report_appointments',
    'clinicease_report_patients',
    'clinicease_user_create',
    'clinicease_user_find_by_id',
    'clinicease_user_find_by_username',
    'clinicease_user_update_password',
    'clinicease_user_update_password_by_username',
    'clinicease_user_update_username',
];

const port = process.env.PORT || 3000;
const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'clinicease_db',
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 5432),
    connectionTimeoutMillis: 5000,
});
let connected = false;

async function checkSystem() {
    await client.connect();
    connected = true;

    const result = await client.query(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = ANY($1::text[])`,
        [requiredTables]
    );

    const availableTables = new Set(result.rows.map((row) => row.table_name));
    const missingTables = requiredTables.filter((table) => !availableTables.has(table));

    if (missingTables.length > 0) {
        throw new Error(`Database is missing required tables: ${missingTables.join(', ')}`);
    }

    const procedureResult = await client.query(
        `SELECT routine_name
         FROM information_schema.routines
         WHERE routine_schema = 'public'
           AND routine_name = ANY($1::text[])
           AND routine_type = 'PROCEDURE'`,
        [requiredProcedures]
    );
    const availableProcedures = new Set(procedureResult.rows.map((row) => row.routine_name));
    const missingProcedures = requiredProcedures.filter((name) => !availableProcedures.has(name));
    if (missingProcedures.length > 0) {
        throw new Error(
            `Database is missing stored procedures: ${missingProcedures.join(', ')}. `
            + 'Apply every SQL file in database/Stored-Procedures.'
        );
    }

    console.log('Database: connected; required tables are present.');
    console.log('Database: all ClinicEase stored procedures are installed.');

    const response = await fetch(`http://localhost:${port}/api/health`, {
        signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
        throw new Error(`API health check returned HTTP ${response.status}.`);
    }

    const health = await response.json();
    if (health.status !== 'OK') {
        throw new Error('API health check returned an unexpected response.');
    }

    console.log(`API: responding at http://localhost:${port}/api/health.`);
    console.log('System check passed.');
}

checkSystem()
    .catch((error) => {
        console.error(`System check failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (connected) {
            await client.end();
        }
    });
