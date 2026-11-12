const SLOT_DURATION_MINUTES = 30;
const DAY_INDEX = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
};

class AvailabilityError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = 'AvailabilityError';
        this.status = status;
    }
}

const localDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseDate = (value, now = new Date(), allowPast = false) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new AvailabilityError('Date must use YYYY-MM-DD format.');
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw new AvailabilityError('Appointment date is not a valid calendar date.');
    }
    if (!allowPast && value < localDateString(now)) {
        throw new AvailabilityError('Appointment date cannot be in the past.');
    }

    return { year, month, day, weekday: date.getUTCDay() };
};

const parseTime = (value, requireSlotBoundary = true) => {
    if (typeof value !== 'string') {
        throw new AvailabilityError('Time must use HH:MM format.');
    }

    const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (!match || (match[3] && Number(match[3]) !== 0)) {
        throw new AvailabilityError('Time must use HH:MM format.');
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (requireSlotBoundary && minute % SLOT_DURATION_MINUTES !== 0) {
        throw new AvailabilityError('Appointment start times must be on a 30-minute boundary.');
    }

    return hour * 60 + minute;
};

const parseScheduleTime = (value) => {
    const normalized = value.trim().toLowerCase();
    const twelveHour = normalized.match(/^(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*([ap])m$/);
    if (twelveHour) {
        let hour = Number(twelveHour[1]) % 12;
        if (twelveHour[3] === 'p') hour += 12;
        return hour * 60 + Number(twelveHour[2] || 0);
    }

    const twentyFourHour = normalized.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (twentyFourHour) {
        return Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]);
    }

    throw new AvailabilityError('Doctor schedule uses an unsupported time format.', 422);
};

const expandDays = (value) => {
    const days = [];
    for (const range of value.split(',')) {
        const [startName, endName] = range.trim().toLowerCase().split('-');
        const start = DAY_INDEX[startName];
        const end = DAY_INDEX[endName || startName];
        if (start === undefined || end === undefined) {
            throw new AvailabilityError('Doctor schedule uses an unsupported weekday format.', 422);
        }

        let day = start;
        while (true) {
            if (!days.includes(day)) days.push(day);
            if (day === end) break;
            day = (day + 1) % 7;
        }
    }
    return days;
};

const parseSchedule = (schedule) => {
    if (typeof schedule !== 'string' || !schedule.trim()) {
        throw new AvailabilityError('Doctor availability has not been configured.', 422);
    }

    const dayNames = '(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)';
    const dayExpression = `${dayNames}(?:\\s*-\\s*${dayNames})?(?:\\s*,\\s*${dayNames}(?:\\s*-\\s*${dayNames})?)*`;
    const segments = schedule.split(';').map((segment) => segment.trim()).filter(Boolean);
    if (segments.length === 0) {
        throw new AvailabilityError('Doctor availability has not been configured.', 422);
    }

    return segments.map((segment) => {
        const match = segment.match(new RegExp(`^(${dayExpression})\\s+(.+?)\\s*-\\s*(.+)$`, 'i'));
        if (!match) {
            throw new AvailabilityError('Doctor schedule must use formats such as Mon-Fri 08:00-17:00.', 422);
        }

        const start = parseScheduleTime(match[2]);
        const end = parseScheduleTime(match[3]);
        if (start >= end) {
            throw new AvailabilityError('Doctor schedule end time must be after its start time.', 422);
        }

        return { days: expandDays(match[1]), start, end };
    });
};

const formatTime = (minutes) => {
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minute = String(minutes % 60).padStart(2, '0');
    return `${hour}:${minute}`;
};

const timeToMinutes = (value) => {
    const match = String(value).match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
};

const isInFuture = (date, startMinutes, now = new Date()) => {
    const today = localDateString(now);
    if (date > today) return true;
    if (date < today) return false;
    return startMinutes > now.getHours() * 60 + now.getMinutes();
};

const assertAppointmentAvailableBySchedule = (schedule, dateValue, timeValue, now = new Date()) => {
    const date = parseDate(dateValue, now);
    const start = parseTime(timeValue);
    if (!isInFuture(dateValue, start, now)) {
        throw new AvailabilityError('Appointment time must be in the future.');
    }

    const ranges = parseSchedule(schedule).filter((range) => range.days.includes(date.weekday));
    const withinSchedule = ranges.some((range) =>
        start >= range.start && start + SLOT_DURATION_MINUTES <= range.end
    );
    if (!withinSchedule) {
        throw new AvailabilityError("The selected time is outside the doctor's availability.", 409);
    }
    return start;
};

const hasOverlap = (timeValue, occupiedTimes) => {
    const start = timeToMinutes(timeValue);
    if (start === null) return true;
    const end = start + SLOT_DURATION_MINUTES;

    return occupiedTimes.some((value) => {
        const occupiedStart = timeToMinutes(value);
        if (occupiedStart === null) return true;
        const occupiedEnd = occupiedStart + SLOT_DURATION_MINUTES;
        return start < occupiedEnd && end > occupiedStart;
    });
};

const getAvailableSlots = (schedule, dateValue, occupiedTimes = [], now = new Date()) => {
    const date = parseDate(dateValue, now);
    const occupied = occupiedTimes.map(timeToMinutes);
    const ranges = parseSchedule(schedule).filter((range) => range.days.includes(date.weekday));
    const slots = new Set();

    for (const range of ranges) {
        const firstSlot = Math.ceil(range.start / SLOT_DURATION_MINUTES) * SLOT_DURATION_MINUTES;
        for (let start = firstSlot; start + SLOT_DURATION_MINUTES <= range.end; start += SLOT_DURATION_MINUTES) {
            if (
                isInFuture(dateValue, start, now) &&
                !occupied.some((occupiedStart) =>
                    occupiedStart !== null &&
                    start < occupiedStart + SLOT_DURATION_MINUTES &&
                    start + SLOT_DURATION_MINUTES > occupiedStart
                )
            ) {
                slots.add(formatTime(start));
            }
        }
    }

    return [...slots].sort();
};

module.exports = {
    AvailabilityError,
    SLOT_DURATION_MINUTES,
    assertAppointmentAvailableBySchedule,
    getAvailableSlots,
    hasOverlap,
    parseDate,
    parseTime,
};
