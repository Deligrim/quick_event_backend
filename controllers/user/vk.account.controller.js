"use strict";
const vkService = require('../../services/social/vk.api');
const fileLoader = require('../../services/loaders/file.loader');
const { v4: uuidv4 } = require('uuid');
const fsUtils = require("../../utils-modules/filesystem.utils");

const { VKAccount, User, Image } = sequelize.models;
const {
    ValidationError,
    ValidationErrorItem,
} = require("sequelize/lib/errors");

async function authentication(req, res, next) {
    if (!req.body.token) {
        return next(
            new ValidationError(null, [
                new ValidationErrorItem(
                    "Access token not provided",
                    null,
                    "token",
                    null
                ),
            ]));
    }
    var tokenInfo;
    try {
        console.log(`Get info about vk user from token: ${req.body.token}`);
        tokenInfo = await vkService.checkToken(req.body.token);
        console.log(tokenInfo);
        if (tokenInfo.error || !tokenInfo.response)
            return next(
                new ValidationError(null, [
                    new ValidationErrorItem(
                        (tokenInfo.error && tokenInfo.error.error_msg) ?? "Access token auth failure",
                        null,
                        "token",
                        req.body.token
                    ),
                ]));
        if (tokenInfo.response.expire === 1) {
            return next(
                new ValidationError(null, [
                    new ValidationErrorItem(
                        "Access token is expire",
                        null,
                        "token",
                        req.body.token
                    ),
                ]));
        }
    }
    catch (error) {
        return next({ name: "ThridPartyServiceError", message: "Thrid-party service error" });
    }
    const transaction = await sequelize.transaction();
    let avatar = null;
    try {
        const vkId = tokenInfo.response.user_id;

        const existAccount = await VKAccount.findByVKId(vkId, { transaction });

        let user;
        let firstAuth = false;
        if (existAccount) {
            user = existAccount.User;
        }
        else {
            firstAuth = true;
            console.log(`get info about user id: ${vkId}`);
            const userInfo = await vkService.getUser(vkId);
            console.log(userInfo);
            if (userInfo.error || !userInfo.response || userInfo.response.length !== 1) {
                return next({ name: "ThridPartyServiceError", message: "Thrid-party service error" });
            }
            console.log(`Download avatar from url: ${userInfo.response[0].photo_400_orig}`);
            avatar = await fileLoader.downloadFile(userInfo.response[0].photo_400_orig, uuidv4());

            user = await User.createUser({
                firstName: userInfo.response[0].first_name,
                lastName: userInfo.response[0].last_name,
                avatar
            }, { transaction });

            const creds = {
                UserId: user.id,
                vkId
            }
            await VKAccount.create(creds, { transaction });
        }

        await transaction.commit();
        const jwt = await user.generateAuthToken();
        const firebaseToken = await user.generateFirebaseToken();
        res.json({
            success: true,
            token: jwt,
            firebaseToken,
            userId: user.id,
            firstAuth
        });
    } catch (error) {
        next(error);
        transaction.rollback();
    }
    finally {
        if (avatar)
            fsUtils.deleteFileSync(avatar, false);
    }
}
module.exports = { authentication };