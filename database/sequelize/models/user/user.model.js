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
                        where: {
                            isDefault: true,
                        },
                        transaction
                    }),
                    { transaction });
            }
            await firebase.auth().createUser({ uid: user.id });
            const firestoreUser = {
                avatarUrl: (await user.getAvatar({ transaction })).path,
                firstName: user.firstName,
                lastName: user.lastName
            };
            await firebase.firestore().collection('users').doc(user.id).set(firestoreUser);
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
        return this.findByPk(decodedToken.id, {
            attributes: ["id", "role"],
        });
        //return decodedToken;
    }
    generateAuthToken() {
        return jwt.encode(
            {
                id: this.id,
                iat: Date.now(),
                exp: new Date().getTime() + /*10 days*/ 10 * 24 * 60 * 60 * 1000,
            },
            process.env.JWT_SECRET
        ).toString();
    }
    async generateFirebaseToken() {
        return firebase.auth().createCustomToken(this.id);
    }
    static async updateUser(payload, options) {
        options = _.defaults(options, {
            transaction: null
        });
        var transaction = options.transaction || (await sequelize.transaction());
        try {
            const user = await User.findByPk(payload.id, { transaction });
            if (!user)
                throw new ValidationError(null, [
                    new ValidationErrorItem(
                        "User not exist in database",
                        null,
                        "id",
                        null
                    ),
                ]);
            _.assign(user, _.pick(payload, ['firstName', 'lastName', 'role']));
            await user.save({ transaction });
            if (payload.avatar && payload.avatar.buffer) {
                console.log("update user avatar");
                await user.setAvatarFromBuffer(payload.avatar.buffer, transaction);
            }
            else {
                const firestoreUser = {
                    avatarUrl: (await user.getAvatar({ transaction })).path,
                    firstName: user.firstName,
                    lastName: user.lastName
                };
                await firebase.firestore().collection('users').doc(user.id).set(firestoreUser);
            }
            if (!options.transaction)
                transaction.commit().catch(() => {/*rollback already call*/ });

            return user;
        }
        catch (e) {
            if (!options.transaction) await transaction.rollback();
            throw e;
        }
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
            const firestoreUser = {
                avatarUrl: (await this.getAvatar({ transaction })).path,
                firstName: this.firstName,
                lastName: this.lastName
            };
            await firebase.firestore().collection('users').doc(this.id).set(firestoreUser);
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
                where: {
                    isDefault: true
                }
            }), { transaction })

            const firestoreUser = {
                avatarUrl: (await this.getAvatar({ transaction })).path,
                firstName: this.firstName,
                lastName: this.lastName
            };
            await firebase.firestore().collection('users').doc(this.id).set(firestoreUser);
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
            try {
                await firebase.auth().deleteUser(this.id);
                await firebase.firestore().collection('users').doc(this.id).delete();
            }
            catch (e) {

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
                id: {
                    allowNull: false,
                    primaryKey: true,
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4
                },
                firstName: {
                    allowNull: false,
                    type: DataTypes.STRING,
                    validate: {
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
                sequelize,
                modelName: "User",
            }
        );
        sequelize.define('Event_Members', {}, { timestamps: false });
    },
    assoc: (sequelize) => {
        const { MailAccount, Image, EventNote, Event_Members } = sequelize.models;

        User.belongsTo(Image, {
            as: "avatar",
            foreignKey: "avatarImageId",
        }); //FK in User

        User.hasOne(MailAccount, { onDelete: 'cascade' });

        //Add many-to-many relationship accociacion
        User.belongsToMany(EventNote, {
            as: "OwnEvents", //События, в которых юзер организатор или участник (зависит от роли)
            through: Event_Members,
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
        });
        //User.addScope("includeMarkers", {
        // include: [Marker.scope("clientView"), { model: Marker, as: "marker_binds" }]
        //});


    },
};
