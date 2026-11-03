// frontend/js/patient.js
const patientView = {
    async renderDashboard() {
        try {
            const appointments = await api.getAppointments();
            const records = window.currentUser.role === 'patient' && window.currentUser.patientId ?
                await api.getMedicalRecords(window.currentUser.patientId) : [];

            const upcoming = appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled').length;
            const completed = appointments.filter(a => a.status === 'completed').length;

            return `
                <div class="stats-grid">
                    <div class="stat-card">
                        <i class="fas fa-calendar-alt"></i>
                        <h3>Total Appointments</h3>
                        <div class="number">${appointments.length}</div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-clock"></i>
                        <h3>Upcoming Appointments</h3>
                        <div class="number">${upcoming}</div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-check-circle"></i>
                        <h3>Completed Visits</h3>
                        <div class="number">${completed}</div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-notes-medical"></i>
                        <h3>Medical Records</h3>
                        <div class="number">${records.length}</div>
                    </div>
                </div>
                <div class="data-table">
                    <h3 style="padding: 20px 20px 0;">Recent Appointments</h3>
                    ${components.renderTable(
                        ['appointment_date', 'appointment_time', 'doctor_first_name', 'status'],
                        appointments.slice(0, 5),
                        null
                    )}
                </div>
                <button class="btn-add" onclick="app.loadView('appointments')" style="margin-top: 20px;">+ Book New Appointment</button>
            `;
        } catch (error) {
            return `<div class="error">Error loading dashboard: ${error.message}</div>`;
        }
    }
};