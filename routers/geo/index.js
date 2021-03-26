"use strict";
const router = require("express").Router();
//const authToken = require("../../middleware/auth/jwt.auth.js");

const {
    createCity,
    getCityFromId,
    getCityList,
    updateCityFromId,
    deleteCityFromId,
    getEventListFromCityId
} = require("../../controllers/geo/geo.controller");

const auth = require.main.require('./middleware/auth/auth.js');

router.post("/add/", auth.authAdmin, createCity);
router.delete("/remove/:id", auth.authAdmin, deleteCityFromId);
router.put("/update/:id", auth.authAdmin, updateCityFromId);

router.get("/", getCityList);
router.get("/:id", getCityFromId);
router.get("/:id/events", getEventListFromCityId);

module.exports = router;
