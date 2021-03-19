"use strict";

const { User } = sequelize.models;

const _ = require('lodash');

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
            return await getSelf(req, res);
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
                model: EventNote.scope({ method: ['preview', 'OwnEvents.'] }),
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

//admin
async function owningEventById(req, res, next) {
    const { EventNote } = sequelize.models;
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
    const { EventNote } = sequelize.models;
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
    const { EventNote } = sequelize.models;
    const eventId = req.params.eventId;
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

async function stopFollowEventById(req, res) {
    const eventId = req.params.eventId;
    const { EventNote } = sequelize.models;
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

// async function getUserSubscriptionsById(req, res) {
//     const userId = req.params.id;
//     try {
//         let user = await User.findOne({
//             where: {
//                 id: userId
//             },
//             include: {
//                 model: User.scope({ method: ['preview', 'Subscriptions.'] }),
//                 as: "Subscriptions",
//                 through: {
//                     attributes: [],
//                 },
//             },
//         });
//         if (!user)
//             return res.status(404).json({
//                 success: false,
//                 code: "notfound",
//                 msg: "User not found"
//             });

//         return res.status(200).json({
//             success: true,
//             subscriptionsCount: user.Subscriptions.length,
//             subscriptions: user.Subscriptions
//         });
//     } catch (e) { return utils.defaultErrorHandler(res, e) }
// }

// async function getUserFollowersById(req, res) {
//     const userId = req.params.id;
//     try {

//         let user = await User.findOne({
//             where: {
//                 id: userId
//             },
//             include: {
//                 model: User.scope({ method: ['preview', 'Followers.'] }),
//                 as: "Followers",
//                 through: {
//                     attributes: []
//                 }
//             },

//         });
//         if (!user)
//             return res.status(404).json({
//                 success: false,
//                 code: "notfound",
//                 msg: "User not found"
//             });
//         return res.status(200).json({
//             success: true,
//             followersCount: user.Followers.length,
//             followers: user.Followers
//         });
//     } catch (e) { return utils.defaultErrorHandler(res, e) }
// }

async function setupAvatar(req, res, next) {
    try {
        if (req.file && req.file.buffer) {
            var dbUser = await User.findByPk(req.user.id);
            await dbUser.setAvatarFromBuffer(req.file.buffer);
            return await getSelf(req, res);
        }
        else return res.status(400).json({ success: false, code: "badrequest", msg: "Image file is require!" });
    }
    catch (e) { next(e); }
}
async function removeAvatar(req, res, next) {
    try {
        var dbUser = await User.findByPk(req.user.id);
        await dbUser.deleteAvatar();
        return await getSelf(req, res);
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
    owningEventById,
    stopOwningEventById,
    followEventById,
    stopFollowEventById
};