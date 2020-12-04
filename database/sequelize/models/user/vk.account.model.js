const { DataTypes, Model } = require('sequelize');
const { ValidationError, ValidationErrorItem } = require('sequelize/lib/errors');
const _ = require("lodash");

class VKAccount extends Model {
    static async findByVKId(vkId, options) {
        options = _.defaults(options, {
            transaction: null,
        });
        const account = await this.findOne({
            where: {
                vkId
            },
            include: 'User',
            transaction: options.transaction
        })
        return account;
    }

}

module.exports = {
    init: (sequelize) => {
        VKAccount.init({
            // Model attributes are defined here
            id: {
                allowNull: false,
                primaryKey: true,
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4
            },
            vkId: {
                allowNull: false,
                type: DataTypes.INTEGER,
                unique: true
            }
        }, {
            sequelize,
            modelName: 'VKAccount',
            // timestamps: false
        });
    },
    assoc: (sequelize) => {
        const { User } = sequelize.models;

        VKAccount.belongsTo(User); // FK in VKAccount
    }
}