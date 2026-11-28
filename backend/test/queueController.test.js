const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const databaseModulePath = require.resolve('../config/db');
require.cache[databaseModulePath] = new Module(databaseModulePath);
require.cache[databaseModulePath].exports = {};
require.cache[databaseModulePath].loaded = true;

const queueModel = require('../models/queueModel');
const queueController = require('../controllers/queueController');
const { checkRole } = require('../middleware/auth');

const createResponse = () => ({
    statusCode: 200,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    },
});

test('doctor queue reads always use the authenticated doctor ID', async () => {
    const getQueue = queueModel.getQueue;
    let received;
    try {
        queueModel.getQueue = async (...args) => {
            received = args;
            return [];
        };
        const response = createResponse();

        await queueController.getQueue({
            user: { role: 'doctor', doctorId: 12 },
            query: { doctor_id: '98', date: '2026-11-24' },
        }, response);

        assert.deepEqual(received, [12, '2026-11-24']);
        assert.equal(response.statusCode, 200);
        assert.deepEqual(response.body, []);
    } finally {
        queueModel.getQueue = getQueue;
    }
});

test('patient queue reads always use the authenticated patient ID', async () => {
    const getPatientQueue = queueModel.getPatientQueue;
    let receivedPatientId;
    try {
        queueModel.getPatientQueue = async (patientId) => {
            receivedPatientId = patientId;
            return [];
        };
        const response = createResponse();

        await queueController.getPatientQueue({
            user: { role: 'patient', patientId: 17 },
            query: { patient_id: '98' },
        }, response);

        assert.equal(receivedPatientId, 17);
        assert.equal(response.statusCode, 200);
        assert.deepEqual(response.body, []);
    } finally {
        queueModel.getPatientQueue = getPatientQueue;
    }
});

test('doctor queue updates ignore a different doctor ID from the request body', async () => {
    const updateQueueStatus = queueModel.updateQueueStatus;
    let received;
    try {
        queueModel.updateQueueStatus = async (...args) => {
            received = args;
            return 'updated';
        };
        const response = createResponse();

        await queueController.updateQueueStatus({
            user: { role: 'doctor', doctorId: 12 },
            params: { id: '34' },
            body: { doctor_id: 98, status: 'serving' },
        }, response);

        assert.deepEqual(received, [34, 12, 'serving']);
        assert.equal(response.statusCode, 200);
    } finally {
        queueModel.updateQueueStatus = updateQueueStatus;
    }
});

test('only admins and doctors may manage queues, and only admins may register walk-ins', () => {
    for (const [roles, userRole] of [
        [['admin', 'doctor'], 'patient'],
        [['admin'], 'doctor'],
    ]) {
        const response = createResponse();
        let nextCalled = false;

        checkRole(roles)({ user: { role: userRole } }, response, () => {
            nextCalled = true;
        });

        assert.equal(response.statusCode, 403);
        assert.equal(nextCalled, false);
    }

    const patientResponse = createResponse();
    let patientNextCalled = false;
    checkRole(['patient'])({ user: { role: 'patient' } }, patientResponse, () => {
        patientNextCalled = true;
    });
    assert.equal(patientResponse.statusCode, 200);
    assert.equal(patientNextCalled, true);
});

test('queue reads reject invalid dates before querying the model', async () => {
    const getQueue = queueModel.getQueue;
    let called = false;
    try {
        queueModel.getQueue = async () => {
            called = true;
            return [];
        };
        const response = createResponse();

        await queueController.getQueue({
            user: { role: 'admin' },
            query: { doctor_id: '12', date: '2026-02-30' },
        }, response);

        assert.equal(response.statusCode, 400);
        assert.equal(called, false);
    } finally {
        queueModel.getQueue = getQueue;
    }
});
