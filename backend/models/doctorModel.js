const callProcedure = require('../db/callProcedure');

const getAllDoctors = (includeInactive = false) =>
    callProcedure('CALL clinicease_doctor_list($1, NULL)', [includeInactive]);

const getDoctorById = (id, includeInactive = false) =>
    callProcedure('CALL clinicease_doctor_find_by_id($1, $2, NULL)', [id, includeInactive]);

const getDoctorByUserId = (userId) =>
    callProcedure('CALL clinicease_doctor_find_by_user_id($1, NULL)', [userId]);

const createDoctor = (doctorData, hashedPassword) =>
    callProcedure('CALL clinicease_doctor_create($1, $2, $3, $4, $5, $6, $7, NULL)', [
        hashedPassword,
        doctorData.first_name,
        doctorData.last_name,
        doctorData.specialization,
        doctorData.schedule,
        doctorData.contact_number,
        doctorData.email,
    ]);

const updateDoctor = async (id, doctorData, hashedPassword) => {
    try {
        return await callProcedure('CALL clinicease_doctor_update($1, $2, $3, $4, $5, $6, $7, $8, NULL)', [
            id,
            doctorData.first_name,
            doctorData.last_name,
            doctorData.specialization,
            doctorData.schedule,
            doctorData.contact_number,
            doctorData.email,
            hashedPassword,
        ]);
    } catch (error) {
        if (error.code === 'P0002') {
            error.status = 404;
        }
        throw error;
    }
};

const setDoctorActive = (id, isActive) =>
    callProcedure('CALL clinicease_doctor_set_active($1, $2, NULL)', [id, isActive]);

const deleteDoctor = (id) =>
    callProcedure('CALL clinicease_doctor_delete($1, NULL)', [id]);

module.exports = {
    getAllDoctors,
    getDoctorById,
    getDoctorByUserId,
    createDoctor,
    updateDoctor,
    setDoctorActive,
    deleteDoctor,
};
