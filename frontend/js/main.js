// frontend/js/main.js
const app = {
    async loadView(view) {
        const container = document.getElementById('viewContainer');
        try {
            switch(view) {
                case 'dashboard':
                    if (window.currentUser.role === 'admin') {
                        container.innerHTML = await adminView.renderDashboard();
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
                ['appointment_date', 'appointment_time', 'patient_first_name', 'patient_last_name', 'patient_email', 'patient_contact_number', 'status', 'notes'] :
                isAdmin ?
                    ['appointment_date', 'appointment_time', 'patient_first_name', 'doctor_first_name', 'status', 'rejection_reason', 'notes'] :
                    ['appointment_date', 'appointment_time', 'doctor_first_name', 'doctor_last_name', 'specialization', 'status', 'rejection_reason', 'notes'];

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