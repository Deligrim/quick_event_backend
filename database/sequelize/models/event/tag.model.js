const { DataTypes, Model } = require('sequelize');
const { ValidationError, ValidationErrorItem } = require('sequelize/lib/errors');
const _ = require("lodash");
class Tag extends Model {
    static async createTag(title, options) {
        var transaction = options.transaction || (await sequelize.transaction());
        try {
            const tag = await Tag.create({ title }, { transaction });
            if (!options.transaction) transaction.commit().catch(() => {/*rollback already call*/ });
            return tag;
        }
        catch (e) {
            if (!options.transaction) await transaction.rollback();
            throw e;
        }
    }

    async destroyTag(options) {
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
}

module.exports = {
    init: (sequelize) => {
        Tag.init({
            title: {
                allowNull: false,
                primaryKey: true,
                type: DataTypes.STRING,
                validate: {
                    len: [1, 40]
                }
            },

        }, {
            sequelize,
            modelName: 'Tag',
            timestamps: false
        });
    },
    assoc: (sequelize) => {
        const { EventNote, Event_Tags } = sequelize.models;

        Tag.belongsToMany(EventNote, {
            as: "Events", //События с этим тегом
            through: Event_Tags,
            foreignKey: "Tag",
            otherKey: "EventId",
        });
        Tag.addScope("onlyEvents", function (path = "") {
            return {
                attributes: [],
                include: {
                    model: EventNote.scope({ method: ['preview', 'Events'] }),
                    as: "Events",
                    through: { attributes: [] }
                }
            }
        });
    }
}