// frontend/js/main.js
const app = {
    async loadView(view) {
        this.viewLoadId = (this.viewLoadId || 0) + 1;
        const viewLoadId = this.viewLoadId;
        if (this.queueRefreshTimer) {
            clearInterval(this.queueRefreshTimer);
            this.queueRefreshTimer = null;
        }
        if (this.dashboardRefreshTimer) {
            clearInterval(this.dashboardRefreshTimer);
            this.dashboardRefreshTimer = null;
        }
        const container = document.getElementById('viewContainer');
        try {
            switch(view) {
                case 'dashboard':
                    if (window.currentUser.role === 'admin') {
                        const dashboard = await adminView.renderDashboard();
                        if (this.viewLoadId === viewLoadId) {
                            container.innerHTML = dashboard;
                            this.dashboardRefreshTimer = setInterval(() => this.loadView('dashboard'), 60000);
                        }
                    } else if (window.currentUser.role === 'doctor') {
                        container.innerHTML = await doctorView.renderDashboard();
                    } else {
                        container.innerHTML = await patientView.renderDashboard();
                    }
                    break;
                case 'patients':
                    if (window.currentUser.role === 'admin') {
                        container.innerHTML = await adminView.renderPatients();
                    }
                    break;
                case 'doctors':
                    if (window.currentUser.role === 'admin') {
                        container.innerHTML = await adminView.renderDoctors();
                    }
                    break;
                case 'reports':
                    if (window.currentUser.role === 'admin') {
                        container.innerHTML = await adminView.renderReports();
                    }
                    break;
                case 'appointments':
                    container.innerHTML = await this.renderAppointments();
                    break;
                case 'queue':
                    if (window.currentUser.role === 'patient') {
                        container.innerHTML = await this.renderPatientQueue();
                    } else if (['admin', 'doctor'].includes(window.currentUser.role)) {
                        container.innerHTML = await this.renderQueue();
                    }
                    break;
                case 'schedule':
                    if (window.currentUser.role === 'doctor') {
                        container.innerHTML = await this.renderDoctorSchedule();
                    }
                    break;
                case 'medical-records':
                    if (window.currentUser.role !== 'doctor') {
                        container.innerHTML = await this.renderMedicalRecords();
                    }
                    break;
                case 'settings':
                    container.innerHTML = await this.renderSettings(container);
                    break;
                default:
                    container.innerHTML = '<div>View not found</div>';
            }
        } catch (error) {
            container.innerHTML = `<div class="error">Error: ${components.escapeHtml(error.message)}</div>`;
        }
    },

    async navigateTo(view) {
        await this.loadView(view);
        const navItem = document.querySelector(`.nav-menu li[data-view="${view}"]`);
        if (navItem) {
            document.querySelectorAll('.nav-menu li').forEach((item) => item.classList.remove('active'));
            navItem.classList.add('active');
            document.getElementById('pageTitle').innerText = navItem.querySelector('span').innerText;
        }
    },

    async renderSettings(container) {
        try {
            const profile = await api.getProfile();
            const isAdmin = profile.role === 'admin';
            const patient = profile.patient || {};

            const isPatient = profile.role === 'patient';
            const profileSection = isAdmin ? `
                <div class="settings-card">
                    <h2>Admin Account</h2>
                    <p>Admin accounts can change password here. Personal patient profile fields are managed by patients themselves.</p>
                </div>
            ` : isPatient ? `
                <div class="settings-card">
                    <h2>Profile Information</h2>
                    <div class="form-group"><label>First Name</label><input type="text" id="profile_first_name" value="${components.escapeHtml(patient.first_name)}"></div>
                    <div class="form-group"><label>Last Name</label><input type="text" id="profile_last_name" value="${components.escapeHtml(patient.last_name)}"></div>
                    <div class="form-group"><label>Date of Birth</label><input type="date" id="profile_date_of_birth" value="${patient.date_of_birth ? patient.date_of_birth.split('T')[0] : ''}"></div>
                    <div class="form-group"><label>Gender</label>
                        <select id="profile_gender">
                            <option value="">Select</option>
                            <option value="Male" ${patient.gender === 'Male' ? 'selected' : ''}>Male</option>
                            <option value="Female" ${patient.gender === 'Female' ? 'selected' : ''}>Female</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Email</label><input type="email" id="profile_email" value="${components.escapeHtml(patient.email)}"></div>
                    <div class="form-group"><label>Contact Number</label><input type="text" id="profile_contact_number" value="${components.escapeHtml(patient.contact_number)}"></div>
                    <div class="form-group"><label>Address</label><textarea id="profile_address" rows="2">${components.escapeHtml(patient.address)}</textarea></div>
                    <div class="form-group"><label>Blood Type</label><input type="text" id="profile_blood_type" value="${components.escapeHtml(patient.blood_type)}"></div>
                    <div class="form-group"><label>Allergies</label><input type="text" id="profile_allergies" value="${components.escapeHtml(patient.allergies)}"></div>
                    <button class="btn-primary" id="saveProfileBtn">Save Profile</button>
                </div>
            ` : `
                <div class="settings-card">
                    <h2>Doctor Account</h2>
                    <p>Your doctor profile and contact information are managed by a clinic administrator.</p>
                    <div class="form-group"><label for="doctor_username">Login Username</label><input type="text" id="doctor_username" minlength="3" maxlength="100" value="${components.escapeHtml(profile.username)}" required></div>
                    <small>Usernames must be 3-100 characters with no spaces.</small>
                    <button class="btn-primary" id="saveDoctorUsernameBtn">Save Username</button>
                </div>
            `;

            const html = `
                <div class="settings-page">
                    <div class="settings-card">
                        <h1>Account Settings</h1>
                        <div class="form-group"><label>Username</label><input type="text" id="profile_username" disabled value="${components.escapeHtml(profile.username)}"></div>
                        <div class="form-group"><label>Role</label><input type="text" disabled value="${components.escapeHtml(profile.role)}"></div>
                    </div>
                    ${profileSection}
                    <div class="settings-card">
                        <h2>Change Password</h2>
                        <div class="form-group"><label>Current Password</label><input type="password" id="current_password"></div>
                        <div class="form-group"><label>New Password</label><input type="password" id="new_password"></div>
                        <div class="form-group"><label>Confirm New Password</label><input type="password" id="confirm_new_password"></div>
                        <button class="btn-primary" id="changePasswordBtn">Change Password</button>
                    </div>
                </div>
            `;

            setTimeout(() => {
                const saveDoctorUsernameBtn = document.getElementById('saveDoctorUsernameBtn');
                if (saveDoctorUsernameBtn) {
                    saveDoctorUsernameBtn.addEventListener('click', async () => {
                        try {
                            const username = document.getElementById('doctor_username').value.trim();
                            if (username.length < 3 || username.length > 100 || /\s/.test(username)) {
                                alert('Username must be 3-100 characters and contain no spaces.');
                                return;
                            }
                            const result = await api.updateDoctorUsername(username);
                            api.setToken(result.token);
                            window.currentUser.username = result.username;
                            localStorage.setItem('user', JSON.stringify(window.currentUser));
                            document.getElementById('profile_username').value = result.username;
                            document.getElementById('userInfo').innerHTML = `
                                <i class="fas fa-user-circle"></i> ${components.escapeHtml(result.username)}<br>
                                <small>Doctor</small>
                            `;
                            alert('Username updated successfully. Use it on your next login.');
                        } catch (error) {
                            alert(`Failed to update username: ${error.message}`);
                        }
                    });
                }

                const saveProfileBtn = document.getElementById('saveProfileBtn');
                if (saveProfileBtn) {
                    saveProfileBtn.addEventListener('click', async () => {
                        try {
                            const updateData = {
                                first_name: document.getElementById('profile_first_name').value,
                                last_name: document.getElementById('profile_last_name').value,
                                date_of_birth: document.getElementById('profile_date_of_birth').value || null,
                                gender: document.getElementById('profile_gender').value || null,
                                email: document.getElementById('profile_email').value || null,
                                contact_number: document.getElementById('profile_contact_number').value || null,
                                address: document.getElementById('profile_address').value || null,
                                blood_type: document.getElementById('profile_blood_type').value || null,
                                allergies: document.getElementById('profile_allergies').value || null,
                            };
                            await api.updateProfile(updateData);
                            alert('Profile updated successfully.');
                        } catch (error) {
                            alert('Failed to update profile: ' + error.message);
                        }
                    });
                }

                const changePasswordBtn = document.getElementById('changePasswordBtn');
                if (changePasswordBtn) {
                    changePasswordBtn.addEventListener('click', async () => {
                        try {
                            const currentPassword = document.getElementById('current_password').value;
                            const newPassword = document.getElementById('new_password').value;
                            const confirmPassword = document.getElementById('confirm_new_password').value;
                            if (newPassword !== confirmPassword) {
                                alert('New password and confirmation do not match.');
                                return;
                            }
                            await api.changePassword(currentPassword, newPassword);
                            alert('Password changed successfully.');
                            document.getElementById('current_password').value = '';
                            document.getElementById('new_password').value = '';
                            document.getElementById('confirm_new_password').value = '';
                        } catch (error) {
                            alert('Failed to change password: ' + error.message);
                        }
                    });
                }
            }, 0);

            return html;
        } catch (error) {
            return `<div class="error">Error loading settings: ${components.escapeHtml(error.message)}</div>`;
        }
    },

    async renderDoctorSchedule() {
        try {
            const schedule = await api.getDoctorSchedule();
            const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const workingDays = schedule.working_days || [];
            const dayCards = weekdays.map((day, weekday) => {
                const hours = workingDays.filter((entry) => Number(entry.weekday) === weekday);
                const isEnabled = hours.length > 0;
                const timeRows = (hours.length ? hours : [null]).map((range) => `
                    <span class="schedule-time-row" data-weekday="${weekday}">
                        <input type="time" class="schedule-start" data-weekday="${weekday}" value="${range ? String(range.start_time).slice(0, 5) : '09:00'}" aria-label="${day} start time" required>
                        <span>to</span>
                        <input type="time" class="schedule-end" data-weekday="${weekday}" value="${range ? String(range.end_time).slice(0, 5) : '17:00'}" aria-label="${day} end time" required>
                        <button class="schedule-remove-hours" type="button" data-weekday="${weekday}" aria-label="Remove ${day} hours"><i class="fas fa-times" aria-hidden="true"></i></button>
                    </span>
                `).join('');
                return `
                    <div class="schedule-day-card${isEnabled ? ' is-enabled' : ''}">
                        <label class="schedule-day-toggle">
                            <input type="checkbox" class="schedule-day-enabled" data-weekday="${weekday}" ${isEnabled ? 'checked' : ''}>
                            <strong>${day}</strong>
                            <span class="schedule-day-state">${isEnabled ? 'On schedule' : 'Off'}</span>
                        </label>
                        <span class="schedule-time-fields" data-weekday="${weekday}">
                            ${timeRows}
                            <button class="schedule-add-hours" type="button" data-weekday="${weekday}" aria-label="Add hours for ${day}"><i class="fas fa-plus" aria-hidden="true"></i> Add hours</button>
                        </span>
                    </div>
                `;
            }).join('');
            const unavailableDates = schedule.unavailable_dates || [];
            const unavailableRows = unavailableDates.length
                ? unavailableDates.map((item) => {
                    const date = String(item.unavailable_date).slice(0, 10);
                    const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                    });
                    return `
                        <li class="unavailable-date-row">
                            <span class="unavailable-date-icon"><i class="fas fa-calendar-day" aria-hidden="true"></i></span>
                            <time class="unavailable-date-details" datetime="${components.escapeHtml(date)}">
                                <strong>${components.escapeHtml(displayDate)}</strong>
                                <small>${item.reason ? components.escapeHtml(item.reason) : 'No reason provided'}</small>
                            </time>
                            <button class="schedule-remove-date" type="button" onclick="app.removeUnavailableDate(${Number(item.id)})" aria-label="Remove blocked date ${components.escapeHtml(displayDate)}">
                                <i class="fas fa-trash-alt" aria-hidden="true"></i><span>Remove</span>
                            </button>
                        </li>
                    `;
                }).join('')
                : '<li class="schedule-empty-state"><i class="fas fa-calendar-check" aria-hidden="true"></i><span>No unavailable dates added yet.</span></li>';
            const today = new Date();
            const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            setTimeout(() => {
                const form = document.getElementById('doctorScheduleForm');
                form?.addEventListener('submit', (event) => {
                    event.preventDefault();
                    this.saveDoctorSchedule();
                });
                document.getElementById('unavailabilityForm')?.addEventListener('submit', (event) => {
                    event.preventDefault();
                    this.addUnavailableDate();
                });
                document.querySelectorAll('.schedule-day-enabled').forEach((checkbox) => {
                    checkbox.addEventListener('change', () => {
                        const weekday = checkbox.dataset.weekday;
                        const dayCard = checkbox.closest('.schedule-day-card');
                        dayCard.classList.toggle('is-enabled', checkbox.checked);
                        dayCard.querySelector('.schedule-day-state').textContent = checkbox.checked
                            ? 'On schedule'
                            : 'Off';
                        document.querySelectorAll(`.schedule-time-fields[data-weekday="${weekday}"] input, .schedule-time-fields[data-weekday="${weekday}"] button`).forEach((control) => {
                            control.disabled = !checkbox.checked;
                        });
                    });
                    checkbox.dispatchEvent(new Event('change'));
                });
                document.querySelectorAll('.schedule-add-hours').forEach((button) => {
                    button.addEventListener('click', () => this.addWorkingHoursRange(Number(button.dataset.weekday)));
                });
                document.querySelectorAll('.schedule-remove-hours').forEach((button) => {
                    button.addEventListener('click', () => this.removeWorkingHoursRange(button.closest('.schedule-time-row')));
                });
            }, 0);

            return `
                <section class="schedule-page" aria-labelledby="schedule-heading">
                    <header class="schedule-page-heading">
                        <div>
                            <p class="patient-eyebrow">YOUR AVAILABILITY</p>
                            <h2 id="schedule-heading">My Schedule</h2>
                            <p>Set the hours patients can book with you. Add another time block for split shifts; blocks on the same day cannot overlap.</p>
                        </div>
                        <span class="schedule-heading-icon" aria-hidden="true"><i class="fas fa-calendar-check"></i></span>
                    </header>
                    <form id="doctorScheduleForm" class="schedule-panel" aria-label="Working hours">
                        <div class="schedule-section-heading">
                            <div><h3>Weekly working hours</h3><p>Choose the days you are available and set one or more time blocks.</p></div>
                            <span class="schedule-section-tag"><i class="fas fa-clock" aria-hidden="true"></i> Local time</span>
                        </div>
                        <div class="schedule-days-grid">${dayCards}</div>
                        <div class="schedule-duration-row">
                            <div class="schedule-duration-copy">
                                <label for="appointment_duration">Consultation length</label>
                                <small>Each appointment slot uses this duration.</small>
                            </div>
                            <span class="schedule-duration-control">
                                <input id="appointment_duration" type="number" min="5" max="240" step="5" value="${Number(schedule.appointment_duration_minutes) || 30}" required>
                                <span>minutes</span>
                            </span>
                            <button class="btn-primary schedule-save-button" type="submit"><i class="fas fa-check" aria-hidden="true"></i> Save working hours</button>
                        </div>
                    </form>
                    <section class="schedule-panel unavailable-panel" aria-labelledby="unavailable-heading">
                        <div class="schedule-panel-heading">
                            <div>
                                <p class="patient-eyebrow">TIME OFF</p>
                                <h2 id="unavailable-heading">Unavailable dates</h2>
                                <p>Block a full day so patients cannot book new appointments.</p>
                            </div>
                            <i class="fas fa-calendar-times" aria-hidden="true"></i>
                        </div>
                        <form id="unavailabilityForm" class="unavailability-form">
                            <label class="schedule-field" for="unavailable_date"><span>Date</span><input id="unavailable_date" type="date" min="${minDate}" required></label>
                            <label class="schedule-field" for="unavailable_reason"><span>Reason <small>(optional)</small></span><input id="unavailable_reason" type="text" maxlength="500" placeholder="e.g. Clinic closed"></label>
                            <button class="btn-primary" type="submit"><i class="fas fa-ban" aria-hidden="true"></i> Block date</button>
                        </form>
                        <ul class="unavailable-date-list">${unavailableRows}</ul>
                    </section>
                </section>
            `;
        } catch (error) {
            return `<div class="error">Error loading schedule: ${components.escapeHtml(error.message)}</div>`;
        }
    },

    async renderQueue() {
        try {
            const isAdmin = window.currentUser.role === 'admin';
            const doctors = isAdmin
                ? (await api.getDoctors()).filter((doctor) => doctor.is_active !== false)
                : [];
            const patients = isAdmin ? await api.getPatients() : [];
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const initialDoctorId = isAdmin ? doctors[0]?.id : null;
            const queue = isAdmin && !initialDoctorId
                ? []
                : await api.getQueue(today, initialDoctorId);
            const doctorOptions = doctors.map((doctor, index) => `
                <option value="${Number(doctor.id)}" ${index === 0 ? 'selected' : ''}>
                    Dr. ${components.escapeHtml(doctor.first_name)} ${components.escapeHtml(doctor.last_name)}
                </option>
            `).join('');
            const patientOptions = patients.map((patient) => `
                <option value="${Number(patient.id)}">
                    ${components.escapeHtml(patient.first_name)} ${components.escapeHtml(patient.last_name)}
                </option>
            `).join('');

            this.queueRefreshTimer = setTimeout(() => {
                if (!document.getElementById('queueDisplay')) return;
                document.getElementById('queueDate')?.addEventListener('change', () => this.refreshQueueDisplay());
                document.getElementById('queueDoctor')?.addEventListener('change', () => this.refreshQueueDisplay());
                document.getElementById('queueWalkInForm')?.addEventListener('submit', (event) => {
                    event.preventDefault();
                    this.registerQueueWalkIn();
                });
                this.queueRefreshTimer = setInterval(() => this.refreshQueueDisplay(), 10000);
            }, 0);

            return `
                <section class="queue-page">
                    <header class="queue-page-heading">
                        <div>
                            <p class="patient-eyebrow">LIVE PATIENT FLOW</p>
                            <h2>Patient queue</h2>
                            <p>Queue numbers are shared across the clinic and reset each date. Status refreshes every 10 seconds.</p>
                        </div>
                        <span class="queue-heading-icon"><i class="fas fa-users" aria-hidden="true"></i></span>
                    </header>
                    <div class="queue-filter-panel">
                        ${isAdmin ? `
                            <label class="queue-field"><span>Doctor</span>
                                <select id="queueDoctor">${doctorOptions || '<option value="">No active doctors</option>'}</select>
                            </label>
                        ` : ''}
                        <label class="queue-field"><span>Queue date</span><input id="queueDate" type="date" value="${today}" required></label>
                    </div>
                    ${isAdmin ? `
                        <form id="queueWalkInForm" class="queue-walk-in-panel">
                            <h3>Register walk-in</h3>
                            <label class="queue-field"><span>Registered patient</span>
                                <select id="queueWalkInPatient" required>
                                    <option value="">Select a patient</option>${patientOptions}
                                </select>
                            </label>
                            <label class="queue-field"><span>Doctor</span>
                                <select id="queueWalkInDoctor" required>
                                    <option value="">Select a doctor</option>${doctorOptions}
                                </select>
                            </label>
                            <button class="btn-primary" type="submit" ${!doctors.length || !patients.length ? 'disabled' : ''}>Add to today's queue</button>
                        </form>
                    ` : ''}
                    <div id="queueDisplay">${this.renderQueueDisplay(queue, today)}</div>
                </section>
            `;
        } catch (error) {
            return `<div class="error">Error loading patient queue: ${components.escapeHtml(error.message)}</div>`;
        }
    },

    async renderPatientQueue() {
        try {
            const queue = await api.getMyQueue();
            this.queueRefreshTimer = setTimeout(() => {
                if (!document.getElementById('myQueueDisplay')) return;
                this.queueRefreshTimer = setInterval(() => this.refreshPatientQueue(), 10000);
            }, 0);

            return `
                <section class="queue-page">
                    <header class="queue-page-heading">
                        <div>
                            <p class="patient-eyebrow">YOUR APPOINTMENT STATUS</p>
                            <h2>My queue</h2>
                            <p>Your queue number, progress, and currently serving number update every 10 seconds.</p>
                        </div>
                        <span class="queue-heading-icon"><i class="fas fa-ticket" aria-hidden="true"></i></span>
                    </header>
                    <div id="myQueueDisplay">${this.renderPatientQueueDisplay(queue)}</div>
                </section>
            `;
        } catch (error) {
            return `<div class="error">Error loading your queue: ${components.escapeHtml(error.message)}</div>`;
        }
    },

    renderPatientQueueDisplay(queue) {
        if (!queue.length) {
            return `
                <section class="queue-list-section">
                    <p class="queue-empty-state">No approved appointment has a queue number yet. Your doctor assigns one when approving your appointment.</p>
                </section>
            `;
        }

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        return `
            <section class="queue-list-section">
                <h3>Your appointments</h3>
                <div class="patient-queue-list">
                    ${queue.map((entry) => {
                        const appointmentDate = String(entry.appointment_date).slice(0, 10);
                        const isToday = appointmentDate === today;
                        const currentServing = isToday && entry.current_serving_number
                            ? `Q${String(Number(entry.current_serving_number)).padStart(3, '0')}`
                            : 'Not started';
                        const ahead = isToday && entry.queue_status === 'waiting'
                            ? Number(entry.patients_waiting_ahead)
                            : null;
                        const appointmentTime = components.escapeHtml(String(entry.appointment_time || '').slice(0, 5));
                        const doctorName = `Dr. ${components.escapeHtml(entry.doctor_first_name)} ${components.escapeHtml(entry.doctor_last_name)}`;
                        const specialization = entry.specialization
                            ? ` · ${components.escapeHtml(entry.specialization)}`
                            : '';
                        const status = entry.queue_status.charAt(0).toUpperCase() + entry.queue_status.slice(1);
                        return `
                            <article class="patient-queue-card">
                                <div class="patient-queue-card-heading">
                                    <div>
                                        <strong>${doctorName}</strong>
                                        <small>${specialization}</small>
                                    </div>
                                    <span class="queue-status queue-status-${entry.queue_status}">${status}</span>
                                </div>
                                <div class="patient-queue-details">
                                    <span><small>Queue number</small><strong class="queue-number">Q${String(Number(entry.queue_number)).padStart(3, '0')}</strong></span>
                                    <span><small>Appointment</small><strong>${components.escapeHtml(appointmentDate)} · ${appointmentTime}</strong></span>
                                    <span><small>Currently serving</small><strong>${components.escapeHtml(currentServing)}</strong></span>
                                    <span><small>Patients ahead</small><strong>${ahead === null ? 'Available on appointment date' : ahead}</strong></span>
                                </div>
                            </article>
                        `;
                    }).join('')}
                </div>
            </section>
        `;
    },

    async refreshPatientQueue() {
        const display = document.getElementById('myQueueDisplay');
        if (!display) return;
        try {
            const queue = await api.getMyQueue();
            display.innerHTML = this.renderPatientQueueDisplay(queue);
        } catch (error) {
            display.innerHTML = `<div class="error">Error refreshing your queue: ${components.escapeHtml(error.message)}</div>`;
        }
    },

    renderQueueDisplay(queue, selectedDate) {
        const serving = queue.find((entry) => entry.queue_status === 'serving');
        const waiting = queue.filter((entry) => entry.queue_status === 'waiting');
        const history = queue.filter((entry) => ['completed', 'skipped'].includes(entry.queue_status));
        const canUpdate = selectedDate === (() => {
            const date = new Date();
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        })();
        const formatNumber = (entry) => `Q${String(Number(entry.queue_number)).padStart(3, '0')}`;
        const renderEntry = (entry, allowServing) => {
            const patientName = `${components.escapeHtml(entry.patient_first_name)} ${components.escapeHtml(entry.patient_last_name)}`;
            const appointmentTime = components.escapeHtml(String(entry.appointment_time || '').slice(0, 5));
            let actions = '';
            if (canUpdate && entry.queue_status === 'waiting') {
                actions = `
                    <button class="action-btn btn-edit" onclick="app.changeQueueStatus(${Number(entry.id)}, 'serving')" ${allowServing ? '' : 'disabled'}>Serve</button>
                    <button class="action-btn btn-delete" onclick="app.changeQueueStatus(${Number(entry.id)}, 'skipped')">Skip</button>
                `;
            } else if (canUpdate && entry.queue_status === 'serving') {
                actions = `
                    <button class="action-btn btn-edit" onclick="app.changeQueueStatus(${Number(entry.id)}, 'completed')">Complete</button>
                    <button class="action-btn btn-delete" onclick="app.changeQueueStatus(${Number(entry.id)}, 'skipped')">Skip</button>
                `;
            } else if (canUpdate && entry.queue_status === 'skipped') {
                actions = `<button class="action-btn btn-edit" onclick="app.changeQueueStatus(${Number(entry.id)}, 'waiting')">Return to waiting</button>`;
            }
            const status = entry.queue_status.charAt(0).toUpperCase() + entry.queue_status.slice(1);
            return `
                <article class="queue-entry">
                    <strong class="queue-number">${formatNumber(entry)}</strong>
                    <span class="queue-patient">
                        <strong>${patientName}</strong>
                        <small>${appointmentTime}${entry.is_walk_in ? ' · Walk-in' : ' · Appointment'}</small>
                    </span>
                    <span class="queue-status queue-status-${entry.queue_status}">${status}</span>
                    <span class="queue-actions">${actions}</span>
                </article>
            `;
        };
        const servingName = serving
            ? `${components.escapeHtml(serving.patient_first_name)} ${components.escapeHtml(serving.patient_last_name)}`
            : '';

        return `
            <section class="queue-current-serving">
                <div>
                    <span class="queue-section-label">CURRENTLY SERVING</span>
                    ${serving
                        ? `<h3>${formatNumber(serving)} · ${servingName}</h3><p>${components.escapeHtml(String(serving.appointment_time || '').slice(0, 5))}</p>`
                        : '<h3>No patient is being served</h3><p>Start serving a waiting patient to show them here.</p>'}
                </div>
                <i class="fas fa-user-doctor" aria-hidden="true"></i>
            </section>
            <section class="queue-list-section">
                <h3>Waiting (${waiting.length})</h3>
                <div class="queue-entry-list">
                    ${waiting.length
                        ? waiting.map((entry) => renderEntry(entry, !serving)).join('')
                        : '<p class="queue-empty-state">No patients are waiting for this date.</p>'}
                </div>
            </section>
            <section class="queue-list-section">
                <h3>Completed and skipped</h3>
                <div class="queue-entry-list">
                    ${history.length
                        ? history.map((entry) => renderEntry(entry, false)).join('')
                        : '<p class="queue-empty-state">No completed or skipped patients.</p>'}
                </div>
            </section>
        `;
    },

    async refreshQueueDisplay() {
        const display = document.getElementById('queueDisplay');
        const dateInput = document.getElementById('queueDate');
        if (!display || !dateInput) return;

        const doctorId = window.currentUser.role === 'admin'
            ? document.getElementById('queueDoctor')?.value
            : null;
        if (window.currentUser.role === 'admin' && !doctorId) {
            display.innerHTML = '<p class="queue-empty-state">Select a doctor to view their queue.</p>';
            return;
        }

        try {
            const queue = await api.getQueue(dateInput.value, doctorId);
            display.innerHTML = this.renderQueueDisplay(queue, dateInput.value);
        } catch (error) {
            display.innerHTML = `<div class="error">Error refreshing queue: ${components.escapeHtml(error.message)}</div>`;
        }
    },

    async registerQueueWalkIn() {
        const patientId = document.getElementById('queueWalkInPatient').value;
        const doctorId = document.getElementById('queueWalkInDoctor').value;
        if (!patientId || !doctorId) {
            alert('Select a registered patient and doctor.');
            return;
        }

        try {
            const result = await api.registerQueueWalkIn({
                patient_id: Number(patientId),
                doctor_id: Number(doctorId),
            });
            document.getElementById('queueDoctor').value = doctorId;
            const now = new Date();
            document.getElementById('queueDate').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            alert(`Walk-in registered. Queue number: Q${String(result.appointment.queue_number).padStart(3, '0')}.`);
            await this.refreshQueueDisplay();
        } catch (error) {
            alert(`Could not register walk-in: ${error.message}`);
        }
    },

    async changeQueueStatus(appointmentId, status) {
        const data = { status };
        if (window.currentUser.role === 'admin') {
            data.doctor_id = document.getElementById('queueDoctor').value;
        }
        try {
            await api.updateQueueStatus(appointmentId, data);
            await this.refreshQueueDisplay();
        } catch (error) {
            alert(`Could not update queue status: ${error.message}`);
        }
    },

    async saveDoctorSchedule() {
        const workingDays = [];
        document.querySelectorAll('.schedule-day-enabled:checked').forEach((checkbox) => {
            const weekday = Number(checkbox.dataset.weekday);
            document.querySelectorAll(`.schedule-time-row[data-weekday="${weekday}"]`).forEach((row) => {
                workingDays.push({
                    weekday,
                    start_time: row.querySelector('.schedule-start').value,
                    end_time: row.querySelector('.schedule-end').value,
                });
            });
        });
        const overlappingHours = workingDays.some((range, index) =>
            workingDays.slice(index + 1).some((other) =>
                range.weekday === other.weekday &&
                range.start_time < other.end_time &&
                range.end_time > other.start_time
            )
        );
        if (overlappingHours) {
            alert('Working hours for the same day cannot overlap. Change or remove the overlapping time block before saving.');
            return;
        }

        try {
            await api.updateDoctorSchedule({
                working_days: workingDays,
                appointment_duration_minutes: Number(document.getElementById('appointment_duration').value),
            });
            alert('Working hours saved. Booking availability has been updated.');
            await this.loadView('schedule');
        } catch (error) {
            alert(`Could not save working hours: ${error.message}`);
        }
    },

    addWorkingHoursRange(weekday) {
        const container = document.querySelector(`.schedule-time-fields[data-weekday="${weekday}"]`);
        if (!container) return;
        const existingRanges = Array.from(container.querySelectorAll('.schedule-time-row'))
            .map((row) => ({
                start: row.querySelector('.schedule-start').value,
                end: row.querySelector('.schedule-end').value,
            }))
            .filter((range) => range.start && range.end && range.start < range.end)
            .map((range) => ({
                start: Number(range.start.slice(0, 2)) * 60 + Number(range.start.slice(3, 5)),
                end: Number(range.end.slice(0, 2)) * 60 + Number(range.end.slice(3, 5)),
            }));
        const candidateStarts = Array.from({ length: 40 }, (_, index) => index * 30)
            .sort((first, second) =>
                Math.abs(first - 13 * 60) - Math.abs(second - 13 * 60) || second - first
            );
        const start = candidateStarts.find((candidate) =>
            existingRanges.every((range) => candidate + 240 <= range.start || candidate >= range.end)
        );
        if (start === undefined) {
            alert('There is no four-hour block available on this day without overlapping existing hours. Change an existing block before adding another.');
            return;
        }
        const formatTime = (minutes) =>
            `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
        const row = document.createElement('span');
        row.className = 'schedule-time-row';
        row.dataset.weekday = weekday;
        row.innerHTML = `
            <input type="time" class="schedule-start" data-weekday="${weekday}" value="${formatTime(start)}" aria-label="Start time" required>
            <span>to</span>
            <input type="time" class="schedule-end" data-weekday="${weekday}" value="${formatTime(start + 240)}" aria-label="End time" required>
            <button class="schedule-remove-hours" type="button" data-weekday="${weekday}" aria-label="Remove hours"><i class="fas fa-times" aria-hidden="true"></i></button>
        `;
        container.insertBefore(row, container.querySelector('.schedule-add-hours'));
        row.querySelectorAll('input, button').forEach((control) => {
            control.disabled = !document.querySelector(`.schedule-day-enabled[data-weekday="${weekday}"]`).checked;
        });
        row.querySelector('.schedule-remove-hours').addEventListener('click', () => this.removeWorkingHoursRange(row));
    },

    removeWorkingHoursRange(row) {
        const weekday = row.dataset.weekday;
        const rows = document.querySelectorAll(`.schedule-time-row[data-weekday="${weekday}"]`);
        if (rows.length === 1) {
            row.querySelector('.schedule-start').value = '09:00';
            row.querySelector('.schedule-end').value = '17:00';
            const checkbox = document.querySelector(`.schedule-day-enabled[data-weekday="${weekday}"]`);
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change'));
            return;
        }
        row.remove();
    },

    async addUnavailableDate() {
        try {
            await api.addDoctorUnavailableDate(
                document.getElementById('unavailable_date').value,
                document.getElementById('unavailable_reason').value.trim()
            );
            await this.loadView('schedule');
        } catch (error) {
            alert(`Could not block date: ${error.message}`);
        }
    },

    async removeUnavailableDate(id) {
        try {
            await api.deleteDoctorUnavailableDate(id);
            await this.loadView('schedule');
        } catch (error) {
            alert(`Could not remove unavailable date: ${error.message}`);
        }
    },

    async renderAppointments() {
        try {
            const appointments = await api.getAppointments();
            const role = window.currentUser.role;
            const isAdmin = role === 'admin';
            const isDoctor = role === 'doctor';

            const renderActions = isDoctor ? (row) => row.status === 'pending' ? `
                <button class="action-btn btn-edit" onclick="app.decideAppointment(${row.id}, 'approved')">Approve</button>
                <button class="action-btn btn-delete" onclick="app.decideAppointment(${row.id}, 'rejected')">Reject</button>
            ` : '' : isAdmin ? (row) => {
                let buttons = `
                    <button class="action-btn btn-edit" onclick="app.editAppointment(${row.id})">Edit</button>
                `;
                if (['pending', 'approved'].includes(row.status)) {
                    buttons += `<button class="action-btn btn-delete" onclick="app.cancelAppointment(${row.id})">Cancel</button>`;
                }
                if (row.status === 'approved') {
                    buttons += `<button class="action-btn" style="background:#10b981;" onclick="adminView.showAddMedicalRecordModal(${row.id}, ${row.patient_id}, ${row.doctor_id})">Add Medical Record</button>`;
                }
                return buttons;
            } : (row) => ['pending', 'approved'].includes(row.status) ?
                `<button class="action-btn btn-delete" onclick="app.cancelAppointment(${row.id})">Cancel</button>` : '';

            const columns = isDoctor ?
                ['appointment_date', 'appointment_time', 'patient_first_name', 'patient_last_name', 'patient_email', 'patient_contact_number', 'status', 'queue_number', 'queue_status', 'notes'] :
                isAdmin ?
                    ['appointment_date', 'appointment_time', 'patient_first_name', 'doctor_first_name', 'status', 'queue_number', 'queue_status', 'rejection_reason', 'notes'] :
                    ['appointment_date', 'appointment_time', 'doctor_first_name', 'doctor_last_name', 'specialization', 'status', 'queue_number', 'queue_status', 'rejection_reason', 'notes'];

            return `
                ${!isDoctor ? `<button class="btn-add" onclick="app.showBookAppointmentModal()">+ Book New Appointment</button>` : ''}
                <div class="data-table">
                    ${components.renderTable(
                        columns,
                        appointments,
                        renderActions
                    )}
                </div>
            `;
        } catch (error) {
            return `<div class="error">Error loading appointments: ${components.escapeHtml(error.message)}</div>`;
        }
    },

    async renderMedicalRecords() {
        try {
            let patientId = window.currentUser.patientId;
            if (window.currentUser.role === 'admin') {
                const patients = await api.getPatients();
                if (patients.length > 0) patientId = patients[0].id;
            }
            if (!patientId) return '<div>No patient records found</div>';

            const records = await api.getMedicalRecords(patientId);
            const isAdmin = window.currentUser.role === 'admin';

            return `
                <div class="data-table">
                    ${components.renderTable(
                        ['appointment_date', 'doctor_first_name', 'diagnosis', 'prescription', 'consultation_notes', 'follow_up_date'],
                        records,
                        isAdmin ? (row) => `<button class="action-btn btn-edit" onclick="app.editMedicalRecord(${row.id})">Edit</button>` : null
                    )}
                </div>
            `;
        } catch (error) {
            return `<div class="error">Error loading medical records: ${error.message}</div>`;
        }
    },

    async showBookAppointmentModal() {
        const doctors = (await api.getDoctors()).filter((doctor) => doctor.is_active !== false);
        const patients = window.currentUser.role === 'admin' ? await api.getPatients() : [];
        const doctorOptions = doctors.map(d => `<option value="${d.id}">Dr. ${components.escapeHtml(d.first_name)} ${components.escapeHtml(d.last_name)} - ${components.escapeHtml(d.specialization)}</option>`).join('');
        const patientOptions = window.currentUser.role === 'admin' ? patients.map(p => `<option value="${p.id}">${components.escapeHtml(p.first_name)} ${components.escapeHtml(p.last_name)}</option>`).join('') : '';
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const content = `
            ${window.currentUser.role === 'admin' ? `<div class="form-group"><label>Patient</label><select id="patient_id">${patientOptions}</select></div>` : ''}
            <div class="form-group"><label>Doctor</label><select id="doctor_id"><option value="">Select a doctor</option>${doctorOptions}</select></div>
            <div class="form-group"><label>Date</label><input type="date" id="appointment_date" min="${today}" required></div>
            <div class="form-group">
                <label>Available time</label>
                <select id="appointment_time" required disabled><option value="">Choose a doctor and date first</option></select>
                <small id="availability_message">Choose a doctor and date to see available times.</small>
            </div>
            <div class="form-group"><label>Notes</label><textarea id="notes"></textarea></div>
        `;

        components.showModal('Book Appointment', content, async () => {
            const appointmentTime = document.getElementById('appointment_time').value;
            const doctorId = document.getElementById('doctor_id').value;
            const appointmentDate = document.getElementById('appointment_date').value;
            if (!appointmentTime) {
                alert('Please select an available appointment time.');
                return false;
            }
            const doctorName = document.getElementById('doctor_id').selectedOptions[0].textContent;
            if (!window.confirm(`Submit appointment request?\n\n${doctorName}\n${appointmentDate} at ${appointmentTime}\n\nThe appointment will remain pending until the doctor reviews it.`)) {
                return false;
            }
            const data = {
                doctor_id: doctorId,
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                notes: document.getElementById('notes').value,
            };
            if (window.currentUser.role === 'admin') {
                data.patient_id = document.getElementById('patient_id').value;
            }
            try {
                const result = await api.createAppointment(data);
                alert(`Appointment request submitted successfully. Status: ${result.status || 'pending'}.`);
            } catch (error) {
                await loadAvailability();
                throw error;
            }
            app.loadView('appointments');
        });

        const doctorSelect = document.getElementById('doctor_id');
        const dateInput = document.getElementById('appointment_date');
        const timeSelect = document.getElementById('appointment_time');
        const message = document.getElementById('availability_message');
        let availabilityRequest = 0;

        const loadAvailability = async () => {
            const requestId = ++availabilityRequest;
            const doctorId = doctorSelect.value;
            const date = dateInput.value;
            timeSelect.replaceChildren();

            if (!doctorId || !date) {
                timeSelect.disabled = true;
                timeSelect.add(new Option('Choose a doctor and date first', ''));
                message.textContent = 'Choose a doctor and date to see available times.';
                return;
            }

            timeSelect.disabled = true;
            timeSelect.add(new Option('Loading available times...', ''));
            message.textContent = 'Checking availability...';
            try {
                const availability = await api.getAppointmentAvailability(doctorId, date);
                if (requestId !== availabilityRequest) return;
                timeSelect.replaceChildren();
                if (availability.available_slots.length === 0) {
                    timeSelect.add(new Option('No available times', ''));
                    message.textContent = 'No appointment times are available for this doctor and date.';
                    return;
                }

                timeSelect.add(new Option('Select a time', ''));
                availability.available_slots.forEach((time) => {
                    timeSelect.add(new Option(time, time));
                });
                timeSelect.disabled = false;
                message.textContent = `${availability.slot_duration_minutes}-minute appointment slots.`;
            } catch (error) {
                if (requestId !== availabilityRequest) return;
                timeSelect.replaceChildren(new Option('Availability unavailable', ''));
                message.textContent = error.message;
            }
        };

        doctorSelect.addEventListener('change', loadAvailability);
        dateInput.addEventListener('change', loadAvailability);
    },

    async editAppointment(id) {
        try {
            const appointment = await api.getAppointmentById(id);
            if (!appointment) {
                alert('Appointment not found');
                return;
            }

            const doctors = await api.getDoctors();
            const patients = window.currentUser.role === 'admin' ? await api.getPatients() : [];

            const doctorOptions = doctors.map(d => {
                const selected = d.id == appointment.doctor_id ? 'selected' : '';
                return `<option value="${d.id}" ${selected}>Dr. ${components.escapeHtml(d.first_name)} ${components.escapeHtml(d.last_name)} - ${components.escapeHtml(d.specialization)}</option>`;
            }).join('');

            const patientOptions = patients.map(p => {
                const selected = p.id == appointment.patient_id ? 'selected' : '';
                return `<option value="${p.id}" ${selected}>${components.escapeHtml(p.first_name)} ${components.escapeHtml(p.last_name)}</option>`;
            }).join('');

            const apptDate = appointment.appointment_date ? String(appointment.appointment_date).split('T')[0] : '';
            const apptTime = appointment.appointment_time ? String(appointment.appointment_time).slice(0,5) : '';
            const status = appointment.status || 'pending';

            const content = `
                ${window.currentUser.role === 'admin' ? `<div class="form-group"><label>Patient</label><select id="appointment_patient_id">${patientOptions}</select></div>` : ''}
                <div class="form-group"><label>Doctor</label><select id="appointment_doctor_id">${doctorOptions}</select></div>
                <div class="form-group"><label>Date</label><input type="date" id="appointment_date" value="${apptDate}" required></div>
                <div class="form-group"><label>Time</label><input type="time" id="appointment_time" value="${apptTime}" required></div>
                <div class="form-group"><label>Status</label>
                    <select id="appointment_status">
                        <option value="pending" ${status === 'pending' ? 'selected' : ''}>pending</option>
                        <option value="approved" ${status === 'approved' ? 'selected' : ''}>approved</option>
                        <option value="rejected" ${status === 'rejected' ? 'selected' : ''}>rejected</option>
                        <option value="completed" ${status === 'completed' ? 'selected' : ''}>completed</option>
                        <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>cancelled</option>
                    </select>
                </div>
                <div class="form-group"><label>Rejection Reason</label><textarea id="appointment_rejection_reason">${components.escapeHtml(appointment.rejection_reason)}</textarea></div>
                <div class="form-group"><label>Notes</label><textarea id="appointment_notes">${components.escapeHtml(appointment.notes)}</textarea></div>
            `;

            components.showModal('Edit Appointment', content, async () => {
                const data = {
                    doctor_id: document.getElementById('appointment_doctor_id').value,
                    appointment_date: document.getElementById('appointment_date').value,
                    appointment_time: document.getElementById('appointment_time').value,
                    status: document.getElementById('appointment_status').value,
                    notes: document.getElementById('appointment_notes').value,
                    rejection_reason: document.getElementById('appointment_rejection_reason').value,
                };
                if (window.currentUser.role === 'admin') {
                    data.patient_id = document.getElementById('appointment_patient_id').value;
                }
                if (!data.doctor_id || !data.appointment_date || !data.appointment_time || !data.status) {
                    alert('Please fill required fields');
                    return;
                }
                await api.updateAppointment(id, data);
                alert('Appointment updated');
                app.loadView('appointments');
            });
        } catch (error) {
            alert('Error editing appointment: ' + error.message);
        }
    },

    async editMedicalRecord(id) {
        try {
            const record = await api.getMedicalRecordById(id);
            if (!record) {
                alert('Medical record not found');
                return;
            }
            const content = `
                <div class="form-group"><label>Diagnosis</label><textarea id="mr_diagnosis" rows="3">${(record.diagnosis || '').replace(/</g,'<')}</textarea></div>
                <div class="form-group"><label>Prescription</label><textarea id="mr_prescription" rows="3">${(record.prescription || '').replace(/</g,'<')}</textarea></div>
                <div class="form-group"><label>Consultation Notes</label><textarea id="mr_consultation_notes" rows="3">${(record.consultation_notes || '').replace(/</g,'<')}</textarea></div>
                <div class="form-group"><label>Follow Up Date</label><input type="date" id="mr_follow_up_date" value="${record.follow_up_date ? String(record.follow_up_date).split('T')[0] : ''}"></div>
            `;
            components.showModal('Edit Medical Record', content, async () => {
                const data = {
                    diagnosis: document.getElementById('mr_diagnosis').value,
                    prescription: document.getElementById('mr_prescription').value,
                    consultation_notes: document.getElementById('mr_consultation_notes').value,
                    follow_up_date: document.getElementById('mr_follow_up_date').value || null,
                };
                await api.updateMedicalRecord(id, data);
                alert('Medical record updated');
                app.loadView('medical-records');
            });
        } catch (error) {
            alert('Error editing medical record: ' + error.message);
        }
    },

    async decideAppointment(id, decision) {
        if (decision === 'approved') {
            if (!window.confirm('Approve this appointment request?')) return;
            try {
                await api.decideAppointment(id, decision);
                alert('Appointment approved.');
                await this.loadView('appointments');
            } catch (error) {
                alert(`Could not approve appointment: ${error.message}`);
            }
            return;
        }

        const content = `
            <div class="form-group">
                <label for="rejection_reason">Reason for rejection*</label>
                <textarea id="rejection_reason" rows="4" required></textarea>
            </div>
        `;
        components.showModal('Reject Appointment', content, async () => {
            const reason = document.getElementById('rejection_reason').value.trim();
            if (!reason) {
                alert('Please provide a reason for rejecting this appointment.');
                return false;
            }
            await api.decideAppointment(id, 'rejected', reason);
            alert('Appointment rejected.');
            await this.loadView('appointments');
        });
    },

    async cancelAppointment(id) {
        if (confirm('Cancel this appointment?')) {
            await api.deleteAppointment(id);
            alert('Appointment cancelled');
            app.loadView('appointments');
        }
    }
};

auth.init();