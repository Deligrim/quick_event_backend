"use strict";
const jsUtils = require("util");
const multer = require("multer");
const _ = require("lodash");
const eventSchema = require("../../database/schemas/event.shema");
const {
    ValidationError,
    ValidationErrorItem,
} = require("sequelize/lib/errors");
const uuid = require('uuid');

const uploadPhotos = jsUtils.promisify(
    multer().array('photos', 15)
);

async function createEvent(req, res, next) {
    const { EventNote } = sequelize.models;
    try {
        await uploadPhotos(req, res);
        if (req.files.length < 1) {
            throw new ValidationError(null, [
                new ValidationErrorItem('There must be at least one photo', 'Validation error', 'photos')
            ]);
        }
        const payload = {
            ...eventSchema.validate(req.body).instance,
            photos: req.files.map(x => x.buffer)
        };
        console.log(payload);
        const eventNote =
            await EventNote.createEvent(payload, {});
        return res.status(200).json({
            success: true,
            newEventId: eventNote.id
        });
    } catch (e) {
        //console.log(e);
        next(e);
    }
}

async function updateEvent(req, res, next) {
    const { EventNote } = sequelize.models;
    try {

        await uploadPhotos(req, res);
        if (!uuid.validate(req.params.id))
            return res.status(400).json({
                success: false,
                msg: "id param is required uuid!"
            });
        const payload = {
            ...eventSchema.validate(req.body, false).instance,
            photos: req.files.map(x => x.buffer),
            id: req.params.id
        };
        await EventNote.updateEvent(payload, {});
        return res.status(200).json({
            success: true
        });
    } catch (e) {
        console.log(e);
        next(e);
    }
}


async function getEventsFeed(req, res, next) {
    const { EventNote } = sequelize.models;
    try {
        const events = await EventNote.scope("preview").findAll();

        if (events)
            return res.status(200).json({
                success: true,
                events
            });
        else
            return res.status(404).json({
                success: false,
                msg: "Events not exist!"
            });
    }
    catch (e) {
        next(e);
    }
}

async function getNearestEvents(req, res, next) {
    const { EventNote } = sequelize.models;
    try {
        let { log, lat, lim } = req.query;
        if (!log || !lat)
            return res.status(400).json({
                success: false,
                msg: "log and lat query params is required!"
            });
        else {
            log = +log;
            lat = +lat;
        }
        const events = await EventNote.scope({
            method: ['orderPointDistance', [log, lat], lim]
        }).findAll();

        if (events)
            return res.status(200).json({
                success: true,
                events
            });
        else
            return res.status(404).json({
                success: false,
                msg: "Events not exist!"
            });
    }
    catch (e) {
        next(e);
    }
}

async function getEvent(req, res, next) {
    const { EventNote } = sequelize.models;
    try {
        if (!uuid.validate(req.params.id))
            return res.status(400).json({
                success: false,
                msg: "id param is required uuid!"
            });
        const eventNote = await EventNote.scope("clientView").findByPk(req.params.id);
        if (eventNote)
            return res.status(200).json({
                success: true,
                eventNote
            });
        else
            return res.status(404).json({
                success: false,
                msg: "Event not exist!"
            });
    }
    catch (e) {
        next(e);
    }
}
async function deleteEvent(req, res, next) {
    const { EventNote } = sequelize.models;
    try {
        if (!uuid.validate(req.params.id))
            return res.status(400).json({
                success: false,
                msg: "id param is required uuid!"
            });
        const id = req.params.id;
        const eventNote = await EventNote.findByPk(id);
        if (eventNote) {
            await eventNote.destroyEvent();
            return res.status(200).json({
                success: true
            });
        }
        else {
            return res.status(404).json({
                success: false,
                msg: "Event not exist!"
            });
        }
    }
    catch (e) {
        console.log(e.name);
        next(e);
    }
}

async function getMembersById(req, res, next) {
    const { EventNote, User } = sequelize.models;
    try {
        if (!uuid.validate(req.params.id))
            return res.status(400).json({
                success: false,
                msg: "id param is required uuid!"
            });
        let event = await EventNote.findByPk(req.params.id, {
            include: {
                model: User.scope({ method: ['preview', 'Members.'] }),
                as: "Members",
                through: {
                    attributes: [],
                },
            },
        });
        if (!event)
            return res.status(404).json({
                success: false,
                code: "notfound",
                msg: "Event not found"
            });

        return res.status(200).json({
            success: true,
            membersCount: event.Members.length,
            members: event.Members
        });
    }
    catch (e) { next(e); }
}
async function getPostsById(req, res, next) {
    const { EventNote } = sequelize.models;
    try {
        if (!uuid.validate(req.params.id))
            return res.status(400).json({
                success: false,
                msg: "id param is required uuid!"
            });
        let event = await EventNote.findByPk(req.params.id);
        if (!event)
            return res.status(404).json({
                success: false,
                code: "notfound",
                msg: "Event not found"
            });
        const posts = await event.getPosts({ scope: 'withoutEvent' });
        return res.status(200).json({
            success: true,
            postsCount: posts.length,
            posts
        });
    }
    catch (e) { next(e); }
}

//admin
async function owningEventById(req, res, next) {
    const { User, EventNote } = sequelize.models;
    if (!uuid.validate(req.params.eventId))
        return res.status(400).json({
            success: false,
            msg: "eventId param is required uuid!"
        });
    if (!uuid.validate(req.params.id))
        return res.status(400).json({
            success: false,
            msg: "id param is required uuid!"
        });
    const eventId = req.params.eventId;
    const userId = req.params.id;
    try {
        let user = await User.findByPk(userId);
        let event = await EventNote.findByPk(eventId);
        if (!user)
            return res.status(404).json({ success: false, code: "notfound", msg: "User not found" });
        if (user.role != "organizator")
            return res.status(409).json({ success: false, code: "conflict", msg: "User role is not organizator" });
        if (!event)
            return res.status(404).json({ success: false, code: "notfound", msg: "Event not found" });
        if ((await event.hasMembers(user))) {
            return res.status(409).json({
                success: false,
                code: "conflict",
                msg: `Already follows the event!`
            });
        }
        await event.addMember(user);
        return res.status(200).json({
            success: true
        });
    } catch (e) { return next(e) }
}

async function stopOwningEventById(req, res) {
    const eventId = req.params.eventId;
    const userId = req.params.id;
    if (!uuid.validate(eventId))
        return res.status(400).json({
            success: false,
            msg: "eventId param is required uuid!"
        });
    if (!uuid.validate(userId))
        return res.status(400).json({
            success: false,
            msg: "id param is required uuid!"
        });
    const { User, EventNote } = sequelize.models;
    try {
        let user = await User.findByPk(userId);
        let event = await EventNote.findByPk(eventId);
        if (!event)
            return res.status(404).json({
                success: false,
                code: "notfound",
                msg: "Event not found"
            });
        if (!user)
            return res.status(404).json({
                success: false,
                code: "notfound",
                msg: "User not found"
            });
        if (!(await event.hasMembers(user))) {
            return res.status(409).json({
                success: false,
                code: "conflict",
                msg: `Already not following!`
            });
        }
        await event.removeMember(user);
        return res.status(200).json({
            success: true
        });
    } catch (e) { return next(e) }
}

async function followEventById(req, res, next) {
    const { User, EventNote } = sequelize.models;
    const eventId = req.params.eventId;
    if (!uuid.validate(eventId))
        return res.status(400).json({
            success: false,
            msg: "eventId param is required uuid!"
        });
    try {
        let myself = await User.findByPk(req.user.id);
        let event = await EventNote.findByPk(eventId);
        if (myself.role != "user")
            return res.status(409).json({ success: false, code: "conflict", msg: "User role is not user" });
        if (!event)
            return res.status(404).json({ success: false, code: "notfound", msg: "Event not found" });
        if ((await event.hasMembers(myself))) {
            return res.status(409).json({
                success: false,
                code: "conflict",
                msg: `Already follows the event!`
            });
        }
        await event.addMember(myself);
        return res.status(200).json({
            success: true
        });
    } catch (e) { return next(e) }
}

async function isFollowToEvent(req, res, next) {
    const { User, EventNote } = sequelize.models;
    const eventId = req.params.eventId;
    const userId = req.params.userId;
    if (!uuid.validate(eventId))
        return res.status(400).json({
            success: false,
            msg: "eventId param is required uuid!"
        });
    if (!uuid.validate(userId))
        return res.status(400).json({
            success: false,
            msg: "userId param is required uuid!"
        });
    try {
        let user = await User.findByPk(userId);
        let event = await EventNote.findByPk(eventId);
        if (!user)
            return res.status(404).json({ success: false, code: "notfound", msg: "User not found" });
        if (!event)
            return res.status(404).json({ success: false, code: "notfound", msg: "Event not found" });
        return res.status(200).json({
            success: true,
            isFollow: await event.hasMembers(user)
        });
    } catch (e) { return next(e) }
}

async function stopFollowEventById(req, res) {
    const eventId = req.params.eventId;
    if (!uuid.validate(eventId))
        return res.status(400).json({
            success: false,
            msg: "eventId param is required uuid!"
        });
    const { User, EventNote } = sequelize.models;
    try {
        let myself = await User.findByPk(req.user.id);
        let event = await EventNote.findByPk(eventId);
        if (!event)
            return res.status(404).json({
                success: false,
                code: "notfound",
                msg: "Event not found"
            });
        if (!(await event.hasMembers(myself))) {
            return res.status(409).json({
                success: false,
                code: "conflict",
                msg: `Already not following!`
            });
        }
        await event.removeMember(myself);
        return res.status(200).json({
            success: true
        });
    } catch (e) { return next(e) }
}

// async function getOrganizatorsById(req, res, next) {

// }

module.exports = {
    createEvent,
    updateEvent,
    getEventsFeed,
    getNearestEvents,
    getEvent,
    deleteEvent,
    getMembersById,
    owningEventById,
    stopOwningEventById,
    followEventById,
    stopFollowEventById,
    isFollowToEvent,
    getPostsById
};