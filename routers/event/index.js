"use strict";
const router = require("express").Router();
//const authToken = require("../../middleware/auth/jwt.auth.js");

const {
    createEvent,
    getEventsFeed,
    getEvent,
    deleteEvent,
    updateEvent,
    getMembersById,
    owningEventById,
    stopOwningEventById,
    followEventById,
    stopFollowEventById
} = require("../../controllers/event/event.controller");

const auth = require.main.require('./middleware/auth/auth.js');

router.post("/add/", auth.authAdmin, createEvent);
router.delete("/remove/:id", auth.authAdmin, deleteEvent);
router.put("/update/:id", auth.authAdmin, updateEvent);

router.get("/", getEventsFeed);
router.get("/:id", getEvent);
router.get("/:id/members", getMembersById);

router.put('/:eventId/organizeBy/:id', auth.authAdmin, owningEventById);

router.put('/:eventId/disorganize/:id', auth.authAdmin, stopOwningEventById);

router.put('/:eventId/follow', auth.authToken, followEventById);

router.put('/:eventId/unfollow', auth.authToken, stopFollowEventById);

router.put("/:id", auth.authToken, auth.organizatorGateway, updateEvent);



module.exports = router;
