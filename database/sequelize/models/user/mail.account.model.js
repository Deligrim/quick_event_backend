const { DataTypes, Model } = require('sequelize');
const { ValidationError, ValidationErrorItem } = require('sequelize/lib/errors');

const bcrypt = require('bcryptjs');

class MailAccount extends Model {
    static async findByCredentials(credentials) {
        const account = await this.findOne({
            where: {
                email: credentials.email
            },
            include: 'User'
        })
        if (!account) return null;
        //console.log(account.toJSON());
        if (bcrypt.compareSync(credentials.password, account.password)) return account;
        return null;
    }

}

module.exports = {
    init: (sequelize) => {
        MailAccount.init({
            // Model attributes are defined here
            id: {
                allowNull: false,
                primaryKey: true,
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4
            },
            email: {
                allowNull: false,
                type: DataTypes.STRING(64),
                unique: {
                    msg: 'This email is already exist'
                },
                validate: {
                    isEmail: { msg: "Field must be a valid email" },
                    len: [5, 64]
                }
            },
            password: {
                allowNull: false,
                type: DataTypes.STRING,
                set(value) {
                    if (value.length < 6) throw new ValidationError(null, [
                        new ValidationErrorItem('Password must be at least 6 characters', 'Validation error', 'password', ''.padStart(value.length, '*'))
                    ])
                    const salt = bcrypt.genSaltSync(10);
                    this.setDataValue('password', bcrypt.hashSync(value, salt));
                }
            }
        }, {
            sequelize,
            modelName: 'MailAccount'
        });
    },
    assoc: (sequelize) => {
        const { User } = sequelize.models;

        MailAccount.belongsTo(User); // FK in MailAccount
    }
}