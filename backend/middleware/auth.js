// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const callProcedure = require('../db/callProcedure');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }

    if (decoded.role === 'doctor') {
        try {
            const doctor = await callProcedure(
                'CALL clinicease_auth_active_doctor($1, NULL)',
                [decoded.id]
            );
            if (!doctor) {
                return res.status(403).json({ error: 'Doctor account is inactive or unavailable.' });
            }
            decoded.doctorId = doctor.id;
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to verify doctor account.' });
        }
    }

    req.user = decoded;
    next();
};

const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access forbidden: insufficient permissions' });
        }
        next();
    };
};

module.exports = { verifyToken, checkRole };