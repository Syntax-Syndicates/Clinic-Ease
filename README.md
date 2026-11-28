# Clinic-Ease

## Backend configuration

The backend reads configuration from environment variables, so `.env` files are optional. On Windows, configure the following as user or system environment variables:

- `DB_HOST` (defaults to `localhost`)
- `DB_NAME` (defaults to `clinicease_db`)
- `DB_USER` (defaults to `postgres`)
- `DB_PASSWORD` (the PostgreSQL password for the configured database)
- `DB_PORT` (defaults to `5432`)
- `JWT_SECRET` (the secret used to sign authentication tokens)

At startup, the backend loads any missing settings from the current Windows user's environment, so restarting VS Code after changing them is not required.

## Appointment availability

Doctors can manage structured working hours by weekday, consultation duration (5-240 minutes in 5-minute increments), and unavailable dates from **My Schedule**. The appointment availability endpoint returns only future slots that fit the doctor's hours and duration; unavailable dates cannot be booked. Each appointment stores the duration in effect when it is booked, so later schedule-duration changes do not alter existing bookings. Doctors with no structured schedule yet continue using their existing text schedule until they save working hours.

For an existing database, apply `database/appointment_availability.sql`, `database/appointment_booking_approval.sql` (if not already applied), and `database/doctor_schedule_management.sql` before deploying the updated backend. The schedule migration adds the per-appointment duration and backfills existing appointments using each doctor's current configured duration. New database setups should apply these scripts after `database/schema.sql`.

Doctors manage their schedule through `GET/PUT /api/doctors/me/schedule`, `POST /api/doctors/me/unavailability`, and `DELETE /api/doctors/me/unavailability/:id`. The authenticated endpoint `GET /api/appointments/availability?doctor_id=<id>&date=YYYY-MM-DD` returns the available start times. Booking requests are revalidated against current hours and date exceptions; schedule changes and bookings are serialized per doctor.

## Doctor accounts and appointment approvals

For an existing database, apply `database/appointment_booking_approval.sql` and then deploy the backend. Apply it after `database/appointment_availability.sql` when upgrading an existing installation. New databases should use the updated `database/schema.sql`; the approval migration is safe to apply afterward as well. Doctors added by an administrator sign in with their email address and assigned password. New appointment requests remain pending until the assigned doctor approves or rejects them; rejection reasons are shown to patients.

Doctors can change their login username in Account Settings. Their username is independent of their contact email; changing the email in the admin doctor profile updates the login username to that email.

## Stored procedures

ClinicEase uses PostgreSQL stored procedures for runtime database reads and writes. Each operation has its own SQL file in `database/Stored-Procedures`; backend models issue an explicit `CALL` to the procedure they need and bind inputs positionally (for example, `CALL clinicease_appointment_decide($1, $2, $3, $4, NULL)`). PostgreSQL uses `$1`, `$2`, etc. instead of MySQL's `?` placeholders. The shared caller in `backend/db/callProcedure.js` executes the statement, and procedures return results through a final JSONB `OUT` parameter.

Execute every `*.sql` file in `database/Stored-Procedures` after the schema and migrations, and before deploying the updated backend. In PowerShell, run `Get-ChildItem .\database\Stored-Procedures\*.sql | ForEach-Object { psql -d clinicease_db -f $_.FullName }` (replace the database name if needed). New databases should apply `database/schema.sql`, `database/appointment_availability.sql`, `database/appointment_booking_approval.sql`, and `database/doctor_schedule_management.sql` first. Existing databases should apply any missing migrations first. The system check verifies that all required procedures are installed.