"use strict";
const utils = require('./../utils.controller');

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

async function getSelf(req, res) {
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
        return utils.defaultErrorHandler(res, { name: "Unreachable!" });
    }
    catch (e) { return utils.defaultErrorHandler(res, e) }
}

async function getUserById(req, res) {
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
    } catch (e) { return utils.defaultErrorHandler(res, e) }
}

// async function followUserById(req, res) {
//     const userId = req.params.id;
//     try {
//         if (userId == req.user.id) {
//             return res.status(409).json({
//                 success: false,
//                 code: "conflict",
//                 msg: `Cannot follow yourself!`
//             });
//         }
//         let myself = await User.findByPk(req.user.id);
//         let user = await User.findByPk(userId);
//         if (!user)
//             return res.status(404).json({ success: false, code: "notfound", msg: "User not found" });
//         if ((await user.hasFollower(myself))) {
//             return res.status(409).json({
//                 success: false,
//                 code: "conflict",
//                 msg: `Already follows the user!`
//             });
//         }
//         await user.addFollower(myself);
//         return res.status(200).json({
//             success: true
//         });
//     } catch (e) { return utils.defaultErrorHandler(res, e) }
// }

// async function stopFollowUserById(req, res) {
//     const userId = req.params.id;
//     try {
//         if (userId == req.user.id) {
//             return res.status(409).json({
//                 success: false,
//                 code: "conflict",
//                 msg: `Cannot stop follow yourself!`
//             });
//         }
//         let myself = await User.findByPk(req.user.id);
//         let user = await User.findByPk(userId);
//         if (!user)
//             return res.status(404).json({
//                 success: false,
//                 code: "notfound",
//                 msg: "User not found"
//             });
//         if (!(await user.hasFollower(myself))) {
//             return res.status(409).json({
//                 success: false,
//                 code: "conflict",
//                 msg: `Already not following!`
//             });
//         }
//         await user.removeFollower(myself);
//         return res.status(200).json({
//             success: true
//         });
//     } catch (e) { return utils.defaultErrorHandler(res, e) }
// }

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

async function setupAvatar(req, res) {
    try {
        if (req.file && req.file.buffer) {
            var dbUser = await User.findByPk(req.user.id);
            await dbUser.setAvatarFromBuffer(req.file.buffer);
            return await getSelf(req, res);
        }
        else return res.status(400).json({ success: false, code: "badrequest", msg: "Image file is require!" });
    }
    catch (e) { return utils.defaultErrorHandler(res, e) }
}
async function removeAvatar(req, res) {
    try {
        var dbUser = await User.findByPk(req.user.id);
        await dbUser.deleteAvatar();
        return await getSelf(req, res);
    }
    catch (e) { return utils.defaultErrorHandler(res, e) }
}


module.exports = {
    getSelf,
    getUserById,
    getUsers,
    setupAvatar,
    removeAvatar,
    removeUser
};