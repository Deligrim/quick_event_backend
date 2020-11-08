"use strict";
(async () => {
    //require('./configs/index');
    require('dotenv').config();
    process.env.INTERNAL_PUBLIC_PATH = require('path').dirname(require.main.filename) + "/public";

    global.sequelize = require('./database/sequelize');

    const express = require("express");
    const app = express();
    var http = require('http').createServer(app);
    const bodyParser = require("body-parser");

    const logger = require('./diagnostics/http.logger');
    const hub = require('./routers/hub.router');

    app.use(express.static('public'));

    app.disable('etag'); // disable caching
    //app.use(cookieParser()); // parse the cookie

    app.use(bodyParser.json()); // parse application/json content
    app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded content

    app.use(logger); //logging to standard output all http request uses colored label

    app.use(process.env.PREFIX_API, hub); //enable API

    app.use((req, res) => {
        res.status(404).send('Not found!'); // not found handle
    });

    http.listen(process.env.PORT, () => {
        console.log(`*** ${process.env.APP_TITLE} listening on port ${process.env.PORT} ***`);
        //const io = require('./controllers/sockets/chat.controller').init(http);
    });

    module.exports = { app };
})()
