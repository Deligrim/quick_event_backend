var Validator = require('jsonschema').Validator;
var validator = new Validator();
const _ = require("lodash");

const citySchema = {
    "type": "object",
    "properties": {
        "name": {
            "type": "string", "minLength": 1, "maxLength": 40
        },
        "radius": {
            "type": "number",
            "minimum": 1
        },
        "latitude": {
            "type": "number",
            "minimum": -90,
            "maximum": 90,
        },
        "longitude": {
            "type": "number",
            "minimum": -180,
            "maximum": 180,
        },
    },
    "required": ["name", "radius", "latitude", "longitude"]
}

function preValidateProperty(object, key, schema, options, ctx) {
    var value = object[key];

    if (typeof value === 'undefined') return;
    if (schema.type && validator.attributes.type.call(validator, value, schema, options, ctx.makeChild(schema, key))) {

        if (schema.type === 'number' && typeof value !== 'number') {
            object[key] = +value;
        }
    }
}
function validate(instance) {
    let result = validator.validate(instance, citySchema, { preValidateProperty, allowUnknownAttributes: false, throwAll: true });
    return result;
}
function validateNonStrict(instance) {
    let result = validator.validate(instance, _.omit(citySchema, ['required']), { preValidateProperty, allowUnknownAttributes: false, throwAll: true });
    return result;
}
module.exports = { validate, validateNonStrict };
