"use strict";
const envUtils = require("../../utils-modules/environment.utils");
const DataTypes = require('sequelize/lib/data-types');
const { classToInvokable } = require('sequelize/lib/utils/class-to-invokable');

const ABSTRACT = DataTypes.ABSTRACT.prototype.constructor;

class LINK extends ABSTRACT {
    static key = 'LINK';

    // Mandatory: complete definition of the new type in the database
    toSql() {
        //console.log("toSql");
        return 'VARCHAR(255)';
    }

    // Optional: validator function
    validate(value, options) {
        //console.log("validate");
        return (typeof value === 'string');
    }

    // Optional: sanitizer
    _sanitize(value) {
        //console.log("_sanitize");
        return envUtils.encodedToGlobal(value);
    }

}

//LINK.prototype.key = LINK.key = 'LINK';

// Mandatory: add the new type to DataTypes. Optionally wrap it on `Utils.classToInvokable` to
// be able to use this datatype directly without having to call `new` on it.
DataTypes.LINK = classToInvokable(LINK);