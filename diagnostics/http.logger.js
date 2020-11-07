"use strict";
const express = require("express");
const apiRoutes = express.Router();
const morgan = require("morgan");

apiRoutes.use(morgan('\x1b[32m:method :url :status\x1b[0m',
    {
        skip: function (req, res) { return res.statusCode >= 400 }
    }));

apiRoutes.use(morgan('\x1b[31m:remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] bytes ":referrer" ":user-agent"\x1b[0m',
    {
        skip: function (req, res) { return res.statusCode < 500 }
    }));
apiRoutes.use(morgan('\x1b[33m:method :url :status :response-time ms - :res[content-length] bytes\x1b[0m',
    {
        skip: function (req, res) { return res.statusCode < 400 || res.statusCode >= 500 }
    }));

module.exports = apiRoutes;