-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'patient')),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    contact_number VARCHAR(20),
    email VARCHAR(150),
    blood_type VARCHAR(5),
    allergies TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors table
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    specialization VARCHAR(150),
    schedule TEXT,
    contact_number VARCHAR(20),
    email VARCHAR(150),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    notes TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medical Records table
CREATE TABLE medical_records (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
    diagnosis TEXT,
    prescription TEXT,
    consultation_notes TEXT,
    follow_up_date DATE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed records are for local development only; set account passwords locally before use.
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2b$10$N9qo8uLOickgx2ZMRZoMy.MrJYq4V8eN9qo8uLOickgx2ZMRZoMy', 'admin'),
('juan123', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'patient'),
('maria123', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'patient');

INSERT INTO patients (user_id, first_name, last_name, date_of_birth, gender, address, contact_number, email, blood_type, allergies) VALUES
(2, 'Juan', 'Dela Cruz', '1995-03-15', 'Male', 'Quezon City, Metro Manila', '09171112222', 'juan.delacruz@email.com', 'O+', NULL),
(3, 'Maria', 'Santos', '1990-07-22', 'Female', 'Makati City, Metro Manila', '09282223333', 'maria.santos@email.com', 'A+', NULL);

INSERT INTO doctors (first_name, last_name, specialization, schedule, contact_number, email) VALUES
('Maria', 'Reyes', 'General Practitioner', 'Mon-Fri 08:00-17:00', '09171234567', 'm.reyes@clinicease.com'),
('Jose', 'Santos', 'Pediatrics', 'Mon-Wed 09:00-16:00', '09281234568', 'j.santos@clinicease.com'),
('Ana', 'Lim', 'Internal Medicine', 'Tue-Sat 08:00-15:00', '09391234569', 'a.lim@clinicease.com');

INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, notes) VALUES
(1, 1, '2026-05-10', '10:00:00', 'confirmed', 'Regular checkup'),
(2, 2, '2026-05-12', '09:00:00', 'pending', 'Child wellness checkup'),
(1, 3, '2026-05-15', '14:00:00', 'pending', 'Hypertension follow-up');

INSERT INTO medical_records (appointment_id, patient_id, doctor_id, diagnosis, prescription, consultation_notes, follow_up_date) VALUES
(1, 1, 1, 'Mild hypertension', 'Amlodipine 5mg daily', 'Patient reports occasional headaches. Blood pressure slightly elevated.', '2026-06-10');