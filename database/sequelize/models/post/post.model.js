const { DataTypes, Model } = require('sequelize');
const { ValidationError, ValidationErrorItem } = require('sequelize/lib/errors');
const _ = require("lodash");
class PostRecord extends Model {

    static async createPostRecord(payload, options, longJobCallback) {
        const { Image, Video } = sequelize.models;
        var transaction = options.transaction || (await sequelize.transaction());
        try {
            console.log(payload);

            const post = await PostRecord.create(_.pick(payload, ['text', 'authorId', 'eventId']), { transaction });

            if (payload.images && payload.images.length > 0) {
                for (let i = 0; i < payload.images.length; i++) {
                    const image = await Image.createImage(
                        payload.images[i].path,
                        post.id,
                        'picture' + i,
                        {
                            resizeArgs: {
                                withoutEnlargement: true,
                                height: 1024,
                                width: 1024,
                            },
                            saveOptions: { transaction }
                        });
                    await post.addImage(image, { transaction });
                }
            }
            if (payload.videos && payload.videos.length === 1) {
                const uploadedVideo = await Video.createVideo(
                    payload.videos[0].path,
                    { group: `postRecord${payload.eventId}`, name: `video-${0}` },
                    (error, decodedVideo) => {
                        longJobCallback(error);
                    }
                );
                await post.addVideo(uploadedVideo, { transaction });
            }
            if (!options.transaction) transaction.commit().catch(() => {/*rollback already call*/ });
            return post;
        }
        catch (e) {
            if (!options.transaction) await transaction.rollback();
            throw e;
        }
    }
    static async updatePostRecord(payload, options, longJobCallback) {
        const { Image, Video } = sequelize.models;
        var transaction = options.transaction || (await sequelize.transaction());
        try {
            const post = await PostRecord.findByPk(payload.id, { transaction });
            if (!post) {
                throw new ValidationError(null, [new ValidationErrorItem("Post not exist in database", null, "id", null)]);
            }
            payload = _.defaults(payload,
                {
                    text: post.text,
                    eventId: post.eventId
                });
            _.assign(post, _.pick(payload, ['text', 'eventId']));
            await post.save({ transaction });
            if (payload.removeImageUrls && payload.removeImageUrls.length > 0) {
                const oldImages = await post.getImages({ transaction });
                for (let deletedUrl of payload.removeImageUrls) {
                    for (let image of oldImages) {
                        if (image.path == deletedUrl)
                            await image.destroyImage({ transaction });
                    }
                }
            }
            if (payload.images && payload.images.length > 0) {
                const oldImages = await post.getImages({ transaction });
                for (let oldImage of oldImages) {
                    await oldImage.destroyImage({ transaction });
                }
                for (let i = 0; i < payload.images.length; i++) {
                    const image = await Image.createImage(
                        payload.images[i].path,
                        post.id,
                        'picture' + i,
                        {
                            resizeArgs: {
                                withoutEnlargement: true,
                                height: 1024,
                                width: 1024,
                            },
                            saveOptions: { transaction }
                        });
                    await post.addImage(image, { transaction });
                }
            }
            if (payload.newImages && payload.newImages.length > 0) {
                for (let i = 0; i < payload.newImages.length; i++) {
                    const image = await Image.createImage(
                        payload.newImages[i].path,
                        post.id,
                        'picture' + i,
                        {
                            resizeArgs: {
                                withoutEnlargement: true,
                                height: 1024,
                                width: 1024,
                            },
                            saveOptions: { transaction }
                        });
                    await post.addImage(image, { transaction });
                }
            }

            if (payload.removeVideoUrls && payload.removeVideoUrls.length > 0) {
                const videos = await post.getVideos({ transaction });
                for (let deletedUrl of payload.removeVideoUrls) {
                    for (let video of videos) {
                        if (video.path == deletedUrl)
                            await video.destroyVideo({ transaction });
                    }
                }
            }
            if (payload.videos) {
                const videos = await post.getVideos({ transaction });
                for (let video of videos) {
                    await video.destroyVideo({ transaction });
                }
                if (payload.videos.length === 1) {
                    const uploadedVideo = await Video.createVideo(
                        payload.videos[0].path,
                        { group: `postRecord${payload.eventId}`, name: `video-${0}` },
                        (error, decodedVideo) => {
                            longJobCallback(error);
                        }
                    );
                    await post.addVideo(uploadedVideo, { transaction });
                }
            }
            if (payload.newVideos && payload.newVideos.length === 1) {
                const uploadedVideo = await Video.createVideo(
                    payload.newVideos[0].path,
                    { group: `postRecord${payload.eventId}`, name: `video-${0}` },
                    (error, decodedVideo) => {
                        longJobCallback(error);
                    }
                );
                await post.addVideo(uploadedVideo, { transaction });
            }

            if (!options.transaction)
                transaction.commit().catch(() => {/*rollback already call*/ });
            return post;
        }
        catch (e) {
            if (!options.transaction) await transaction.rollback();
            throw e;
        }
    }
    async destroyPostRecord(options) {
        var transaction = options && options.transaction || (await sequelize.transaction());
        try {
            const images = await this.getImages({ transaction });
            for (let image of images) {
                await image.destroyImage({ transaction });
            }
            const videos = await this.getVideos({ transaction });
            for (let video of videos) {
                await video.destroyVideo({ transaction });
            }
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
        if (attributes.Images) {
            attributes.Images = attributes.Images.map((v => v.path));
        }
        const scope = this.constructor._scopeNames;
        if (scope.includes("clientView") || scope.includes("withoutEvent")) {
            attributes.Content = {
                Text: attributes.text,
                Images: attributes.Images,
                Videos: attributes.Videos
            }
            delete attributes.text;
            delete attributes.Images;
            delete attributes.Videos;
        }
        return attributes
    }
}

module.exports = {
    init: (sequelize) => {
        PostRecord.init({
            id: {
                allowNull: false,
                primaryKey: true,
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4
            },
            text: {
                allowNull: false,
                type: DataTypes.STRING,
                validate: {
                    len: [0, 1400]
                }
            },
        }, {
            sequelize,
            modelName: 'PostRecord',
            timestamps: true
        });
        sequelize.define('PostRecord_Images', {}, { timestamps: false });
        sequelize.define('PostRecord_Videos', {}, { timestamps: false });
    },
    assoc: (sequelize) => {
        const { User, EventNote, Image, Video, PostRecord_Images, PostRecord_Videos } = sequelize.models;
        PostRecord.belongsTo(EventNote, {
            as: 'Event',
            foreignKey: 'eventId'
        });
        PostRecord.belongsTo(User, {
            as: 'Author',
            foreignKey: 'authorId'
        });
        PostRecord.belongsToMany(Image, {
            as: "Images", //Картинки события
            through: PostRecord_Images,
            foreignKey: "PostRecordId",
            otherKey: "ImageId",
        });
        PostRecord.belongsToMany(Video, {
            as: "Videos", //Видео события
            through: PostRecord_Videos,
            foreignKey: "PostRecordId",
            otherKey: "VideoId",
        });
        PostRecord.addScope("clientView", {
            attributes: ['id', 'text', 'createdAt'],
            include: [
                {
                    model: EventNote.scope({ method: ['micro', 'Event'] }),
                    as: "Event",
                },
                {
                    model: Image.scope("onlyPath"),
                    attributes: ['path'],
                    as: "Images",
                    through: { attributes: [] }
                },
                {
                    model: Video.scope("clientView"),
                    as: "Videos",
                    through: { attributes: [] }
                },
                {
                    model: User.scope({ method: ['preview', 'Author.'] }),
                    as: "Author",
                },
            ],
            order: [['createdAt', 'DESC']]
        });
        PostRecord.addScope("withoutEvent", {
            attributes: ['id', 'text', 'createdAt'],
            include: [
                {
                    model: Image.scope("onlyPath"),
                    attributes: ['path'],
                    as: "Images",
                    through: { attributes: [] }
                },
                {
                    model: Video.scope("clientView"),
                    as: "Videos",
                    through: { attributes: [] }
                },
                {
                    model: User.scope({ method: ['preview', 'Author.'] }),
                    as: "Author",
                },
            ],
            order: [['createdAt', 'DESC']]
        });
    }
}