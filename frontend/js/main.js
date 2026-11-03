// frontend/js/main.js
const app = {
    async loadView(view) {
        const container = document.getElementById('viewContainer');
        try {
            switch(view) {
                case 'dashboard':
                    if (window.currentUser.role === 'admin') {
                        container.innerHTML = await adminView.renderDashboard();
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
                    container.innerHTML = await this.renderMedicalRecords();
                    break;
                case 'settings':
                    container.innerHTML = await this.renderSettings(container);
                    break;
                default:
                    container.innerHTML = '<div>View not found</div>';
            }
        } catch (error) {
            container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
    },

    async renderSettings(container) {
        try {
            const profile = await api.getProfile();
            const isAdmin = profile.role === 'admin';
            const patient = profile.patient || {};

            const profileSection = isAdmin ? `
                <div class="settings-card">
                    <h2>Admin Account</h2>
                    <p>Admin accounts can change password here. Personal patient profile fields are managed by patients themselves.</p>
                </div>
            ` : `
                <div class="settings-card">
                    <h2>Profile Information</h2>
                    <div class="form-group"><label>First Name</label><input type="text" id="profile_first_name" value="${patient.first_name || ''}"></div>
                    <div class="form-group"><label>Last Name</label><input type="text" id="profile_last_name" value="${patient.last_name || ''}"></div>
                    <div class="form-group"><label>Date of Birth</label><input type="date" id="profile_date_of_birth" value="${patient.date_of_birth ? patient.date_of_birth.split('T')[0] : ''}"></div>
                    <div class="form-group"><label>Gender</label>
                        <select id="profile_gender">
                            <option value="">Select</option>
                            <option value="Male" ${patient.gender === 'Male' ? 'selected' : ''}>Male</option>
                            <option value="Female" ${patient.gender === 'Female' ? 'selected' : ''}>Female</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Email</label><input type="email" id="profile_email" value="${patient.email || ''}"></div>
                    <div class="form-group"><label>Contact Number</label><input type="text" id="profile_contact_number" value="${patient.contact_number || ''}"></div>
                    <div class="form-group"><label>Address</label><textarea id="profile_address" rows="2">${patient.address || ''}</textarea></div>
                    <div class="form-group"><label>Blood Type</label><input type="text" id="profile_blood_type" value="${patient.blood_type || ''}"></div>
                    <div class="form-group"><label>Allergies</label><input type="text" id="profile_allergies" value="${patient.allergies || ''}"></div>
                    <button class="btn-primary" id="saveProfileBtn">Save Profile</button>
                </div>
            `;

            const html = `
                <div class="settings-page">
                    <div class="settings-card">
                        <h1>Account Settings</h1>
                        <div class="form-group"><label>Username</label><input type="text" disabled value="${profile.username}"></div>
                        <div class="form-group"><label>Role</label><input type="text" disabled value="${profile.role}"></div>
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
            return `<div class="error">Error loading settings: ${error.message}</div>`;
        }
    },

    async renderAppointments() {
        try {
            let appointments = await api.getAppointments();
            const isAdmin = window.currentUser.role === 'admin';

            const renderActions = isAdmin ? (row) => {
                let buttons = `
                    <button class="action-btn btn-edit" onclick="app.editAppointment(${row.id})">Edit</button>
                    <button class="action-btn btn-delete" onclick="app.cancelAppointment(${row.id})">Cancel</button>
                `;
                if (row.status === 'confirmed') {
                    buttons += `<button class="action-btn" style="background:#10b981;" onclick="adminView.showAddMedicalRecordModal(${row.id}, ${row.patient_id}, ${row.doctor_id})">Add Medical Record</button>`;
                }
                return buttons;
            } : (row) => row.status !== 'cancelled' ? `<button class="action-btn btn-delete" onclick="app.cancelAppointment(${row.id})">Cancel</button>` : '';

            return `
                <button class="btn-add" onclick="app.showBookAppointmentModal()">+ Book New Appointment</button>
                <div class="data-table">
                    ${components.renderTable(
                        ['appointment_date', 'appointment_time', 'patient_first_name', 'doctor_first_name', 'status', 'notes'],
                        appointments,
                        renderActions
                    )}
                </div>
            `;
        } catch (error) {
            return `<div class="error">Error loading appointments: ${error.message}</div>`;
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
        const doctors = await api.getDoctors();
        const patients = window.currentUser.role === 'admin' ? await api.getPatients() : [];
        const doctorOptions = doctors.map(d => `<option value="${d.id}">Dr. ${d.first_name} ${d.last_name} - ${d.specialization}</option>`).join('');
        const patientOptions = window.currentUser.role === 'admin' ? patients.map(p => `<option value="${p.id}">${p.first_name} ${p.last_name}</option>`).join('') : '';

        const content = `
            ${window.currentUser.role === 'admin' ? `<div class="form-group"><label>Patient</label><select id="patient_id">${patientOptions}</select></div>` : ''}
            <div class="form-group"><label>Doctor</label><select id="doctor_id">${doctorOptions}</select></div>
            <div class="form-group"><label>Date</label><input type="date" id="appointment_date" required></div>
            <div class="form-group"><label>Time</label><input type="time" id="appointment_time" required></div>
            <div class="form-group"><label>Notes</label><textarea id="notes"></textarea></div>
        `;

        components.showModal('Book Appointment', content, async () => {
            const data = {
                doctor_id: document.getElementById('doctor_id').value,
                appointment_date: document.getElementById('appointment_date').value,
                appointment_time: document.getElementById('appointment_time').value,
                notes: document.getElementById('notes').value,
            };
            if (window.currentUser.role === 'admin') {
                data.patient_id = document.getElementById('patient_id').value;
            }
            await api.createAppointment(data);
            alert('Appointment booked successfully');
            app.loadView('appointments');
        });
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
                return `<option value="${d.id}" ${selected}>Dr. ${d.first_name} ${d.last_name} - ${d.specialization}</option>`;
            }).join('');

            const patientOptions = patients.map(p => {
                const selected = p.id == appointment.patient_id ? 'selected' : '';
                return `<option value="${p.id}" ${selected}>${p.first_name} ${p.last_name}</option>`;
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
                        <option value="confirmed" ${status === 'confirmed' ? 'selected' : ''}>confirmed</option>
                        <option value="completed" ${status === 'completed' ? 'selected' : ''}>completed</option>
                        <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>cancelled</option>
                    </select>
                </div>
                <div class="form-group"><label>Notes</label><textarea id="appointment_notes">${(appointment.notes || '').replace(/</g,'<')}</textarea></div>
            `;

            components.showModal('Edit Appointment', content, async () => {
                const data = {
                    doctor_id: document.getElementById('appointment_doctor_id').value,
                    appointment_date: document.getElementById('appointment_date').value,
                    appointment_time: document.getElementById('appointment_time').value,
                    status: document.getElementById('appointment_status').value,
                    notes: document.getElementById('appointment_notes').value,
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

    async cancelAppointment(id) {
        if (confirm('Cancel this appointment?')) {
            await api.deleteAppointment(id);
            alert('Appointment cancelled');
            app.loadView('appointments');
        }
    }
};

auth.init();