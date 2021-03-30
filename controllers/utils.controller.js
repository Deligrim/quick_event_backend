
const _ = require("lodash");
function defaultErrorHandler(res, error, customs) {
    if (!error) {
        console.error('\x1b[31mUnknown format error!\x1b[0m', `\x1b[31m${error}\x1b[0m`);
        return res && res.status(500).json({ success: false, code: "unknown", msg: "Unknown error" });
    }
    else if (Array.isArray(customs)) {
        var custom;
        if ((custom = customs.find(e => e.name === error.name))) {
            return custom.handle();
        }
    }
    else {
        if (process.env.NODE_ENV.toLowerCase().trim() == "development") console.error(error);
        if (error.name == 'ValidationError') { //sequelize
            console.error('\x1b[33mError Validating!\x1b[0m');

            return res && res.status(422).json({ success: false, code: "badrequest", msg: "Bad request", reason: Object.keys(error.errors).map(k => _.pick(error.errors[k], ['name', 'path', 'kind'])) });
        }
        else if (error.name === 'Validation Error') { //jsonschema validator
            console.error('\x1b[33mError JSON Validating!\x1b[0m');
            return res && res.status(400).json({ success: false, code: "badrequest", msg: "Error form validating!", reason: error.errors.map(x => x.stack.replace(/"instance\."/g, 'form.').replace(/"instance\ "/g, 'form ')) });
        }
        else if (error.name == 'SequelizeValidationError' || error.name == 'SequelizeUniqueConstraintError') {
            console.error('\x1b[33mError Validating!\x1b[0m');

            return res && res.status(400).json({ success: false, code: "badrequest", msg: "Bad request", reason: Object.keys(error.errors).map(k => _.pick(error.errors[k], ['message', 'type', 'path', 'value'])) });
        }
        else if (error.name == 'MulterError') {
            console.error('\x1b[33mMulterError Validating!\x1b[0m');

            return res && res.status(400).json({ success: false, code: "badrequest", msg: "Bad request", reason: { path: error.field, message: error.code } });
        }
        else if (error.name == 'SyntaxError') {
            console.error('\x1b[33mJSON Syntax Error!\x1b[0m');

            return res && res.status(400).json({ success: false, code: "badrequest", msg: "Invalid JSON string!" });
        }
        else if (error.message == 'NotFoundError') {
            console.error('\x1b[33mNot Found Error!\x1b[0m');

            return res && res.status(404).json({ success: false, code: "notfound", msg: "Not found" });
        }
        else {
            console.error('\x1b[31mUnhandled or internal error!\x1b[0m', `\x1b[31m${error}\x1b[0m`);

            return res && res.status(500).json({ success: false, code: "internal", msg: "Internal error" });
        }
    }
}
module.exports = { defaultErrorHandler };