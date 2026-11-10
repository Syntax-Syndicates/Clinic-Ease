const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const requiredTables = [
    'users',
    'patients',
    'doctors',
    'appointments',
    'medical_records',
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

    console.log('Database: connected; required tables are present.');

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
