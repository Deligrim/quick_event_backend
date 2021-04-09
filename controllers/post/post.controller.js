const {
    ValidationError,
    ValidationErrorItem,
} = require("sequelize/lib/errors");
const _ = require("lodash");
const multer = require("multer");
const utils = require("../utils.controller");
const jsUtils = require("util");
const fsUtils = require("../../utils-modules/filesystem.utils");
const uuid = require('uuid');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./temp");
    },
    filename: (req, file, cb) => {
        cb(null, `${+new Date()}_${file.originalname}`);
    },
});
const upload = jsUtils.promisify(
    multer({ storage }).fields([
        { name: "images", maxCount: 10 },
        { name: "videos", maxCount: 1 },
    ])
);
function clearTempFiles(req) {
    _.keys(req.files).forEach((g) =>
        req.files[g].forEach((f) => fsUtils.deleteFileSync(f.path, false))
    );
}
async function createPost(req, res, next) {
    const { PostRecord, EventNote, User } = sequelize.models;
    try {
        await upload(req, res);
        console.log(req.body);
        let eventId = null;
        let bindEvent = null;
        let authorId = null;
        if (uuid.validate(req.body.eventId)) {
            bindEvent = await EventNote.findByPk(req.body.eventId);
            eventId = bindEvent.id;
            if (!bindEvent) {
                clearTempFiles(req);
                return res.status(404).json({ success: false, code: "notfound", msg: 'Event not found' });
            }
        }
        if (req.user.id) {
            if (!bindEvent) {
                clearTempFiles(req);
                return res.status(400).json({ success: false, code: "badrequest", msg: 'Event must be defined for organizators' });
            }
            let myself = await User.findByPk(req.user.id);
            if (!(await bindEvent.hasMembers(myself))) {
                {
                    clearTempFiles(req);
                    return res.status(403).json({ success: false, code: "forbidden", msg: 'Organizator not owning bind event!' });
                }
            }
            authorId = myself.id;
        }
        const payload = {
            text: req.body.text,
            images: req.files['images'],
            videos: req.files['videos'],
            eventId,
            authorId
        };
        const post = await PostRecord.createPostRecord(payload, {}, (e) => clearTempFiles(req));
        return res.status(200).json({
            success: true,
            newPostId: post.id
        });
    } catch (e) {
        clearTempFiles(req);
        next(e);
    }
}
async function getPostList(req, res, next) {
    const { PostRecord } = sequelize.models;
    try {
        const posts = await PostRecord.scope("clientView").findAll();
        return res.status(200).json({
            success: true,
            posts: posts || []
        });
    }
    catch (e) {
        next(e);
    }
}
async function getPostFromId(req, res, next) {
    const { PostRecord } = sequelize.models;
    try {
        if (!uuid.validate(req.params.id))
            return res.status(400).json({
                success: false,
                msg: "id param is required!"
            });
        const post = await PostRecord.scope("clientView").findByPk(req.params.id);
        if (post)
            return res.status(200).json({
                success: true,
                post
            });
        return res.status(404).json({
            success: false,
            msg: "Post not exist!"
        });
    }
    catch (e) {
        next(e);
    }
}
async function updatePostFromId(req, res, next) {
    const { PostRecord, EventNote, User } = sequelize.models;
    try {
        await upload(req, res);
        console.log(req.params.id);
        if (!uuid.validate(req.params.id)) {
            clearTempFiles(req);
            return res.status(400).json({
                success: false,
                msg: "postId param is required uuid!"
            });
        }
        const post = await PostRecord.findByPk(req.params.id);

        if (!post) {
            clearTempFiles(req);
            return res.status(404).json({ success: false, msg: "Post not exist!" });
        }

        //check organizator is owning bind to post event
        let eventId;
        let bindEvent = null;
        if (req.body.eventId != null) {
            bindEvent = await EventNote.findByPk(req.body.eventId);
            eventId = bindEvent.id;
            if (!bindEvent) {
                clearTempFiles(req);
                return res.status(404).json({ success: false, code: "notfound", msg: 'Event not found' });
            }

        }
        if (req.user.id) {
            if (post.eventId != null) {
                const organizator = await User.findByPk(req.user.id);
                const oldEvent = await EventNote.findByPk(post.eventId);
                if (!(await oldEvent.hasMembers(organizator))) {
                    clearTempFiles(req);
                    return res.status(403).json({ success: false, code: "forbidden", msg: `Organizator not owning bind event!` });
                }
                if (bindEvent && !(await bindEvent.hasMembers(organizator))) {
                    clearTempFiles(req);
                    return res.status(403).json({ success: false, code: "forbidden", msg: `Organizator not owning new bind event!` });
                }
            }
            else {
                clearTempFiles(req);
                return res.status(403).json({ success: false, code: "forbidden", msg: "Post is global. Access forbidden" });
            }
        }
        const payload = {
            id: post.id,
            text: req.body.text,
            images: req.files['images'],
            videos: req.files['videos'],
            eventId,
        };
        const updatedPost = await PostRecord.updatePostRecord(payload, {}, (e) => clearTempFiles(req));
        if (updatedPost)
            return res.status(200).json({
                success: true
            });
        return res.status(404).json({
            success: false,
            msg: "Post not exist!"
        });
    }
    catch (e) {
        clearTempFiles(req);
        next(e);
    }
}
async function deletePostFromId(req, res, next) {
    const { PostRecord, User, EventNote } = sequelize.models;
    try {
        if (!uuid.validate(req.params.id))
            return res.status(400).json({
                success: false,
                msg: "id param is required!"
            });

        const post = await PostRecord.findByPk(req.params.id);

        if (!post)
            return res.status(404).json({ success: false, msg: "Post not exist!" });
        //check organizator is owning bind to post event
        if (req.user.id) {
            if (post.eventId != null) {
                const organizator = await User.findByPk(req.user.id);
                const bindEvent = await EventNote.findByPk(post.eventId);
                if (!(await bindEvent.hasMembers(organizator))) {
                    return res.status(403).json({ success: false, code: "forbidden", msg: `Organizator not owning bind event!` });
                }
            }
            else {
                return res.status(403).json({ success: false, code: "forbidden", msg: "Post is global. Access forbidden" });
            }
        }
        await post.destroyPostRecord({});
        return res.status(200).json({
            success: true
        });
    }
    catch (e) {
        next(e);
    }
}

module.exports = {
    createPost,
    getPostFromId,
    getPostList,
    updatePostFromId,
    deletePostFromId,
};