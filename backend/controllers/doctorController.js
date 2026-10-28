// backend/controllers/doctorController.js
const doctorModel = require('../models/doctorModel');

const getAllDoctors = async (req, res) => {
    try {
        const doctors = await doctorModel.getAllDoctors();
        res.json(doctors);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
};

const getDoctorById = async (req, res) => {
    try {
        const doctor = await doctorModel.getDoctorById(req.params.id);
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.json(doctor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch doctor' });
    }
};

const createDoctor = async (req, res) => {
    try {
        const id = await doctorModel.createDoctor(req.body);
        res.status(201).json({ message: 'Doctor created successfully', id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create doctor' });
    }
};

const updateDoctor = async (req, res) => {
    try {
        await doctorModel.updateDoctor(req.params.id, req.body);
        res.json({ message: 'Doctor updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update doctor' });
    }
};

const deleteDoctor = async (req, res) => {
    try {
        await doctorModel.deleteDoctor(req.params.id);
        res.json({ message: 'Doctor soft deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete doctor' });
    }
};

module.exports = { getAllDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor };