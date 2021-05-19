"use strict";

const { User } = sequelize.models;

const _ = require('lodash');
const uuid = require('uuid');

async function getUsers(req, res, next) {
    //const { User } = sequelize.models;
    try {
        const users = await User.scope("clientView").findAll();
        //console.log(clips);
        return res.status(200).json({
            success: true,
            usersCount: (users && users.length) || 0,
            users: users || []
        });
    }
    catch (e) {
        next(e);
    }
}
async function removeUser(req, res, next) {
    try {
        const id = req.params.id;
        const user = await User.findByPk(id);
        if (user) {
            await user.destroyUser();
            return res.status(200).json({
                success: true
            });
        }
        else {
            return res.status(404).json({
                success: false,
                code: "notfound",
                msg: "User not exist!"
            });
        }
    }
    catch (e) {
        console.log(e.name);
        next(e);
    }
}

async function getSelf(req, res, next) {
    try {
        if (req.user) {
            let user = //.pick(req.user,['id','username'])
                (await User.scope('clientView').findByPk(req.user.id)).toJSON();
            //console.log('return');
            //console.log(user);
            //await new Promise(r => setTimeout(r, 2000));
            return res.status(200).json({
                success: true,
                user: user
            });
        }
        return next({ name: "Unreachable!" });
    }
    catch (e) { next(e); }
}

async function getUserById(req, res, next) {
    const userId = req.params.id;
    try {
        if (req.user && userId == req.user.id) {
            return getSelf(req, res);
        }
        let user = await User.scope('clientView').findByPk(userId);
        if (!user) return res.status(404).json({ success: false, code: "notfound", msg: "User not found" });

        return res.status(200).json({
            success: true,
            user: user.toJSON()
        });
    } catch (e) { next(e); }
}

async function getMyEvents(req, res, next) {
    req.params.id = req.user.id;
    return getUsersEvents(req, res, next);
}


async function getUsersEvents(req, res, next) {
    const { EventNote } = sequelize.models;
    try {
        let user = await User.findByPk(req.params.id, {
            include: {
                model: EventNote.scope({ method: ['preview', 'OwnEvents'] }),
                as: "OwnEvents",
                through: {
                    attributes: [],
                },
            },
        });
        if (!user)
            return res.status(404).json({
                success: false,
                code: "notfound",
                msg: "User not found"
            });

        return res.status(200).json({
            success: true,
            eventsCount: user.OwnEvents.length,
            events: user.OwnEvents
        });
    }
    catch (e) { next(e); }
}


async function updateUserInfo(req, res, next) {
    try {
        let id = req.params.id;
        if (req.user && req.user.role !== "admin") {
            id = req.user.id;
            delete req.body.role;
        }
        if (!uuid.validate(id))
            return res.status(400).json({
                success: false,
                msg: "id param is required uuid!"
            });
        await User.updateUser({ id, ...req.body }, {});
        return res.status(200).json({
            success: true
        });
    }
    catch (e) {
        next(e);
    }
}

async function setupAvatar(req, res, next) {
    try {
        if (req.file && req.file.buffer) {
            var dbUser = await User.findByPk(req.user.id);
            await dbUser.setAvatarFromBuffer(req.file.buffer);
            return getSelf(req, res);
        }
        else return res.status(400).json({ success: false, code: "badrequest", msg: "Image file is require!" });
    }
    catch (e) { next(e); }
}

async function removeAvatar(req, res, next) {
    try {
        var dbUser = await User.findByPk(req.user.id);
        await dbUser.deleteAvatar();
        return getSelf(req, res);
    }
    catch (e) { next(e); }
}


module.exports = {
    getSelf,
    getUserById,
    getUsers,
    setupAvatar,
    removeAvatar,
    removeUser,
    getMyEvents,
    getUsersEvents,
    updateUserInfo
};