"use strict";
const router = require("express").Router();
//const authToken = require("../../middleware/auth/jwt.auth.js");

const {
    createTag,
    getTagList,
    deleteTag,
    getEventListFromTag
} = require("../../controllers/tag/tag.controller");

const auth = require.main.require('./middleware/auth/auth.js');

router.post("/add/", auth.authAdmin, createTag);
router.delete("/remove/:id", auth.authAdmin, deleteTag);

router.get("/", getTagList);
router.get("/:id", getEventListFromTag);

module.exports = router;
