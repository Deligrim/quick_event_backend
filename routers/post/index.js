"use strict";
const router = require("express").Router();

const {
    createPost,
    getPostFromId,
    getPostList,
    updatePostFromId,
    deletePostFromId,
    unlikePost,
    likePost
} = require("../../controllers/post/post.controller");

const auth = require.main.require('./middleware/auth/auth.js');

router.post("/add/", auth.authAdmin, createPost);
router.put("/update/:id", auth.authAdmin, updatePostFromId);
router.delete("/remove/:id", auth.authAdmin, deletePostFromId);

router.post("/", auth.authToken, auth.organizatorGateway, createPost);
router.delete("/:id", auth.authToken, auth.organizatorGateway, deletePostFromId);
router.put("/:id", auth.authToken, auth.organizatorGateway, updatePostFromId);

router.get("/", auth.nonStrictAuthToken, getPostList);
router.get("/:id", auth.nonStrictAuthToken, getPostFromId);

router.put("/:id/like", auth.authToken, likePost);
router.put("/:id/unlike", auth.authToken, unlikePost);

module.exports = router;
