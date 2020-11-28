"use strict";
//definition type for VSCode annotations
// const { Sequelize } = require('sequelize/types');
// /** @type { Sequelize } */
//const sequelize = process.env.sequelize; // get instance
const { MailAccount, User, Image } = sequelize.models;

const _ = require("lodash");
const utils = require("./../utils.controller");



async function create(req, res) {
    const transaction = await sequelize.transaction();
    try {
        var avatarBuffer = req.file && req.file.buffer;

        var creds = _.pick(req.body, ["email", "password"]);
        console.log("create user:");
        console.log(_.pick(req.body, ["firstName", "lastName", "role"]));
        var user = await User.create(_.pick(req.body, ["firstName", "lastName", "role"]), {
            transaction,
        });
        creds.UserId = user.id;
        if (avatarBuffer)
            await user.setAvatarFromBuffer(avatarBuffer, transaction);
        else {
            await user.setAvatar(await Image.findOne({
                isDefault: true
            }, { transaction }), { transaction })
        }
        //await User.save({ transaction });
        await MailAccount.create(creds, { transaction });
        //await account.setUser(User, { transaction });
        await transaction.commit();
        return res.json({ success: true, newUserId: user.id });
    } catch (error) {
        utils.defaultErrorHandler(res, error);
        transaction.rollback();
    }
}

async function register(req, res) {
    const transaction = await sequelize.transaction();
    try {
        var avatarBuffer = req.file && req.file.buffer;
        console.log(req.body);

        var creds = _.pick(req.body, ["email", "password"]);
        var user = await User.create(_.pick(req.body, ["firstName", "lastName"]), {
            transaction,
        });
        creds.UserId = user.id;
        if (avatarBuffer)
            await user.setAvatarFromBuffer(avatarBuffer, transaction);
        else {
            const defaultAvatar = await Image.scope("defaultAvatar").findOne();
            await user.setAvatar(defaultAvatar, { transaction });
        }
        //await User.save({ transaction });
        await MailAccount.create(creds, { transaction });
        //await account.setUser(User, { transaction });
        await transaction.commit();
        return res.json({ success: true, msg: "Successful created new user" });
    } catch (error) {
        utils.defaultErrorHandler(res, error);
        transaction.rollback();
    }
}

async function login(req, res) {
    try {
        const creds = _.pick(req.body, ["email", "password"]);
        const account = await MailAccount.findByCredentials(creds);
        if (!account)
            return res.status(401).json({
                success: false,
                code: "auth_failed",
                msg: "Authentication failed",
            });
        const token = await account.User.generateAuthToken();
        return res.json({
            success: true,
            token: `${token}`,
            userId: account.UserId,
        });
    } catch (error) {
        return utils.defaultErrorHandler(res, error);
    }
}

module.exports = {
    create,
    register,
    login,
};
