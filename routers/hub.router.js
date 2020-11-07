"use strict";
const router = require('express').Router();
const errorHandler = require('../controllers/utils.controller');

const { readdirSync } = require('fs')

const getDirectories = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
const routersList = getDirectories('./routers/');

routersList.forEach(x => router.use(`/${x}`, require(`./${x}`)));
router.use((err, req, res, next) => errorHandler.defaultErrorHandler(res, err));

console.log('Loaded routers: ' + routersList.join(', '));

module.exports = router;
