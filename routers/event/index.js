"use strict";
const router = require("express").Router();
//const authToken = require("../../middleware/auth/jwt.auth.js");

const { createEvent, getEventsFeed, getEvent, deleteEvent } = require("../../controllers/event.controller");

//router.use(authToken);

router.post("/", createEvent);
router.get("/", getEventsFeed);
router.get("/:id", getEvent);
router.delete("/:id", deleteEvent);

module.exports = router;
