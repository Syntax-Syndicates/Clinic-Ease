const callProcedure = require('../db/callProcedure');

const patientParameters = (patientData) => [
    patientData.first_name,
    patientData.last_name,
    patientData.date_of_birth,
    patientData.gender,
    patientData.address,
    patientData.contact_number,
    patientData.email,
    patientData.blood_type,
    patientData.allergies,
];

const getAllPatients = () =>
    callProcedure('CALL clinicease_patient_list(NULL)');

const getPatientById = (id) =>
    callProcedure('CALL clinicease_patient_find_by_id($1, NULL)', [id]);

const getPatientByUserId = (userId) =>
    callProcedure('CALL clinicease_patient_find_by_user_id($1, NULL)', [userId]);

const createPatient = (patientData, userId) =>
    callProcedure('CALL clinicease_patient_create($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL)', [
        userId, ...patientParameters(patientData),
    ]);

const updatePatient = (id, patientData) =>
    callProcedure('CALL clinicease_patient_update($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL)', [
        id, ...patientParameters(patientData),
    ]);

const updatePatientByUserId = (userId, patientData) =>
    callProcedure('CALL clinicease_patient_update_by_user_id($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL)', [
        userId, ...patientParameters(patientData),
    ]);

const deletePatient = (id) =>
    callProcedure('CALL clinicease_patient_delete($1, NULL)', [id]);

module.exports = {
    getAllPatients,
    getPatientById,
    getPatientByUserId,
    createPatient,
    updatePatient,
    updatePatientByUserId,
    deletePatient,
};
