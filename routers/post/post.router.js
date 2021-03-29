"use strict";
const router = require("express").Router();
//const authToken = require("../../middleware/auth/jwt.auth.js");

const {
    createPost,
    getPostFromId,
    getPostList,
    updatePostFromId,
    deletePostFromId,
} = require("../../controllers/post/post.controller");

const auth = require.main.require('./middleware/auth/auth.js');

router.post("/add/", auth.authToken, auth.organizatorGateway, createPost);
router.delete("/remove/:id", auth.authToken, auth.organizatorGateway, deletePostFromId);
router.put("/update/:id", auth.authToken, auth.organizatorGateway, updatePostFromId);

router.get("/", getPostList);
router.get("/:id", getPostFromId);

module.exports = router;
