const test = require('node:test');
const assert = require('node:assert/strict');
const {
    AvailabilityError,
    assertAppointmentAvailableBySchedule,
    getAvailableSlots,
    hasOverlap,
    parseTime,
    validateWorkingHours,
} = require('../utils/appointmentAvailability');
const Module = require('node:module');
const databaseModulePath = require.resolve('../config/db');
require.cache[databaseModulePath] = new Module(databaseModulePath);
require.cache[databaseModulePath].exports = {};
require.cache[databaseModulePath].loaded = true;
const doctorScheduleModel = require('../models/doctorScheduleModel');
const { getMySchedule } = require('../controllers/doctorScheduleController');

const now = new Date(2026, 10, 11, 12, 0);

test('returns future half-hour slots within the doctor schedule', () => {
    const slots = getAvailableSlots(
        'Mon-Fri 08:00-17:00',
        '2026-11-16',
        ['08:30:00'],
        now
    );

    assert.equal(slots.length, 17);
    assert.equal(slots[0], '08:00');
    assert.equal(slots.includes('08:30'), false);
    assert.equal(slots.at(-1), '16:30');
});

test('supports 12-hour schedules and semicolon-separated ranges', () => {
    const slots = getAvailableSlots(
        'Mon-Wed 9am-12pm; Mon-Wed 1pm-5pm',
        '2026-11-16',
        [],
        now
    );

    assert.equal(slots[0], '09:00');
    assert.equal(slots.includes('12:00'), false);
    assert.equal(slots.includes('13:00'), true);
    assert.equal(slots.at(-1), '16:30');
});

test('rejects invalid dates, past dates, and off-grid times', () => {
    assert.throws(() => getAvailableSlots('Mon-Fri 08:00-17:00', '2026-02-30', [], now), AvailabilityError);
    assert.throws(() => getAvailableSlots('Mon-Fri 08:00-17:00', '2026-11-10', [], now), /past/);
    assert.throws(() => parseTime('09:15'), /30-minute boundary/);
});

test('rejects times outside the schedule and past same-day times', () => {
    assert.throws(
        () => assertAppointmentAvailableBySchedule('Mon-Fri 08:00-17:00', '2026-11-16', '17:00', now),
        /outside the doctor's availability/
    );
    assert.throws(
        () => assertAppointmentAvailableBySchedule('Mon-Fri 08:00-17:00', '2026-11-11', '11:30', now),
        /future/
    );
});

test('detects overlapping appointment intervals', () => {
    assert.equal(hasOverlap('10:00', ['10:00:00']), true);
    assert.equal(hasOverlap('10:00', ['10:15:00']), true);
    assert.equal(hasOverlap('10:00', ['10:30:00']), false);
});

test('uses each existing appointment duration when calculating availability', () => {
    const schedule = [{ weekday: 1, start_time: '10:00', end_time: '12:00' }];
    const appointments = [{
        appointment_time: '10:00:00',
        appointment_duration_minutes: 60,
    }];

    assert.equal(hasOverlap('10:30', appointments, 30), true);
    assert.deepEqual(
        getAvailableSlots(schedule, '2026-11-16', appointments, now, {
            appointmentDurationMinutes: 30,
        }),
        ['11:00', '11:30']
    );
});

test('returns an empty configuration when no legacy schedule exists', async () => {
    const getDoctorSchedule = doctorScheduleModel.getDoctorSchedule;
    try {
        for (const legacySchedule of [null, '', '   ']) {
            doctorScheduleModel.getDoctorSchedule = async () => ({
                schedule_configured: false,
                legacy_schedule: legacySchedule,
                working_days: [],
            });
            const response = {
                statusCode: 200,
                status(code) {
                    this.statusCode = code;
                    return this;
                },
                json(body) {
                    this.body = body;
                    return this;
                },
            };

            await getMySchedule({ user: { doctorId: 1 } }, response);

            assert.equal(response.statusCode, 200);
            assert.deepEqual(response.body.working_days, []);
        }
    } finally {
        doctorScheduleModel.getDoctorSchedule = getDoctorSchedule;
    }
});

test('uses structured working hours, configured duration, and unavailable dates', () => {
    const workingHours = [
        { weekday: 1, start_time: '09:00', end_time: '12:00' },
    ];
    const slots = getAvailableSlots(workingHours, '2026-11-16', [], now, {
        appointmentDurationMinutes: 45,
    });

    assert.deepEqual(slots, ['09:00', '09:45', '10:30', '11:15']);
    assert.deepEqual(getAvailableSlots(workingHours, '2026-11-16', [], now, {
        appointmentDurationMinutes: 45,
        unavailableDates: ['2026-11-16'],
    }), []);
    assert.throws(() => assertAppointmentAvailableBySchedule(
        workingHours,
        '2026-11-16',
        '09:30',
        now,
        { appointmentDurationMinutes: 45 }
    ), /outside the doctor's availability/);
    assert.throws(() => assertAppointmentAvailableBySchedule(
        workingHours,
        '2026-11-16',
        '09:00',
        now,
        { appointmentDurationMinutes: 45, unavailableDates: ['2026-11-16'] }
    ), /unavailable on the selected date/);
});

test('validates structured working hours and rejects overlapping intervals', () => {
    assert.equal(validateWorkingHours([
        { weekday: 1, start_time: '09:00', end_time: '12:00' },
        { weekday: 1, start_time: '13:00', end_time: '17:00' },
    ], 30).length, 2);
    assert.throws(() => validateWorkingHours([
        { weekday: 1, start_time: '09:00', end_time: '12:00' },
        { weekday: 1, start_time: '11:00', end_time: '13:00' },
    ], 30), /cannot overlap/);
});
