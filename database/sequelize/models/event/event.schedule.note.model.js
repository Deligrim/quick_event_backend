const { DataTypes, Model } = require('sequelize');
const { ValidationError, ValidationErrorItem } = require('sequelize/lib/errors');
const geoService = require('../../../../services/geo/yandex.geo.service');
const _ = require("lodash");

class EventScheduleNote extends Model {
    static async createEventScheduleNote(payload, options) {
        var transaction = options.transaction || (await sequelize.transaction());
        try {
            if (payload.latitude && payload.longitude)
                payload.location = { type: 'Point', coordinates: [payload.longitude, payload.latitude] };
            payload = _.pick(payload,
                [
                    'dateFrom',
                    'dateTo',
                    'price',
                    'address',
                    'location',
                    'eventId'
                ]);

            if (payload.address) {
                const { longitude, latitude, addressName } = await geoService.getCoordsFromAddress(payload.address);
                payload.address = addressName;
                payload.location = { type: 'Point', coordinates: [longitude, latitude] };

            }
            else if (payload.location) {
                const { address } = await geoService.getAddressFromCords(
                    payload.location.coordinates[0],
                    payload.location.coordinates[1]);
                payload.address = address;
            }
            const city = await EventScheduleNote.create(payload, { transaction });

            if (!options.transaction) transaction.commit().catch(() => {/*rollback already call*/ });
            return city;
        }
        catch (e) {
            if (!options.transaction) await transaction.rollback();
            throw e;
        }
    }
    //static async updateEventScheduleNote(payload, options) { }
    async destroyEventScheduleNote(options) {
        var transaction = options && options.transaction || (await sequelize.transaction());
        try {
            await this.destroy({ transaction });
            if (!options || !options.transaction) await transaction.commit();
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
        if (attributes.distance) {
            attributes.distance = +attributes.distance;
        }
        if (this.constructor._scopeNames.includes("clientView")) {
            delete attributes.id;
        }
        return attributes
    }
}

module.exports = {
    init: (sequelize) => {
        EventScheduleNote.init({
            id: {
                allowNull: false,
                primaryKey: true,
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4
            },
            dateFrom: {
                allowNull: false,
                type: DataTypes.DATE,
            },
            dateTo: {
                allowNull: false,
                type: DataTypes.DATE,
            },
            price: {
                type: DataTypes.INTEGER,
                validate: {
                    min: 0
                }
            },
            address: {
                allowNull: false,
                type: DataTypes.STRING,
                validate: {
                    len: [2, 100]
                }
            },
            location: {
                allowNull: false,
                type: DataTypes.GEOMETRY('POINT', 4326),
            },
        }, {
            sequelize,
            modelName: 'EventScheduleNote',
            timestamps: false,
            indexes: [
                {
                    name: 'schedule_location_index',
                    using: 'GIST',
                    fields: ['location']
                }
            ]
        });
    },
    assoc: (sequelize) => {
        const { EventNote } = sequelize.models;
        EventScheduleNote.belongsTo(EventNote, {
            as: 'Event',
            foreignKey: 'eventId'
        });
        EventScheduleNote.addScope("clientView", {
            attributes: ['id', 'dateFrom', 'dateTo', 'address', 'location'],
        });
        EventScheduleNote.addScope("pointDistance", function (coors = [33, 44], alias = "Schedules") {
            return {
                attributes: [
                    'id', 'dateFrom', 'dateTo', 'address', 'location',
                    [sequelize.literal(`("${alias}"."location"::point <@> '(${coors[0]}, ${coors[1]})')::numeric * 1.609344`), 'distance']
                ],
            }
        });
    }
}