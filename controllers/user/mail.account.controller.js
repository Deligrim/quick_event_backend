"use strict";
//definition type for VSCode annotations
// const { Sequelize } = require('sequelize/types');
// /** @type { Sequelize } */
//const sequelize = process.env.sequelize; // get instance
const { MailAccount, User, Image } = sequelize.models;

const _ = require("lodash");


async function create(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
        var avatar = req.file && req.file.buffer;


        console.log("create user:");
        console.log(_.pick(req.body, ["firstName", "lastName", "role"]));

        var user = await User.createUser({
            firsName: req.body.firsName,
            lastName: req.body.lastName,
            role: req.body.role,
            avatar
        }, { transaction });

        var creds = _.pick(req.body, ["email", "password"]);
        creds.UserId = user.id;
        await MailAccount.create(creds, { transaction });
        await transaction.commit();
        return res.json({ success: true, newUserId: user.id });
    } catch (error) {
        next(error);
        transaction.rollback();
    }
}

async function register(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
        var avatar = req.file && req.file.buffer;
        console.log(req.body);

        var user = await User.createUser({
            firsName: req.body.firsName,
            lastName: req.body.lastName,
            avatar
        }, { transaction });

        var creds = _.pick(req.body, ["email", "password"]);
        creds.UserId = user.id;

        //await User.save({ transaction });
        await MailAccount.create(creds, { transaction });
        //await account.setUser(User, { transaction });
        await transaction.commit();
        return res.json({ success: true, msg: "Successful created new user" });
    } catch (error) {
        next(error);
        transaction.rollback();
    }
}

async function login(req, res, next) {
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
        next(error);
    }
}

module.exports = {
    create,
    register,
    login,
};
