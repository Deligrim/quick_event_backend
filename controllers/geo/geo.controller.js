const citySchema = require("../../database/schemas/city.shema");
const {
    ValidationError,
    ValidationErrorItem,
} = require("sequelize/lib/errors");
const _ = require("lodash");

async function createCity(req, res, next) {
    const { EventCity } = sequelize.models;
    try {
        console.log(req.body);
        const city = await EventCity.createEventCity(citySchema.validate(req.body).instance, {});
        return res.status(200).json({
            success: true,
            newCityId: city.id
        });
    } catch (e) {
        //console.log(e);
        next(e);
    }
}
async function getCityList(req, res, next) {
    const { EventCity } = sequelize.models;
    try {
        const cities = await EventCity.findAll();
        return res.status(200).json({
            success: true,
            cities: cities || []
        });
    }
    catch (e) {
        next(e);
    }
}
async function getCityFromId(req, res, next) {
    const { EventCity } = sequelize.models;
    try {
        if (!req.params.id)
            return res.status(400).json({
                success: false,
                msg: "id param is required!"
            });
        const city = await EventCity.findByPk(req.params.id);
        if (city)
            return res.status(200).json({
                success: true,
                city
            });
        return res.status(404).json({
            success: false,
            msg: "City not exist!"
        });
    }
    catch (e) {
        next(e);
    }
}
async function updateCityFromId(req, res, next) {
    const { EventCity } = sequelize.models;
    try {
        if (!req.params.id)
            return res.status(400).json({
                success: false,
                msg: "id param is required!"
            });

        const city = await EventCity.updateEventCity(
            {
                id: req.params.id,
                ...citySchema.validateNonStrict(req.body).instance,
            }, {});
        if (city)
            return res.status(200).json({
                success: true,
                city
            });
        return res.status(404).json({
            success: false,
            msg: "City not exist!"
        });
    }
    catch (e) {
        next(e);
    }
}
async function deleteCityFromId(req, res, next) {
    const { EventCity } = sequelize.models;
    try {
        if (!req.params.id)
            return res.status(400).json({
                success: false,
                msg: "id param is required!"
            });

        const city = await EventCity.findByPk(req.params.id);
        if (city) {
            await city.destroyEventCity({});
            return res.status(200).json({
                success: true
            });
        }
        return res.status(404).json({
            success: false,
            msg: "City not exist!"
        });
    }
    catch (e) {
        next(e);
    }
}
async function getEventListFromCityId(req, res, next) {
    const { EventCity } = sequelize.models;
    try {
        if (!req.params.id)
            return res.status(400).json({
                success: false,
                msg: "id param is required!"
            });
        const city = await EventCity.findByPk(req.params.id);
        if (!city)
            return res.status(404).json({
                success: false,
                msg: "City not exist!"
            });
        const events = await city.getEvents({ scope: { method: ['preview', 'EventNote'] } });
        return res.status(200).json({
            success: true,
            events: events || []
        });
    }
    catch (e) {
        next(e);
    }
}
module.exports = {
    createCity,
    getCityFromId,
    getCityList,
    updateCityFromId,
    deleteCityFromId,
    getEventListFromCityId
};