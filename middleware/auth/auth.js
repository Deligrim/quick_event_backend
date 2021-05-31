"use strict";
//definition type for VSCode annotations
// const { Sequelize } = require('sequelize/types');
// /** @type { Sequelize } */

const utils = require('../../controllers/utils.controller');

function getToken(headers) {
    if (headers && headers.authorization) {
        return headers.authorization.trim();
        // var parted = headers.authorization.split(" ");
        // if (parted.length === 2) {
        //     return parted[1];
        // } else {
        //     return null;
        // }
    } else {
        return null;
    }
}
async function authAdmin(req, res, next) {
    const token = getToken(req.headers);
    if (token !== process.env.ADMIN_TOKEN) {
        return res.status(403).send({
            success: false,
            code: "forbidden",
            msg: "Authentication failed"
        });
    }
    req.user = { role: "admin" }
    return next();
}
async function authToken(req, res, next) {

    const token = getToken(req.headers);
    try {
        if (!token) {
            return res.status(401).send({
                success: false,
                code: "no_token_supplied",
                msg: "Authentication failed. Token not provided."
            });
        }
        const user = (await sequelize.models.User.findByToken(token));

        if (!user) {
            return res.status(403).send({
                success: false,
                code: "id_not_found",
                msg: "Authentication failed. User not exist."
            });
        }
        req.user = user.toJSON(); //dont use sequelize with this instance;
        return next();
    } catch (error) {
        return utils.defaultErrorHandler(res, error);
    }
}

async function nonStrictAuthToken(req, res, next) {

    const token = getToken(req.headers);
    try {
        if (!token) {
            return next(); //skip auth
        }
        if (token == process.env.ADMIN_TOKEN) {
            req.user = { role: "admin" }
            return next();
        }

        const user = (await sequelize.models.User.findByToken(token));

        if (!user) {
            return res.status(403).send({
                success: false,
                code: "id_not_found",
                msg: "Authentication failed. User not exist."
            });
        }
        req.user = user.toJSON(); //dont use sequelize with this instance;
        return next();
    } catch (error) {
        return utils.defaultErrorHandler(res, error);
    }
}

async function organizatorGateway(req, res, next) {
    if (req.user.role !== "organizator")
        return res.status(403).json({
            success: false,
            code: "forbidden",
            msg: `You dont have requered permissions!`
        });
    else return next();
}

module.exports = { organizatorGateway, authToken, nonStrictAuthToken, authAdmin };

