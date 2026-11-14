# Clinic-Ease

## Appointment availability

Appointment slots are 30 minutes and begin on the hour or half-hour. Doctor schedules should use a format such as `Mon-Fri 08:00-17:00` or `Tue-Sat 9am-5pm`; separate schedule ranges with semicolons. The API only returns and accepts future slots within the doctor's configured schedule.

For an existing database, apply `database/appointment_availability.sql` before deploying the availability-enabled backend. The migration stops with an error if duplicate active slots must be resolved first. New database setups should also apply this migration after `database/schema.sql`.

The authenticated endpoint `GET /api/appointments/availability?doctor_id=<id>&date=YYYY-MM-DD` returns the available 30-minute start times. Booking requests are revalidated on the backend, and simultaneous requests for the same doctor and date are serialized.

## Doctor accounts and appointment approvals

For an existing database, apply `database/appointment_booking_approval.sql` and then deploy the backend. Apply it after `database/appointment_availability.sql` when upgrading an existing installation. New databases should use the updated `database/schema.sql`; the approval migration is safe to apply afterward as well. Doctors added by an administrator sign in with their email address and assigned password. New appointment requests remain pending until the assigned doctor approves or rejects them; rejection reasons are shown to patients.

Doctors can change their login username in Account Settings. Their username is independent of their contact email; changing the email in the admin doctor profile updates the login username to that email.