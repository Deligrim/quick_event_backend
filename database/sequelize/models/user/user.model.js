const { DataTypes, Model, Op } = require("sequelize");
const {
    ValidationError,
    ValidationErrorItem,
} = require("sequelize/lib/errors");
const jwt = require("jwt-simple");
const _ = require("lodash");

class User extends Model {
    static async createUser(creds, options) {
        // console.log(creds);
        const { Image } = sequelize.models;
        options = _.defaults(options, {
            transaction: null,
        });

        var transaction = options.transaction || (await sequelize.transaction());
        try {
            var user = await User.create(_.pick(creds, ["firstName", "lastName", "role"]), {
                transaction,
            });
            if (creds.avatar)
                await user.setAvatarFromBuffer(creds.avatar, transaction);
            else {
                await user.setAvatar(
                    await Image.findOne({
                        isDefault: true,
                        transaction
                    }),
                    { transaction });
            }
            return user;
        }
        catch (e) {
            if (!options || !options.transaction) await transaction.rollback();
            throw e;
        }
    }

    static async findByToken(token) {
        try {
            var decodedToken = jwt.decode(token, process.env.JWT_SECRET);
        } catch (e) {
            throw new ValidationError(null, [
                new ValidationErrorItem(
                    "Jwt decode error: " + e.message,
                    null,
                    "Authorization",
                    "JWT Token"
                ),
            ]);
        }
        return await this.findByPk(decodedToken.id, {
            attributes: ["id", "role", "firstName", "lastName"],
        });
    }
    generateAuthToken() {
        const token = jwt.encode(
            {
                id: this.id,
                iat: Date.now(),
                exp: new Date().getTime() + /*10 days*/ 10 * 24 * 60 * 60 * 1000,
            },
            process.env.JWT_SECRET
        )
            .toString();
        return token;
    }
    async setAvatarFromBuffer(imageBuffer, intransaction = null) {
        const { Image } = sequelize.models;
        var transaction = intransaction || (await sequelize.transaction());
        try {
            var avatar = await this.getAvatar({ transaction });
            //console.log(avatar);
            if (avatar && !avatar.isDefault) {
                await avatar.destroyImage({ transaction })
            }
            await this.setAvatar(
                await Image.createImage(imageBuffer, 'User' + this.id, "avatar", {
                    resizeArgs: {
                        width: 400,
                        height: 400,
                        fit: "cover",
                    },
                    saveOptions: { transaction },
                }),
                { transaction }
            );
            if (!intransaction) await transaction.commit();
        } catch (error) {
            if (!intransaction) await transaction.rollback();
            throw error;
        }
    }
    async deleteAvatar(intransaction = null) {
        const { Image } = sequelize.models;
        var transaction = intransaction || (await sequelize.transaction());
        try {

            var avatar = await this.getAvatar({ transaction });
            //console.log(avatar);
            if (avatar && !avatar.isDefault) {
                await avatar.destroyImage({ transaction })
            }
            await this.setAvatar(await Image.findOne({
                isDefault: true
            }), { transaction })

            if (!intransaction) await transaction.commit();
        } catch (error) {
            if (!intransaction) await transaction.rollback();
            throw error;
        }
    }
    async destroyUser(options) {
        var transaction = options && options.transaction ||
            (await sequelize.transaction());
        try {
            var avatar = await this.getAvatar({ transaction });
            if (avatar && !avatar.isDefault) {
                await avatar.destroyImage({ transaction })
            }

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
        User.init(
            {
                // Model attributes are defined here
                id: {
                    allowNull: false,
                    primaryKey: true,
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4
                },
                // username: {
                //     allowNull: false,
                //     type: DataTypes.STRING,
                //     unique: {
                //         msg: "This username is already exist",
                //     },
                //     validate: {
                //         // We require usernames to have length of at least 3, and
                //         // only use letters, numbers and underscores.
                //         is: {
                //             args: /^\w{3,25}$/,
                //             msg:
                //                 "Username must be at least 3 characters and only use letters, numbers and underscores",
                //         },
                //     },
                // },
                firstName: {
                    allowNull: false,
                    type: DataTypes.STRING,
                    validate: {
                        // We require usernames to have length of at least 3, and
                        // only use letters, numbers and underscores.
                        is: {
                            args: /^([a-zA-Z]|[А-Яа-яёË]){2,25}$/,
                            msg:
                                "First name must be at least 2 characters and only use cyrillic and latin letters",
                        },
                    },
                },
                lastName: {
                    allowNull: false,
                    type: DataTypes.STRING,
                    validate: {
                        // We require usernames to have length of at least 3, and
                        // only use letters, numbers and underscores.
                        is: {
                            args: /^([a-zA-Z]|[А-Яа-яёË]){2,25}$/,
                            msg:
                                "Last name must be at least 2 characters and only use cyrillic and latin letters",
                        },
                    },
                },
                role: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    defaultValue: "user",
                    validate: {
                        isIn: {
                            args: [["user", "organizator"]],
                            msg: "User role must be user or organizator",
                        },
                    },
                },
            },
            {
                // Other model options go here
                sequelize, // We need to pass the connection instance
                modelName: "User", // We need to choose the model 
            }
        );
        sequelize.define('Event_Organizator', {}, { timestamps: false });
    },
    assoc: (sequelize) => {
        const { MailAccount, Image, EventNote, Event_Organizator } = sequelize.models;

        User.belongsTo(Image, {
            as: "avatar",
            foreignKey: "avatarImageId",
        }); //FK in User

        User.hasOne(MailAccount, { onDelete: 'cascade' });

        //Add self-reference super many-to-many relationship accociacion
        User.belongsToMany(EventNote, {
            as: "OwnEvents", //События, над которыми юзер организатор
            through: Event_Organizator,
            foreignKey: "UserId",
            otherKey: "EventId",
        });

        User.addScope("preview",
            function (path = "") {
                return {
                    attributes: [
                        "id",
                        "firstName",
                        "lastName",
                        "role",
                        [sequelize.fn('REPLACE',
                            sequelize.col(`${path}avatar.path`),
                            process.env.HOST_MASK,
                            process.env.APP_HOST),
                            `avatarImg`]
                    ],
                    include: [{
                        model: Image,
                        as: "avatar",
                        attributes: []
                    }
                    ],
                }
            });
        User.addScope("clientView", {
            attributes: [
                "id",
                "firstName",
                "lastName",
                "role",
                [sequelize.fn('REPLACE',
                    sequelize.col('avatar.path'),
                    process.env.HOST_MASK,
                    process.env.APP_HOST),
                    'avatarImg']
            ],
            include: [{
                model: Image,
                as: "avatar",
                attributes: []
            }],
            group: 'avatar.id' //confirm the one-to-one relationship
        });
        //User.addScope("includeMarkers", {
        // include: [Marker.scope("clientView"), { model: Marker, as: "marker_binds" }]
        //});


    },
};
