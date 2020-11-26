"use strict";
const router = require("express").Router();
//const authToken = require("../../middleware/auth/jwt.auth.js");

const { createEvent, getEventsFeed, getEvent, deleteEvent, updateEvent } = require("../../controllers/event.controller");
const auth = require.main.require('./middleware/auth/auth.js');

router.post("/admin/", auth.authAdmin, createEvent);
router.delete("/admin/:id", auth.authAdmin, deleteEvent);
router.put("/admin/:id", auth.authAdmin, updateEvent);

router.get("/", getEventsFeed);
router.get("/:id", getEvent);

router.put("/:id", auth.authToken, auth.organizatorGateway, updateEvent);



module.exports = router;
