const callProcedure = require('../db/callProcedure');

const getAppointmentReport = () =>
    callProcedure('CALL clinicease_report_appointments(NULL)');

const getPatientReport = () =>
    callProcedure('CALL clinicease_report_patients(NULL)');

module.exports = { getAppointmentReport, getPatientReport };
