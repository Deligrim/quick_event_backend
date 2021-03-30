"use strict";
const router = require("express").Router();

const {
    createPost,
    getPostFromId,
    getPostList,
    updatePostFromId,
    deletePostFromId,
} = require("../../controllers/post/post.controller");

const auth = require.main.require('./middleware/auth/auth.js');

router.post("/add/", auth.authAdmin, createPost);
router.put("/update/:id", auth.authAdmin, updatePostFromId);
router.delete("/remove/:id", auth.authAdmin, deletePostFromId);

router.post("/", auth.authToken, auth.organizatorGateway, createPost);
router.delete("/:id", auth.authToken, auth.organizatorGateway, deletePostFromId);
router.put("/:id", auth.authToken, auth.organizatorGateway, updatePostFromId);

router.get("/", getPostList);
router.get("/:id", getPostFromId);

module.exports = router;
