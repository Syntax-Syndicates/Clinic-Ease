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

Appointment slots are 30 minutes and begin on the hour or half-hour. Doctor schedules should use a format such as `Mon-Fri 08:00-17:00` or `Tue-Sat 9am-5pm`; separate schedule ranges with semicolons. The API only returns and accepts future slots within the doctor's configured schedule.

For an existing database, apply `database/appointment_availability.sql` before deploying the availability-enabled backend. The migration stops with an error if duplicate active slots must be resolved first. New database setups should also apply this migration after `database/schema.sql`.

The authenticated endpoint `GET /api/appointments/availability?doctor_id=<id>&date=YYYY-MM-DD` returns the available 30-minute start times. Booking requests are revalidated on the backend, and simultaneous requests for the same doctor and date are serialized.

## Doctor accounts and appointment approvals

For an existing database, apply `database/appointment_booking_approval.sql` and then deploy the backend. Apply it after `database/appointment_availability.sql` when upgrading an existing installation. New databases should use the updated `database/schema.sql`; the approval migration is safe to apply afterward as well. Doctors added by an administrator sign in with their email address and assigned password. New appointment requests remain pending until the assigned doctor approves or rejects them; rejection reasons are shown to patients.

Doctors can change their login username in Account Settings. Their username is independent of their contact email; changing the email in the admin doctor profile updates the login username to that email.

## Stored procedures

ClinicEase uses PostgreSQL stored procedures for runtime database reads and writes. Each operation has its own SQL file in `database/Stored-Procedures`; backend models issue an explicit `CALL` to the procedure they need and bind inputs positionally (for example, `CALL clinicease_appointment_decide($1, $2, $3, $4, NULL)`). PostgreSQL uses `$1`, `$2`, etc. instead of MySQL's `?` placeholders. The shared caller in `backend/db/callProcedure.js` executes the statement, and procedures return results through a final JSONB `OUT` parameter.

Execute every `*.sql` file in `database/Stored-Procedures` after the schema and appointment migrations, and before deploying the updated backend. In PowerShell, run `Get-ChildItem .\database\Stored-Procedures\*.sql | ForEach-Object { psql -d clinicease_db -f $_.FullName }` (replace the database name if needed). For a new database, apply `database/schema.sql`, `database/appointment_availability.sql`, and `database/appointment_booking_approval.sql` first. For an existing database, apply any missing appointment migrations first. The system check verifies that all required procedures are installed.