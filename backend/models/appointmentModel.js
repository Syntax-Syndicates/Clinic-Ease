const callProcedure = require('../db/callProcedure');
const {
    AvailabilityError,
    assertAppointmentAvailableBySchedule,
    getAvailableSlots,
    hasOverlap,
    SLOT_DURATION_MINUTES,
} = require('../utils/appointmentAvailability');

const getAllAppointments = () =>
    callProcedure('CALL clinicease_appointment_list_all(NULL)');

const getAppointmentsByPatientId = (patientId) =>
    callProcedure('CALL clinicease_appointment_list_by_patient($1, NULL)', [patientId]);

const getAppointmentsByDoctorId = (doctorId) =>
    callProcedure('CALL clinicease_appointment_list_by_doctor($1, NULL)', [doctorId]);

const getAppointmentById = (id) =>
    callProcedure('CALL clinicease_appointment_find_by_id($1, NULL)', [id]);

const getAvailabilityInputs = (doctorId, appointmentDate, excludeId) =>
    callProcedure(
        'CALL clinicease_appointment_availability_inputs($1, $2, $3, NULL)',
        [doctorId, appointmentDate, excludeId]
    );

const getAppointmentAvailability = async (doctorId, appointmentDate) => {
    const inputs = await getAvailabilityInputs(doctorId, appointmentDate);
    if (!inputs) return null;

    return {
        doctor_id: Number(doctorId),
        date: appointmentDate,
        slot_duration_minutes: SLOT_DURATION_MINUTES,
        available_slots: getAvailableSlots(inputs.schedule, appointmentDate, inputs.appointment_times),
    };
};

const assertSlotAvailable = async (doctorId, appointmentDate, appointmentTime, excludeId) => {
    const inputs = await getAvailabilityInputs(doctorId, appointmentDate, excludeId);
    if (!inputs) {
        throw new AvailabilityError('Doctor not found or is not accepting appointments.', 404);
    }

    const start = assertAppointmentAvailableBySchedule(
        inputs.schedule,
        appointmentDate,
        appointmentTime
    );
    if (hasOverlap(
        `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
        inputs.appointment_times
    )) {
        throw new AvailabilityError('The selected appointment slot is no longer available.', 409);
    }
};

const mapProcedureError = (error) => {
    if (error.code === 'P0002') {
        throw new AvailabilityError('Appointment not found.', 404);
    }
    if (error.detail === 'DOCTOR_UNAVAILABLE') {
        throw new AvailabilityError('Doctor not found or is not accepting appointments.', 404);
    }
    if (error.detail === 'PATIENT_NOT_FOUND') {
        throw new AvailabilityError('Patient not found.', 404);
    }
    if (error.detail === 'SLOT_UNAVAILABLE' || error.code === '23505') {
        throw new AvailabilityError('The selected appointment slot is no longer available.', 409);
    }
    throw error;
};

const createAppointment = async (appointmentData) => {
    const {
        patient_id, doctor_id, appointment_date, appointment_time, status, notes,
    } = appointmentData;
    await assertSlotAvailable(doctor_id, appointment_date, appointment_time);
    try {
        return await callProcedure('CALL clinicease_appointment_create($1, $2, $3, $4, $5, $6, NULL)', [
            patient_id,
            doctor_id,
            appointment_date,
            appointment_time,
            status || 'pending',
            notes || null,
        ]);
    } catch (error) {
        mapProcedureError(error);
    }
};

const updateAppointment = async (id, appointmentData) => {
    const {
        patient_id, doctor_id, appointment_date, appointment_time, status, notes, rejection_reason,
    } = appointmentData;
    if (!await getAppointmentById(id)) {
        throw new AvailabilityError('Appointment not found.', 404);
    }
    if (!['cancelled', 'rejected', 'completed'].includes(status)) {
        await assertSlotAvailable(doctor_id, appointment_date, appointment_time, id);
    }
    try {
        return await callProcedure('CALL clinicease_appointment_update($1, $2, $3, $4, $5, $6, $7, $8, NULL)', [
            id,
            patient_id,
            doctor_id,
            appointment_date,
            appointment_time,
            status,
            notes,
            rejection_reason || null,
        ]);
    } catch (error) {
        mapProcedureError(error);
    }
};

const decideAppointment = (id, doctorId, status, rejectionReason = null) =>
    callProcedure(
        'CALL clinicease_appointment_decide($1, $2, $3, $4, NULL)',
        [id, doctorId, status, rejectionReason]
    );

const cancelAppointment = (id, patientId = null) =>
    callProcedure('CALL clinicease_appointment_cancel($1, $2, NULL)', [id, patientId]);

module.exports = {
    getAllAppointments,
    getAppointmentsByPatientId,
    getAppointmentsByDoctorId,
    getAppointmentById,
    getAppointmentAvailability,
    createAppointment,
    updateAppointment,
    decideAppointment,
    cancelAppointment,
};
