// frontend/js/admin.js
const adminView = {
    async renderPatients() {
        try {
            const patients = await api.getPatients();
            return `
                <button class="btn-add" onclick="adminView.showAddPatientModal()">+ Add New Patient</button>
                <div class="data-table">
                    ${components.renderTable(
                        ['id', 'first_name', 'last_name', 'email', 'contact_number', 'date_of_birth', 'gender', 'blood_type'],
                        patients,
                        (row) => `
                            <button class="action-btn btn-edit" onclick="adminView.showEditPatientModal(${row.id})">Edit</button>
                            <button class="action-btn btn-delete" onclick="adminView.deletePatient(${row.id})">Delete</button>
                        `
                    )}
                </div>
            `;
        } catch (error) {
            return `<div class="error">Error loading patients: ${error.message}</div>`;
        }
    },

    showAddPatientModal() {
        const content = `
            <div class="form-group"><label>Username*</label><input type="text" id="add_username" required></div>
            <div class="form-group"><label>Temporary Password</label><input type="password" id="add_password" placeholder="Leave blank to auto-generate"></div>
            <p class="small-note">Leave blank to generate a secure temporary password. Patient should change it after first login.</p>
            <div class="form-group"><label>First Name*</label><input type="text" id="add_first_name" required></div>
            <div class="form-group"><label>Last Name*</label><input type="text" id="add_last_name" required></div>
            <div class="form-group"><label>Date of Birth</label><input type="date" id="add_dob"></div>
            <div class="form-group"><label>Gender</label>
                <select id="add_gender"><option value="">Select</option><option>Male</option><option>Female</option></select>
            </div>
            <div class="form-group"><label>Address</label><textarea id="add_address" rows="2"></textarea></div>
            <div class="form-group"><label>Contact Number</label><input type="text" id="add_contact"></div>
            <div class="form-group"><label>Email</label><input type="email" id="add_email"></div>
            <div class="form-group"><label>Blood Type</label>
                <select id="add_blood"><option value="">Select</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option></select>
            </div>
            <div class="form-group"><label>Allergies</label><input type="text" id="add_allergies" placeholder="e.g., Penicillin"></div>
        `;
        components.showModal('Add Patient', content, async () => {
            try {
                const username = document.getElementById('add_username').value.trim();
                const firstName = document.getElementById('add_first_name').value.trim();
                const lastName = document.getElementById('add_last_name').value.trim();

                if (!username || !firstName || !lastName) {
                    alert('Please fill all required fields (*): Username, First Name, Last Name');
                    return;
                }

                const data = {
                    username: username,
                    password: document.getElementById('add_password').value || null,
                    first_name: firstName,
                    last_name: lastName,
                    date_of_birth: document.getElementById('add_dob').value || null,
                    gender: document.getElementById('add_gender').value || null,
                    address: document.getElementById('add_address').value || null,
                    contact_number: document.getElementById('add_contact').value || null,
                    email: document.getElementById('add_email').value || null,
                    blood_type: document.getElementById('add_blood').value || null,
                    allergies: document.getElementById('add_allergies').value || null,
                };
                const result = await api.createPatient(data);
                if (result.generatedPassword) {
                    alert(`Patient added successfully!\n\nUsername: ${username}\nTemporary password: ${result.generatedPassword}\n\nPlease share this with the patient.`);
                } else {
                    alert('Patient added successfully');
                }
                app.loadView('patients');
            } catch (error) {
                alert('Error: ' + error.message);
            }
        });
    },

    async showEditPatientModal(id) {
        const patient = await api.getPatientById ? await api.getPatientById(id) : (await api.getPatients()).find(p => p.id == id);
        if (!patient) {
            alert('Patient not found');
            return;
        }
        const content = `
            <div class="form-group"><label>First Name*</label><input type="text" id="edit_first_name" value="${patient.first_name.replace(/"/g, '&quot;')}" required></div>
            <div class="form-group"><label>Last Name*</label><input type="text" id="edit_last_name" value="${patient.last_name.replace(/"/g, '&quot;')}" required></div>
            <div class="form-group"><label>Date of Birth</label><input type="date" id="edit_dob" value="${patient.date_of_birth?.split('T')[0] || ''}"></div>
            <div class="form-group"><label>Gender</label>
                <select id="edit_gender"><option value="">Select</option><option ${patient.gender === 'Male' ? 'selected' : ''}>Male</option><option ${patient.gender === 'Female' ? 'selected' : ''}>Female</option></select>
            </div>
            <div class="form-group"><label>Address</label><textarea id="edit_address" rows="2">${(patient.address || '').replace(/</g, '&lt;')}</textarea></div>
            <div class="form-group"><label>Contact Number</label><input type="text" id="edit_contact" value="${patient.contact_number || ''}"></div>
            <div class="form-group"><label>Email</label><input type="email" id="edit_email" value="${patient.email || ''}"></div>
            <div class="form-group"><label>Blood Type</label>
                <select id="edit_blood"><option value="">Select</option>${['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bt => `<option ${patient.blood_type === bt ? 'selected' : ''}>${bt}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label>Allergies</label><input type="text" id="edit_allergies" value="${(patient.allergies || '').replace(/"/g, '&quot;')}"></div>
        `;
        components.showModal('Edit Patient', content, async () => {
            const data = {
                first_name: document.getElementById('edit_first_name').value,
                last_name: document.getElementById('edit_last_name').value,
                date_of_birth: document.getElementById('edit_dob').value || null,
                gender: document.getElementById('edit_gender').value || null,
                address: document.getElementById('edit_address').value || null,
                contact_number: document.getElementById('edit_contact').value || null,
                email: document.getElementById('edit_email').value || null,
                blood_type: document.getElementById('edit_blood').value || null,
                allergies: document.getElementById('edit_allergies').value || null,
            };
            await api.updatePatient(id, data);
            alert('Patient updated');
            app.loadView('patients');
        });
    },

    async deletePatient(id) {
        if (confirm('Soft delete this patient? They will no longer appear in lists.')) {
            await api.deletePatient(id);
            alert('Patient deleted');
            app.loadView('patients');
        }
    },

    async renderDoctors() {
        try {
            const doctors = await api.getDoctors();
            return `
                <button class="btn-add" onclick="adminView.showAddDoctorModal()">+ Add New Doctor</button>
                <div class="data-table">
                    ${components.renderTable(
                        ['id', 'first_name', 'last_name', 'specialization', 'schedule', 'contact_number', 'email', 'has_account', 'is_active'],
                        doctors,
                        (row) => `
                            <button class="action-btn btn-edit" onclick="adminView.showEditDoctorModal(${row.id})">Edit</button>
                            <button class="action-btn ${row.is_active ? 'btn-delete' : 'btn-edit'}" onclick="adminView.setDoctorActive(${row.id}, ${!row.is_active})">${row.is_active ? 'Deactivate' : 'Activate'}</button>
                        `
                    )}
                </div>
            `;
        } catch (error) {
            return `<div class="error">Error loading doctors: ${error.message}</div>`;
        }
    },

    showAddDoctorModal() {
        const content = `
            <div class="form-group"><label>First Name*</label><input type="text" id="doc_first_name" required></div>
            <div class="form-group"><label>Last Name*</label><input type="text" id="doc_last_name" required></div>
            <div class="form-group"><label>Specialization*</label><input type="text" id="doc_specialization" required></div>
            <div class="form-group"><label>Schedule*</label><input type="text" id="doc_schedule" placeholder="e.g., Mon-Fri 9am-5pm" required></div>
            <div class="form-group"><label>Contact Number</label><input type="tel" id="doc_contact"></div>
            <div class="form-group"><label>Email / Login Username*</label><input type="email" id="doc_email" required></div>
            <div class="form-group"><label>Temporary Password*</label><input type="password" id="doc_password" minlength="6" required></div>
        `;
        components.showModal('Add Doctor', content, async () => {
            const data = {
                first_name: document.getElementById('doc_first_name').value.trim(),
                last_name: document.getElementById('doc_last_name').value.trim(),
                specialization: document.getElementById('doc_specialization').value.trim(),
                schedule: document.getElementById('doc_schedule').value.trim(),
                contact_number: document.getElementById('doc_contact').value || null,
                email: document.getElementById('doc_email').value.trim(),
                password: document.getElementById('doc_password').value,
            };
            if (!data.first_name || !data.last_name || !data.specialization || !data.schedule || !data.email || !data.password) {
                alert('Please complete all required doctor and account fields.');
                return false;
            }
            const result = await api.createDoctor(data);
            alert(`Doctor account created. The doctor can log in with ${data.email} and the assigned password.`);
            app.loadView('doctors');
        });
    },

    async showEditDoctorModal(id) {
        const doctor = await api.getDoctorById ? await api.getDoctorById(id) : (await api.getDoctors()).find(d => d.id == id);
        if (!doctor) {
            alert('Doctor not found');
            return;
        }
        const content = `
            <div class="form-group"><label>First Name*</label><input type="text" id="edit_doc_first_name" value="${components.escapeHtml(doctor.first_name)}" required></div>
            <div class="form-group"><label>Last Name*</label><input type="text" id="edit_doc_last_name" value="${components.escapeHtml(doctor.last_name)}" required></div>
            <div class="form-group"><label>Specialization*</label><input type="text" id="edit_doc_specialization" value="${components.escapeHtml(doctor.specialization)}" required></div>
            <div class="form-group"><label>Schedule*</label><input type="text" id="edit_doc_schedule" value="${components.escapeHtml(doctor.schedule)}" required></div>
            <div class="form-group"><label>Contact Number</label><input type="tel" id="edit_doc_contact" value="${components.escapeHtml(doctor.contact_number)}"></div>
            <div class="form-group"><label>Email*</label><input type="email" id="edit_doc_email" value="${components.escapeHtml(doctor.email)}" required></div>
            <small>Changing the email also resets the login username to this address.</small>
            <div class="form-group"><label>${doctor.has_account ? 'New Password' : 'Account Password*'}</label><input type="password" id="edit_doc_password" minlength="6" ${doctor.has_account ? 'placeholder="Leave blank to keep current password"' : 'required'}></div>
        `;
        components.showModal('Edit Doctor', content, async () => {
            const data = {
                first_name: document.getElementById('edit_doc_first_name').value.trim(),
                last_name: document.getElementById('edit_doc_last_name').value.trim(),
                specialization: document.getElementById('edit_doc_specialization').value.trim(),
                schedule: document.getElementById('edit_doc_schedule').value.trim(),
                contact_number: document.getElementById('edit_doc_contact').value || null,
                email: document.getElementById('edit_doc_email').value.trim(),
                password: document.getElementById('edit_doc_password').value || null,
            };
            await api.updateDoctor(id, data);
            alert('Doctor updated');
            app.loadView('doctors');
        });
    },

    async setDoctorActive(id, isActive) {
        try {
            await api.setDoctorActive(id, isActive);
            alert(`Doctor account ${isActive ? 'activated' : 'deactivated'}.`);
            app.loadView('doctors');
        } catch (error) {
            alert(`Could not update doctor account: ${error.message}`);
        }
    },

    // ========== ADD MEDICAL RECORD MODAL (UPDATED: refreshes appointments + medical records) ==========
    async showAddMedicalRecordModal(appointmentId, patientId, doctorId) {
        console.log('Opening add medical record modal for:', { appointmentId, patientId, doctorId });
        if (!appointmentId || !patientId || !doctorId) {
            alert('Missing appointment, patient, or doctor ID. Cannot add record.');
            return;
        }
        const content = `
            <div class="form-group"><label>Diagnosis</label><textarea id="diagnosis" rows="2"></textarea></div>
            <div class="form-group"><label>Prescription</label><textarea id="prescription" rows="2"></textarea></div>
            <div class="form-group"><label>Consultation Notes</label><textarea id="consultation_notes" rows="3"></textarea></div>
            <div class="form-group"><label>Follow-up Date</label><input type="date" id="follow_up_date"></div>
        `;
        components.showModal('Add Medical Record', content, async () => {
            try {
                const data = {
                    appointment_id: appointmentId,
                    patient_id: patientId,
                    doctor_id: doctorId,
                    diagnosis: document.getElementById('diagnosis').value,
                    prescription: document.getElementById('prescription').value,
                    consultation_notes: document.getElementById('consultation_notes').value,
                    follow_up_date: document.getElementById('follow_up_date').value || null
                };
                console.log('Sending medical record data:', data);
                const result = await api.createMedicalRecord(data);
                console.log('Create result:', result);
                alert('Medical record added successfully');

                // Refresh appointments view so the "Add Medical Record" button disappears
                app.loadView('appointments');
                // Also refresh medical records view after a short delay
                setTimeout(() => { app.loadView('medical-records'); }, 500);
            } catch (error) {
                console.error('Error adding medical record:', error);
                alert('Error: ' + error.message);
            }
        });
    },

    async renderDashboard() {
        try {
            const [apptReport, patientReport] = await Promise.all([
                api.getAppointmentReport(),
                api.getPatientReport()
            ]);
            return `
                <div class="stats-grid">
                    <div class="stat-card"><i class="fas fa-users"></i><h3>Total Patients</h3><div class="number">${patientReport.totalPatients}</div></div>
                    <div class="stat-card"><i class="fas fa-user-md"></i><h3>Total Doctors</h3><div class="number">${patientReport.totalDoctors}</div></div>
                    <div class="stat-card"><i class="fas fa-chart-line"></i><h3>New Patients (This Month)</h3><div class="number">${patientReport.newPatientsThisMonth}</div></div>
                    <div class="stat-card"><i class="fas fa-calendar-check"></i><h3>Total Appointments</h3><div class="number">${apptReport.total}</div></div>
                </div>
            `;
        } catch (error) {
            return `<div class="error">Error loading dashboard: ${error.message}</div>`;
        }
    },

    async renderReports() {
        try {
            const [apptReport, patientReport] = await Promise.all([
                api.getAppointmentReport(),
                api.getPatientReport()
            ]);
            return `
                <div class="stats-grid">
                    <div class="stat-card"><i class="fas fa-users"></i><h3>Total Patients</h3><div class="number">${patientReport.totalPatients}</div></div>
                    <div class="stat-card"><i class="fas fa-user-md"></i><h3>Total Doctors</h3><div class="number">${patientReport.totalDoctors}</div></div>
                    <div class="stat-card"><i class="fas fa-chart-line"></i><h3>New Patients (This Month)</h3><div class="number">${patientReport.newPatientsThisMonth}</div></div>
                    <div class="stat-card"><i class="fas fa-calendar-check"></i><h3>Total Appointments</h3><div class="number">${apptReport.total}</div></div>
                </div>
                <div class="data-table"><h3>Appointments by Status</h3>${components.renderTable(['status', 'count'], apptReport.byStatus)}</div>
            `;
        } catch (error) {
            return `<div class="error">Error loading reports: ${error.message}</div>`;
        }
    }
};