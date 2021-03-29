const util = require("util");
const ffmpeg = require("fluent-ffmpeg");
const {
    ValidationError,
    ValidationErrorItem,
} = require("sequelize/lib/errors");
const ffprobe = util.promisify(ffmpeg.ffprobe);
const _ = require("lodash");

async function validateVideo(videoPath, options) {
    options = _.defaults(options, {
        maxDur: 16,
        maxAspect: 2.5,
    });

    try {
        var info = await ffprobe(videoPath);
        //console.log(info);
    } catch (e) {
        console.log("Get video info error:");
        console.log(e);
        throw new ValidationError(null, [
            new ValidationErrorItem(
                "Input file is not a supported video format",
                "Validation error",
                "video",
                ""
            ),
        ]);
    }
    const videoInfo =
        info && info.streams && info.streams.find((s) => s.codec_type == "video");

    const aspect = videoInfo && videoInfo.width / videoInfo.height;
    // console.log(`aspect: ${aspect}`);
    const normAspect = aspect < 1 ? 1 / aspect : aspect;
    // console.log(`normAspect: ${normAspect}`);
    // console.log(`duration: ${info.format.duration}`);
    // console.log(!info);
    // console.log(info.format.duration > options.maxDur);
    // console.log(!videoInfo);
    // console.log(normAspect> options.maxAspect);
    if (
        !info ||
        info.format.duration < 1 ||
        info.format.duration > options.maxDur ||
        !videoInfo ||
        normAspect > options.maxAspect
    ) {
        throw new ValidationError(null, [
            new ValidationErrorItem(
                "Input video failure validating",
                "Validation error",
                "video",
                ""
            ),
        ]);
    }
    return info;
}
module.exports = { validateVideo };
