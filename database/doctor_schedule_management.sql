-- Apply once to an existing ClinicEase database.
BEGIN;

ALTER TABLE doctors
    ADD COLUMN IF NOT EXISTS schedule_configured BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS appointment_duration_minutes INTEGER NOT NULL DEFAULT 30;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'doctors_appointment_duration_check'
    ) THEN
        ALTER TABLE doctors
            ADD CONSTRAINT doctors_appointment_duration_check
            CHECK (appointment_duration_minutes BETWEEN 5 AND 240
                AND appointment_duration_minutes % 5 = 0);
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS doctor_schedules (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CHECK (start_time < end_time),
    UNIQUE (doctor_id, weekday, start_time)
);

CREATE TABLE IF NOT EXISTS doctor_unavailability (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    unavailable_date DATE NOT NULL,
    reason VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (doctor_id, unavailable_date)
);

CREATE OR REPLACE FUNCTION fn_doctor_schedule_allows_appointment(
    p_doctor_id INTEGER,
    p_date DATE,
    p_time TIME
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_configured BOOLEAN;
    v_duration INTEGER;
BEGIN
    SELECT schedule_configured, appointment_duration_minutes
      INTO v_configured, v_duration
      FROM doctors
     WHERE id = p_doctor_id AND is_deleted = FALSE AND is_active = TRUE;
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM doctor_unavailability
         WHERE doctor_id = p_doctor_id AND unavailable_date = p_date
    ) THEN
        RETURN FALSE;
    END IF;

    IF NOT v_configured THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1
          FROM doctor_schedules s
         WHERE s.doctor_id = p_doctor_id
           AND s.weekday = EXTRACT(DOW FROM p_date)::INTEGER
           AND p_time >= s.start_time
           AND p_time + make_interval(mins => v_duration) <= s.end_time
           AND MOD(EXTRACT(EPOCH FROM (p_time - s.start_time))::INTEGER / 60, v_duration) = 0
    );
END;
$$;

COMMIT;
