const db = require('../config/db');

const callProcedure = async (statement, parameters = []) => {
    if (!/^CALL\s+clinicease_[a-z0-9_]+\(/i.test(statement)) {
        throw new TypeError('Expected a CALL to a ClinicEase stored procedure.');
    }

    const result = await db.query(statement, parameters);
    return result.rows[0].result;
};

module.exports = callProcedure;
