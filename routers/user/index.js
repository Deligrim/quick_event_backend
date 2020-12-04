"use strict";
const router = require('express').Router();
const { authToken, authAdmin } = require.main.require('./middleware/auth/auth.js');
const mailAccountController = require.main.require('./controllers/user/mail.account.controller');
const vkAccountController = require.main.require('./controllers/user/vk.account.controller');
const userController = require.main.require('./controllers/user/user.controller');

const multer = require('multer');
const upload = multer();

router.post('/auth/vk', vkAccountController.authentication); //Auth via vk
router.post('/register/local', upload.single('avatar'), mailAccountController.register); // Create user
router.post('/auth/local', mailAccountController.login); // Login user

router.get('/from/:id', userController.getUserById);

router.get('/list/all', authAdmin, userController.getUsers);
router.post('/create', authAdmin, upload.single('avatar'), mailAccountController.create);
router.delete('/:id', authAdmin, userController.removeUser);

router.use(authToken); // all routes below required authentication by token

//router.post(process.env.createChatRoom, chatController.createRoom);
//router.get(process.env.lastMessages, chatController.getLastGroupMessages);

router.get('/self', userController.getSelf);
router.post('/self/avatar', upload.single('avatar'), userController.setupAvatar);
router.delete('/self/avatar', userController.removeAvatar);


module.exports = router;
