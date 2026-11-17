const test = require('node:test');
const assert = require('node:assert/strict');
const {
    AvailabilityError,
    assertAppointmentAvailableBySchedule,
    getAvailableSlots,
    hasOverlap,
    parseTime,
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
