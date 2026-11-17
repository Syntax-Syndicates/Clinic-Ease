const callProcedure = require('../db/callProcedure');

const findUserByUsername = (username) =>
    callProcedure('CALL clinicease_user_find_by_username($1, NULL)', [username]);

const findUserById = (id) =>
    callProcedure('CALL clinicease_user_find_by_id($1, NULL)', [id]);

const createUser = (username, hashedPassword, role) =>
    callProcedure('CALL clinicease_user_create($1, $2, $3, NULL)', [username, hashedPassword, role]);

const updatePassword = (id, hashedPassword) =>
    callProcedure('CALL clinicease_user_update_password($1, $2, NULL)', [id, hashedPassword]);

const updateUsername = (id, username) =>
    callProcedure('CALL clinicease_user_update_username($1, $2, NULL)', [id, username]);

const registerPatient = (username, hashedPassword, patientData) =>
    callProcedure('CALL clinicease_auth_register_patient($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL)', [
        username,
        hashedPassword,
        patientData.first_name,
        patientData.last_name,
        patientData.date_of_birth,
        patientData.gender,
        patientData.address,
        patientData.contact_number,
        patientData.email,
        patientData.blood_type,
        patientData.allergies,
    ]);

module.exports = {
    findUserByUsername,
    findUserById,
    createUser,
    updatePassword,
    updateUsername,
    registerPatient,
};
