var Validator = require('jsonschema').Validator;
var validator = new Validator();
const _ = require("lodash");
const fields = ["title", "description", "schedule", "tags", "regionId"];

const eventSchema = {
    "type": "object",
    "properties": {
        "title": {
            "type": "string", "minLength": 2, "maxLength": 40
        },
        "description": {
            "type": "string", "maxLength": 1400
        },
        "regionId": {
            "type": "string",
        },
        "schedule": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": true,
            "items": {
                "properties": {
                    "dateFrom": {
                        "type": "string",
                        "format": "date-time",
                        "required": true
                    },
                    "dateTo": {
                        "type": "string",
                        "format": "date-time",
                        "required": true
                    },
                    "price": {
                        "type": "number",
                    },
                    "address": {
                        "type": "string",
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
                "required": ["dateFrom", "dateTo"],
                "dependencies": {
                    "latitude": "longitude",
                    "longitude": "latitude",
                }
            },
        },
        "tags": {
            "type": "array",
            "items": { "type": "string" },
            "minItems": 1,
            "uniqueItems": true
        }
    },
    "required": fields
}
function preValidateProperty(object, key, schema, options, ctx) {
    var value = object[key];

    if (typeof value === 'undefined') return;
    if (schema.type && validator.attributes.type.call(validator, value, schema, options, ctx.makeChild(schema, key))) {

        if (schema.type === 'array' && !Array.isArray(value)) {
            object[key] = JSON.parse(value);
        }
    }
}
function rewrite(instance, schema) {
    if (schema.format == "date-time")
        instance = new Date(instance);
    return instance;
}
function validate(instance, strictMode = true) {
    let schema = eventSchema;
    if (!strictMode) {
        schema = _.omit(schema, ['required'])
    }
    console.log(instance);
    let result = validator.validate(instance, schema, { preValidateProperty, rewrite, allowUnknownAttributes: false, throwAll: true });
    if (!result.instance.schedule)
        return result;
    if (result.instance.schedule.some(x => x.address && (x.latitude || x.longitude) || (!x.address && !x.latitude))) {
        result.addError('must have address or latitude & longitude');
        result.name = "Validation Error";
        throw result;
    }
    if (result.instance.schedule.some(x => x.dateFrom > x.dateTo)) {
        result.addError('The date "from" cannot be later than the date "to"!');
        result.name = "Validation Error";
        throw result;
    }
    result.instance = _.pick(result.instance, fields);
    return result;
}

module.exports = { validate };
