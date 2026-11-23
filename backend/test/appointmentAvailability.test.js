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
