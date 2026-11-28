const callProcedure = require('../db/callProcedure');

const getQueue = (doctorId, queueDate) =>
    callProcedure('CALL clinicease_queue_list($1, $2, NULL)', [doctorId, queueDate]);

const getPatientQueue = (patientId) =>
    callProcedure('CALL clinicease_queue_get_patient($1, NULL)', [patientId]);

const registerWalkIn = (patientId, doctorId) =>
    callProcedure('CALL clinicease_queue_register_walk_in($1, $2, NULL)', [patientId, doctorId]);

const updateQueueStatus = async (appointmentId, doctorId, queueStatus) => {
    try {
        return await callProcedure(
            'CALL clinicease_queue_update_status($1, $2, $3, NULL)',
            [appointmentId, doctorId, queueStatus]
        );
    } catch (error) {
        if (error.code === '23505' && error.constraint === 'uq_appointments_serving_queue_per_doctor_day') {
            return 'serving_exists';
        }
        throw error;
    }
};

module.exports = {
    getQueue,
    getPatientQueue,
    registerWalkIn,
    updateQueueStatus,
};
