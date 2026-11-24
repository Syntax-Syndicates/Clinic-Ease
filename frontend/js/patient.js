// frontend/js/patient.js
const formatDashboardDate = (value, options) => {
    if (!value) return '';
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (![year, month, day].every(Number.isFinite)) return '';
    return new Intl.DateTimeFormat('en-US', options).format(new Date(year, month - 1, day));
};

const formatDashboardTime = (value) => {
    if (!value) return '';
    const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
    if (![hours, minutes].every(Number.isFinite)) return '';
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(2000, 0, 1, hours, minutes));
};

const patientView = {
    async renderDashboard() {
        try {
            const dashboard = await api.getPatientDashboard();
            const patient = dashboard.patient;
            const appointments = dashboard.upcoming_appointments || [];
            const nextAppointment = appointments[0];
            const patientName = patient.first_name || window.currentUser.username;
            const appointmentStatus = nextAppointment && ['pending', 'approved', 'completed', 'rejected', 'cancelled'].includes(nextAppointment.status)
                ? nextAppointment.status
                : 'unknown';
            const appointmentCard = nextAppointment ? `
                <article class="patient-next-appointment">
                    <div class="patient-next-appointment-heading">
                        <div>
                            <p class="patient-eyebrow">UP NEXT</p>
                            <h2>Your next appointment</h2>
                        </div>
                        <span class="appointment-status status-${appointmentStatus}">
                            ${components.escapeHtml(nextAppointment.status)}
                        </span>
                    </div>
                    <div class="patient-next-appointment-details">
                        <div class="patient-appointment-date">
                            <i class="fas fa-calendar-day" aria-hidden="true"></i>
                            <div>
                                <strong>${components.escapeHtml(formatDashboardDate(nextAppointment.appointment_date, {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                }))}</strong>
                                <span>${components.escapeHtml(formatDashboardTime(nextAppointment.appointment_time))}</span>
                            </div>
                        </div>
                        <div class="patient-appointment-doctor">
                            <i class="fas fa-user-md" aria-hidden="true"></i>
                            <div>
                                <strong>Dr. ${components.escapeHtml(`${nextAppointment.doctor_first_name || ''} ${nextAppointment.doctor_last_name || ''}`.trim())}</strong>
                                <span>${components.escapeHtml(nextAppointment.specialization || 'Clinic visit')}</span>
                            </div>
                        </div>
                    </div>
                    <button class="patient-text-link" type="button" onclick="app.navigateTo('appointments')">
                        View all appointments <i class="fas fa-arrow-right" aria-hidden="true"></i>
                    </button>
                </article>
            ` : `
                <article class="patient-next-appointment patient-no-appointment">
                    <div class="patient-empty-icon"><i class="fas fa-calendar-check" aria-hidden="true"></i></div>
                    <div>
                        <p class="patient-eyebrow">UP NEXT</p>
                        <h2>No upcoming appointments</h2>
                        <p>When you book a visit, its details will appear here.</p>
                    </div>
                    <button class="patient-action-button" type="button" onclick="app.navigateTo('appointments')">
                        <i class="fas fa-plus" aria-hidden="true"></i> Book an appointment
                    </button>
                </article>
            `;
            const followUpDate = dashboard.next_follow_up_date
                ? formatDashboardDate(dashboard.next_follow_up_date, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                })
                : 'No follow-up scheduled';

            return `
                <section class="patient-welcome">
                    <div>
                        <p class="patient-eyebrow">YOUR CARE AT A GLANCE</p>
                        <h2>Welcome, ${components.escapeHtml(patientName)}!</h2>
                        <p>Here’s the latest on your appointments and care.</p>
                    </div>
                    <div class="patient-welcome-icon" aria-hidden="true"><i class="fas fa-heartbeat"></i></div>
                </section>
                <section class="patient-stats-grid" aria-label="Appointment statistics">
                    <article class="patient-stat-card">
                        <span class="patient-stat-icon stat-total"><i class="fas fa-calendar-alt" aria-hidden="true"></i></span>
                        <div><p>Total appointments</p><strong>${Number(dashboard.total_appointments) || 0}</strong></div>
                    </article>
                    <article class="patient-stat-card">
                        <span class="patient-stat-icon stat-completed"><i class="fas fa-check-circle" aria-hidden="true"></i></span>
                        <div><p>Completed consultations</p><strong>${Number(dashboard.completed_appointments) || 0}</strong></div>
                    </article>
                    <article class="patient-stat-card">
                        <span class="patient-stat-icon stat-upcoming"><i class="fas fa-clock" aria-hidden="true"></i></span>
                        <div><p>Upcoming appointments</p><strong>${appointments.length}</strong></div>
                    </article>
                    <article class="patient-stat-card patient-follow-up-card">
                        <span class="patient-stat-icon stat-follow-up"><i class="fas fa-notes-medical" aria-hidden="true"></i></span>
                        <div><p>Next follow-up</p><strong class="patient-follow-up-date">${components.escapeHtml(followUpDate)}</strong></div>
                    </article>
                </section>
                <section class="patient-dashboard-content">
                    ${appointmentCard}
                    <aside class="patient-quick-actions">
                        <p class="patient-eyebrow">QUICK ACCESS</p>
                        <h2>What would you like to do?</h2>
                        <button class="patient-quick-action" type="button" onclick="app.navigateTo('appointments')">
                            <span class="quick-action-icon"><i class="fas fa-calendar-check" aria-hidden="true"></i></span>
                            <span><strong>Appointments</strong><small>Book or manage your visits</small></span>
                            <i class="fas fa-chevron-right quick-action-arrow" aria-hidden="true"></i>
                        </button>
                        <button class="patient-quick-action" type="button" onclick="app.navigateTo('medical-records')">
                            <span class="quick-action-icon records-icon"><i class="fas fa-file-medical" aria-hidden="true"></i></span>
                            <span><strong>Medical records</strong><small>Review your care history</small></span>
                            <i class="fas fa-chevron-right quick-action-arrow" aria-hidden="true"></i>
                        </button>
                    </aside>
                </section>
            `;
        } catch (error) {
            return `<div class="error">Error loading dashboard: ${components.escapeHtml(error.message)}</div>`;
        }
    }
};

const doctorView = {
    async renderDashboard() {
        try {
            const appointments = await api.getAppointments();
            const pending = appointments.filter((appointment) => appointment.status === 'pending').length;
            return `
                <div class="stats-grid">
                    <div class="stat-card"><i class="fas fa-calendar-check"></i><h3>Total Requests</h3><div class="number">${appointments.length}</div></div>
                    <div class="stat-card"><i class="fas fa-clock"></i><h3>Pending Approval</h3><div class="number">${pending}</div></div>
                    <div class="stat-card"><i class="fas fa-check-circle"></i><h3>Approved</h3><div class="number">${appointments.filter((appointment) => appointment.status === 'approved').length}</div></div>
                </div>
                <button class="btn-add" onclick="app.loadView('appointments')">Review Appointment Requests</button>
            `;
        } catch (error) {
            return `<div class="error">Error loading dashboard: ${components.escapeHtml(error.message)}</div>`;
        }
    },
};