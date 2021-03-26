const _ = require("lodash");
const {
    ValidationError,
    ValidationErrorItem,
} = require("sequelize/lib/errors");

async function createTag(req, res, next) {
    const { Tag } = sequelize.models;
    try {
        console.log(req.body);
        const tag = await Tag.createTag(req.body.title, {});
        return res.status(200).json({
            success: true,
            newTag: tag.title
        });
    } catch (e) {
        //console.log(e);
        next(e);
    }
}
async function getTagList(req, res, next) {
    const { Tag } = sequelize.models;
    try {
        const tags = await Tag.findAll();
        return res.status(200).json({
            success: true,
            tags: tags.map(x => x.title) || []
        });
    }
    catch (e) {
        next(e);
    }
}

async function deleteTag(req, res, next) {
    const { Tag } = sequelize.models;
    try {
        if (!req.params.id)
            return res.status(400).json({
                success: false,
                msg: "tag param is required!"
            });

        const tag = await Tag.findByPk(req.params.id);
        if (tag) {
            await tag.destroyTag();
            return res.status(200).json({
                success: true
            });
        }
        return res.status(404).json({
            success: false,
            msg: "Tag not exist!"
        });
    }
    catch (e) {
        next(e);
    }
}
async function getEventListFromTag(req, res, next) {
    const { Tag } = sequelize.models;
    try {
        if (!req.params.id)
            return res.status(400).json({
                success: false,
                msg: "tag param is required!"
            });
        const tag = await Tag.scope('onlyEvents').findByPk(req.params.id);
        if (!tag)
            return res.status(404).json({
                success: false,
                msg: "Tag not exist!"
            });
        // const events = await tag.getEvents({ scope: "preview" });

        return res.status(200).json({
            success: true,
            events: tag.Events || []
        });
    }
    catch (e) {
        next(e);
    }
}
module.exports = {
    createTag,
    getTagList,
    deleteTag,
    getEventListFromTag
};