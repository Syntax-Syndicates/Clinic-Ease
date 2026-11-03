// frontend/js/api.js
const API_BASE_URL = '/api';

class API {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        if (token) localStorage.setItem('token', token);
        else localStorage.removeItem('token');
    }

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        return headers;
    }

    async request(endpoint, options = {}) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: this.getHeaders(),
        });

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();

        if (!response.ok) {
            let errorMessage = response.statusText || 'Request failed';
            if (contentType.includes('application/json')) {
                try {
                    const errorBody = JSON.parse(text);
                    errorMessage = errorBody.error || errorBody.message || text;
                } catch (_) {
                    errorMessage = text || errorMessage;
                }
            } else {
                errorMessage = text || errorMessage;
            }
            throw new Error(errorMessage.trim() || 'Request failed');
        }

        if (!contentType.includes('application/json')) {
            return null;
        }

        return text ? JSON.parse(text) : null;
    }

    // Auth
    login(username, password) {
        return this.request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    }
    register(userData) {
        return this.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
    }
    getProfile() {
        return this.request('/auth/me');
    }
    updateProfile(data) {
        return this.request('/auth/me', { method: 'PUT', body: JSON.stringify(data) });
    }
    changePassword(currentPassword, newPassword) {
        return this.request('/auth/change-password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
    }

    // Patients
    getPatients() { return this.request('/patients'); }
    getPatientById(id) { return this.request(`/patients/${id}`); }
    createPatient(data) { return this.request('/patients', { method: 'POST', body: JSON.stringify(data) }); }
    updatePatient(id, data) { return this.request(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    deletePatient(id) { return this.request(`/patients/${id}`, { method: 'DELETE' }); }

    // Doctors
    getDoctors() { return this.request('/doctors'); }
    getDoctorById(id) { return this.request(`/doctors/${id}`); }
    createDoctor(data) { return this.request('/doctors', { method: 'POST', body: JSON.stringify(data) }); }
    updateDoctor(id, data) { return this.request(`/doctors/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    deleteDoctor(id) { return this.request(`/doctors/${id}`, { method: 'DELETE' }); }

    // Appointments
    getAppointments() { return this.request('/appointments'); }
    getAppointmentById(id) { return this.request(`/appointments/${id}`); }
    createAppointment(data) { return this.request('/appointments', { method: 'POST', body: JSON.stringify(data) }); }
    updateAppointment(id, data) { return this.request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    deleteAppointment(id) { return this.request(`/appointments/${id}`, { method: 'DELETE' }); }

    // Medical Records
    getMedicalRecords(patientId) { return this.request(`/medical-records/${patientId}`); }
    getMedicalRecordById(id) { return this.request(`/medical-records/record/${id}`); }
    createMedicalRecord(data) { return this.request('/medical-records', { method: 'POST', body: JSON.stringify(data) }); }
    updateMedicalRecord(id, data) { return this.request(`/medical-records/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
    deleteMedicalRecord(id) { return this.request(`/medical-records/${id}`, { method: 'DELETE' }); }

    // Reports
    getAppointmentReport() { return this.request('/reports/appointments'); }
    getPatientReport() { return this.request('/reports/patients'); }
}

const api = new API();