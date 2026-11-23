const doctorScheduleModel = require('../models/doctorScheduleModel');
const {
    AvailabilityError,
    parseDate,
    parseSchedule,
    validateWorkingHours,
} = require('../utils/appointmentAvailability');

const isValidId = (value) => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));

const respondWithError = (res, error, fallback) => {
    if (error instanceof AvailabilityError) {
        return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: fallback });
};

const getMySchedule = async (req, res) => {
    try {
        const schedule = await doctorScheduleModel.getDoctorSchedule(req.user.doctorId);
        if (!schedule) return res.status(404).json({ error: 'Doctor profile not found.' });
        if (!schedule.schedule_configured) {
            schedule.working_days = parseSchedule(schedule.legacy_schedule).flatMap((range) =>
                range.days.map((weekday) => ({
                    weekday,
                    start_time: `${String(Math.floor(range.start / 60)).padStart(2, '0')}:${String(range.start % 60).padStart(2, '0')}`,
                    end_time: `${String(Math.floor(range.end / 60)).padStart(2, '0')}:${String(range.end % 60).padStart(2, '0')}`,
                }))
            );
        }
        res.json(schedule);
    } catch (error) {
        return respondWithError(res, error, 'Failed to fetch doctor schedule.');
    }
};

const updateMySchedule = async (req, res) => {
    try {
        const { working_days, appointment_duration_minutes } = req.body;
        const normalized = validateWorkingHours(working_days, appointment_duration_minutes);
        const workingDays = normalized.map((day) => ({
            weekday: day.weekday,
            start_time: `${String(Math.floor(day.start / 60)).padStart(2, '0')}:${String(day.start % 60).padStart(2, '0')}`,
            end_time: `${String(Math.floor(day.end / 60)).padStart(2, '0')}:${String(day.end % 60).padStart(2, '0')}`,
        }));
        const updated = await doctorScheduleModel.saveDoctorSchedule(
            req.user.doctorId,
            workingDays,
            appointment_duration_minutes
        );
        if (!updated) return res.status(404).json({ error: 'Doctor profile not found.' });
        res.json({ message: 'Working hours updated successfully.' });
    } catch (error) {
        if (error.code === '23P01' || error.code === '23505') {
            return res.status(409).json({ error: 'Working hours could not be saved because they overlap.' });
        }
        return respondWithError(res, error, 'Failed to update doctor schedule.');
    }
};

const addUnavailableDate = async (req, res) => {
    try {
        const { date, reason = '' } = req.body;
        parseDate(date, new Date(), true);
        if (typeof reason !== 'string' || reason.length > 500) {
            return res.status(400).json({ error: 'Reason must be 500 characters or fewer.' });
        }
        const unavailable = await doctorScheduleModel.addUnavailableDate(
            req.user.doctorId,
            date,
            reason.trim() || null
        );
        res.status(201).json(unavailable);
    } catch (error) {
        return respondWithError(res, error, 'Failed to save unavailable date.');
    }
};

const deleteUnavailableDate = async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({ error: 'Unavailable date ID must be a positive integer.' });
    }
    try {
        const deleted = await doctorScheduleModel.deleteUnavailableDate(req.user.doctorId, req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Unavailable date not found.' });
        res.json({ message: 'Unavailable date removed.' });
    } catch (error) {
        return respondWithError(res, error, 'Failed to remove unavailable date.');
    }
};

module.exports = {
    getMySchedule,
    updateMySchedule,
    addUnavailableDate,
    deleteUnavailableDate,
};
