"use strict";
const router = require("express").Router();
//const authToken = require("../../middleware/auth/jwt.auth.js");

const {
    createEvent,
    getEventsFeed,
    getNearestEvents,
    getEvent,
    deleteEvent,
    updateEvent,
    getMembersById,
    owningEventById,
    stopOwningEventById,
    followEventById,
    stopFollowEventById,
    isFollowToEvent,
    getPostsById
} = require("../../controllers/event/event.controller");

const auth = require.main.require('./middleware/auth/auth.js');

router.post("/add/", auth.authAdmin, createEvent);
router.delete("/remove/:id", auth.authAdmin, deleteEvent);
router.put("/update/:id", auth.authAdmin, updateEvent);

router.get("/", getEventsFeed);
router.get("/nearest", getNearestEvents);
router.get("/:id", getEvent);
router.get("/:id/members", getMembersById);
router.get("/:id/posts", getPostsById);

router.get('/:eventId/isFollowBy/:userId', isFollowToEvent);

router.put('/:eventId/organizeBy/:id', auth.authAdmin, owningEventById);

router.put('/:eventId/disorganize/:id', auth.authAdmin, stopOwningEventById);

router.put('/:eventId/follow', auth.authToken, followEventById);

router.put('/:eventId/unfollow', auth.authToken, stopFollowEventById);

router.put("/:id", auth.authToken, auth.organizatorGateway, updateEvent);



module.exports = router;
