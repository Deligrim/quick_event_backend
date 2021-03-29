const { DataTypes, Model } = require("sequelize");
const {
    ValidationError,
    ValidationErrorItem,
} = require("sequelize/lib/errors");

const envUtils = require("../../../../utils-modules/environment.utils");
const fsUtils = require("../../../../utils-modules/filesystem.utils");
const {
    videoQueue,
} = require("../../../../services/videocoding/transcode.queue");
const {
    validateVideo,
} = require("../../../../services/videocoding/validator");
const md5 = require("md5");
const _ = require("lodash");
const moment = require("moment");

class Video extends Model {
    //to do: add full support transaction in fs level

    static async createVideo(tempInputPath, options, done) {
        const { Image } = sequelize.models;
        options = _.defaults(options, {
            /* New path option */
            name: "video",
            group: "default",
            /* Sequelize */
            transaction: null,
            /* Validation */
            maxDur: 60,
            maxAspect: 2.5,
            /* Transcode */
            resolution: 720,
            bitrate: 1300,
            fps: 25,
            format: "mp4",
            rotation: 0,
            withThumb: true,
            thumbnailSize: '512x?'
        });
        const info = await validateVideo(
            tempInputPath,
            _.pick(options, ["maxDur", "maxAspect"])
        );
        let md5group = md5(options.group);
        md5group = md5group.slice(0, md5group.length / 2);
        const namePath = `${options.name}_${moment
            .utc()
            .format(`DDHHmmss[.${options.format}]`)}`;
        const outLocalPath = `${process.env.INTERNAL_PUBLIC_PATH}${process.env.VIDEOS_PATH
            }/${md5group}/${namePath}`;
        await fsUtils.createDir(outLocalPath);
        let video = Video.build({ rotation: options.rotation });
        video.setDataValue("path", envUtils.localToEncoded(outLocalPath));
        video = await video.save({ transaction: options.transaction });

        const transJob = await videoQueue.add({
            path: tempInputPath,
            outPath: outLocalPath,
            info,
            thumbnail: { isGenerate: options.withThumb, size: options.thumbnailSize },
            options: _.pick(options, [
                "resolution",
                "bitrate",
                "format",
                "rotation",
                "fps",
            ]),
        });
        videoQueue
            .on("active", function (job, jobPromise) {
                if (transJob.id != job.id) return;
                // A job has started. You can use `jobPromise.cancel()`` to abort it.
                console.log(`Job#${job.id} was start!`);
            })
            .on("progress", function (job, progress) {
                if (transJob.id != job.id) return;
                // A job's progress was updated!
                console.log(`Job#${job.id} is complete on ${Math.round(progress)}%`);
            })
            .on("completed", async function (job, result) {
                if (transJob.id != job.id) return;
                // A job successfully completed with a `result`.
                //console.log(`Job#${job.id} is completed !`);
                //console.log(result);
                try {
                    if (options.withThumb) {
                        var thumb = await Image.createImage(result.tpath, options.group, options.name, {
                            saveOptions: { transaction: options.transaction },
                        });
                        await fsUtils.deleteFile(result.tpath, false);
                        await video.setThumbnail(thumb, {
                            transaction: options.transaction,
                        });
                    }
                    video.status = "done";
                    video = await video.save({
                        fields: ["status"],
                        transaction: options.transaction,
                    });
                    if (done) done(null, video);
                } catch (e) {
                    fsUtils.deleteFile(outLocalPath, true, 'videos');
                    if (done) done(e);
                }
            })
            .on("error", async function (error) {
                // An error occured.
                try {
                    console.log(`Queue general error: ${error}`);
                    video.status = "error";
                    video = await video.save({
                        fields: ["status"],
                        transaction: options.transaction,
                    });
                    if (done) done(err, video);
                    fsUtils.deleteFile(outLocalPath, true, 'videos');
                } catch (e) {
                    if (done) done(e);
                }
            })
            .on("failed", async function (job, err) {
                if (transJob.id != job.id) return;
                try {
                    // A job failed with reason `err`!
                    fsUtils.deleteFileSync(outLocalPath, true, 'videos');
                    //console.log(`Job#${job.id} error: ${err}`);
                    video.status = "error";
                    video = await video.save({
                        fields: ["status"],
                        transaction: options.transaction,
                    });

                    if (done) done(err, video);

                } catch (e) {
                    if (done) done(e);
                }
            });

        return video;
    }
    //to do: add full support transaction in fs level
    async destroyVideo(options) {
        var transaction = options && options.transaction || (await sequelize.transaction());
        try {
            var vidEnc = this.getDataValue("path");
            console.log(vidEnc);
            //console.log(imgEnc + " ->\n\t" + value);
            if (vidEnc) {
                //console.log("Try deleting unnecessary files: " + imgEnc);   
                const delFile = () =>
                    fsUtils.deleteFile(envUtils.globalToLocal(vidEnc), true, 'videos');
                if (transaction)
                    transaction.afterCommit(() => {
                        delFile().catch((e) => console.log("File not exist", e));
                    });
                else await delFile();
            } else {
                console.log("Video null path", e);
            }
            //console.log(this);
            const thumb = await this.getThumbnail({ transaction });
            if (thumb) await thumb.destroyImage({ transaction, untilDir: 'videos' });
            else console.log('thumb not exist');
            await this.destroy({ transaction });
            if (!options || !options.transaction) await transaction.commit();
        } catch (e) {
            console.log("File not exist in fs!", e);
            if (this.status == 'error') return;
            if (!options || !options.transaction) await transaction.rollback();
            throw e;
        }
    }
    toJSON() {
        let attributes = Object.assign({}, this.get())
        // attributes.globalPath = this.globalPath; //manual binding virtual field :(
        // delete attributes.path;
        //remap avatar for clientView scope
        attributes.thumbnailUrl = attributes.thumbnail.path;
        delete attributes.thumbnail;

        return attributes
    }
}

module.exports = {
    init: (sequelize) => {
        Video.init(
            {
                id: {
                    allowNull: false,
                    primaryKey: true,
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4
                },
                path: {
                    type: DataTypes.LINK,
                    allowNull: false,

                },
                status: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    defaultValue: "pending",
                    validate: {
                        isIn: {
                            args: [["done", "pending", "error"]],
                            msg: "Video status must be done, pending or error",
                        },
                    },
                }
            },
            {
                sequelize,
                modelName: "Video",
                timestamps: true,
                updatedAt: false,
            }
        );
    },
    assoc: (sequelize) => {
        const { Image } = sequelize.models;

        Video.belongsTo(Image, {
            as: "thumbnail",
            foreignKey: "thumbId",
            //onDelete: 'RESTRICT'
        }); //FK in Video
        Video.addScope("clientView", {
            attributes: ["id", "path", "status"],
            include: {
                model: Image,
                as: "thumbnail",
                //attributes: { include:['globalPath'] }
            },
        });
        Video.addScope("done", {
            where: {
                status: 'done'
            }
        });
    },
};