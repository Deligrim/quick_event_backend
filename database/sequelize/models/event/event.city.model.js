const { DataTypes, Model } = require('sequelize');
const { ValidationError, ValidationErrorItem } = require('sequelize/lib/errors');
const _ = require("lodash");
class EventCity extends Model {

    static async createEventCity(payload, options) {
        var transaction = options.transaction || (await sequelize.transaction());
        try {
            console.log(payload);
            if (payload.latitude && payload.longitude)
                payload.location = { type: 'Point', coordinates: [payload.longitude, payload.latitude] };
            payload = _.pick(payload,
                [
                    'name',
                    'location',
                    'radius'
                ]);
            const city = await EventCity.create(payload, { transaction });
            if (!options.transaction) transaction.commit().catch(() => {/*rollback already call*/ });
            return city;
        }
        catch (e) {
            if (!options.transaction) await transaction.rollback();
            throw e;
        }
    }

    async destroyEventCity(options) {
        var transaction = options && options.transaction || (await sequelize.transaction());
        const bindEvents = await this.getEvents({ transaction });
        if (bindEvents && bindEvents.length > 0) {
            throw new ValidationError(null, [
                new ValidationErrorItem(
                    "Сity has events attached. Destruction is prohibited.",
                    null,
                    "city.Events",
                    bindEvents.map(x => x.id)
                ),
            ]);
        }
        try {

            await this.destroy({ transaction });
            if (!options || !options.transaction) await transaction.commit();
        }
        catch (e) {
            if (!options || !options.transaction) await transaction.rollback();
            throw e;
        }
    }
    static async updateEventCity(payload, options) {
        var transaction = options && options.transaction || (await sequelize.transaction());
        try {
            const eventCity = await EventCity.findByPk(payload.id, { transaction });
            //console.log(eventCity);
            if (!eventCity) {
                throw new ValidationError(null, [
                    new ValidationErrorItem(
                        "City not exist in database",
                        null,
                        "payload.id",
                        null
                    ),
                ]);
            }
            if (payload.latitude && payload.longitude)
                payload.location = { type: 'Point', coordinates: [payload.longitude, payload.latitude] };
            payload = _.defaults(_.pick(payload,
                [
                    'name',
                    'location',
                    'radius'
                ]),
                {
                    name: eventCity.name,
                    location: eventCity.location,
                    radius: eventCity.radius,
                });
            _.assign(eventCity, payload)
            await eventCity.save({ transaction });
            if (!options.transaction)
                transaction.commit().catch(() => {/*rollback already call*/ });
            return eventCity;
        }
        catch (e) {
            if (!options || !options.transaction) await transaction.rollback();
            throw e;
        }
    }
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.location) {
            attributes.longitude = attributes.location.coordinates[0];
            attributes.latitude = attributes.location.coordinates[1];
            delete attributes.location;
        }
        return attributes
    }
}

module.exports = {
    init: (sequelize) => {
        EventCity.init({
            id: {
                allowNull: false,
                primaryKey: true,
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4
            },
            name: {
                allowNull: false,
                type: DataTypes.STRING,
                unique: {
                    msg: "This city name is already exist",
                },
                validate: {
                    len: [1, 40]
                }
            },
            location: {
                allowNull: false,
                type: DataTypes.GEOMETRY('POINT', 4326),
            },
            radius: {
                allowNull: false,
                type: DataTypes.INTEGER,
                validate: {
                    min: 1
                }
            },
        }, {
            sequelize,
            modelName: 'EventCity',
            timestamps: false,
            indexes: [
                {
                    name: 'city_location_index',
                    using: 'GIST',
                    fields: ['location']
                }
            ]
        });
    },
    assoc: (sequelize) => {
        const { EventNote } = sequelize.models;
        EventCity.hasMany(EventNote, {
            as: 'Events',
            foreignKey: 'regionId'
        });
        EventCity.addScope("preview", {
            attributes: ['id', 'name']
        });
    }
}