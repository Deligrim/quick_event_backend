"use strict";
const jsUtils = require("util");
const multer = require("multer");
const _ = require("lodash");
const {
    ValidationError,
    ValidationErrorItem,
} = require("sequelize/lib/errors");


const uploadThumb = jsUtils.promisify(
    multer().single('thumbnail')
);

async function createEvent(req, res, next) {
    const { EventNote } = sequelize.models;
    try {
        await uploadThumb(req, res);
        const payload = {
            title: req.body.title,
            kind: req.body.kind,
            location: req.body.location,
            thumbnail: req.file,
            description: req.body.description,
            startDateOfEvent: new Date(req.body.startDateOfEvent),
            endDateOfEvent: new Date(req.body.endDateOfEvent)
        };
        const eventNote = await EventNote.createEvent(payload, {});
        return res.status(200).json({
            success: true,
            newEventId: eventNote.id
        });
    } catch (e) {
        console.log(e);
        next(e);
    }
}

async function updateEvent(req, res, next) {
    const { EventNote } = sequelize.models;
    try {
        await uploadThumb(req, res);
        const payload = {
            id: req.params.id,
            title: req.body.title,
            kind: req.body.kind,
            location: req.body.location,
            thumbnail: req.file,
            description: req.body.description,
            startDateOfEvent: req.body.startDateOfEvent && new Date(req.body.startDateOfEvent),
            endDateOfEvent: req.body.endDateOfEvent && new Date(req.body.endDateOfEvent)
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
async function getEvent(req, res, next) {
    const { EventNote } = sequelize.models;
    try {
        if (!req.params.id)
            return res.status(400).json({
                success: false,
                msg: "id param is required!"
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
module.exports = { createEvent, updateEvent, getEventsFeed, getEvent, deleteEvent };