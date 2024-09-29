const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const schema = require('../schema/schema.json');

const ajv = new Ajv();
addFormats(ajv);
const validate = ajv.compile(schema);

function validateData(req, res, next) {
    const valid = validate(req.body);
    if (!valid) {
        return res.status(400).send(validate.errors);
    }
    next();
}

module.exports = validateData;