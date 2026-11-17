const callProcedure = require('../db/callProcedure');

const getMedicalRecordsByPatientId = (patientId) =>
    callProcedure('CALL clinicease_medical_record_list_by_patient($1, NULL)', [patientId]);

const getMedicalRecordById = (id) =>
    callProcedure('CALL clinicease_medical_record_find_by_id($1, NULL)', [id]);

const getMedicalRecordByAppointmentId = (appointmentId) =>
    callProcedure('CALL clinicease_medical_record_find_by_appointment($1, NULL)', [appointmentId]);

const createMedicalRecord = (recordData) =>
    callProcedure('CALL clinicease_medical_record_create($1, $2, $3, $4, $5, $6, $7, NULL)', [
        recordData.appointment_id,
        recordData.patient_id,
        recordData.doctor_id,
        recordData.diagnosis,
        recordData.prescription,
        recordData.consultation_notes,
        recordData.follow_up_date,
    ]);

const updateMedicalRecord = (id, recordData) =>
    callProcedure('CALL clinicease_medical_record_update($1, $2, $3, $4, $5, NULL)', [
        id,
        recordData.diagnosis,
        recordData.prescription,
        recordData.consultation_notes,
        recordData.follow_up_date,
    ]);

const deleteMedicalRecord = (id) =>
    callProcedure('CALL clinicease_medical_record_delete($1, NULL)', [id]);

module.exports = {
    getMedicalRecordsByPatientId,
    getMedicalRecordById,
    getMedicalRecordByAppointmentId,
    createMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord,
};
