const Queue = require("bull");
const videoQueue = new Queue("video quevent transcoding", "redis://127.0.0.1:6379");
var ffmpeg = require("fluent-ffmpeg");

videoQueue.process((job, done) => {

    const { path, outPath, info, thumbnail, options } = job.data;
    const videoInfo = info.streams && info.streams.find((s) => s.codec_type == "video");

    var command = ffmpeg(path).audioBitrate(128);
    if (info.format.bit_rate / 1000 > options.bitrate) {
        command = command.videoBitrate(options.bitrate)
    }
    if (videoInfo.nb_frames / videoInfo.duration > options.fps) {
        command = command.fps(options.fps)
    }
    //command.addOption('-threads','1');
    const aspect = videoInfo.width / videoInfo.height;
    //legacy behavior
    // const orint = options.rotation == 90 ? 2 : 1;
    // let param = "transpose=" + orint;
    // if (options.rotation == 180) param = param + "," + param;

    if (aspect < 1) {
        if (videoInfo.width > options.resolution)
            command = command.size(`${options.resolution}x?`);
    } else if (videoInfo.height > options.resolution) {
        command = command.size(`?x${options.resolution}`);
    }

    // if (options.rotation != 0)
    //     command = command.videoFilters(param);
    command
        .toFormat(options.format)
        .on("start", (commandLine) => {
            console.log(`Spawned FFmpeg with command: ${commandLine}`);
        })
        .on("progress", (progress) => {
            //console.log(`Spawned FFmpeg with command: ${commandLine}`);
            job.progress(progress.percent);
            //test error throw
            // if(progress.percent > 75){
            //   command.kill();
            //   done(new Error('Error transcoding!'));
            // }
        })
        .on("error", (err, stdout, stderr) => {
            //console.log(err, stdout, stderr);
            done(new Error('Error transcoding'));
        })
        .on("end", (stdout, stderr) => {
            //console.log(stdout, stderr);
            //spawning preview also
            if (!thumbnail || !thumbnail.isGenerate) done();
            else {
                const { groups: { dir, name } } =
                    /(?<dir>.+?)\/?(?<file>(?<name>\w+)\.(?<ext>\w+))?$/.exec(outPath);
                //console.log(groups);
                ffmpeg(outPath).thumbnail({ timestamps: [1], folder: dir, filename: `${name}.png`, size: thumbnail.size })
                    .on('end', function () {
                        console.log('Thumbnail taken');
                        done(null, { tpath: `${dir}/${name}.png` });
                    })
                    .on("error", (err, stdoutt, stderrr) => {
                        console.log(err, stdoutt, stderrr);

                        done(new Error('Error get thumbnail'));
                    })
            }
        })
        .saveToFile(outPath);

});
module.exports = { videoQueue };
