"use strict";
const router = require('express').Router();
const { authToken, authAdmin } = require.main.require('./middleware/auth/auth.js');
const accountController = require.main.require('./controllers/user/mail.account.controller');
const userController = require.main.require('./controllers/user/user.controller');

const multer = require('multer');
const upload = multer();

router.post('/register/local', upload.single('avatar'), accountController.register); // Create user
router.post('/login/local', accountController.login); // Login user

router.get('/list', authAdmin, userController.getUsers);
router.post('/create', upload.single('avatar'), authAdmin, accountController.create);
router.delete('/:id', authAdmin, userController.removeUser);

router.use(authToken); // all routes below required authentication by token

//router.post(process.env.createChatRoom, chatController.createRoom);
//router.get(process.env.lastMessages, chatController.getLastGroupMessages);

router.get('/self', userController.getSelf);
router.post('/self/avatar', upload.single('avatar'), userController.setupAvatar);
router.delete('/self/avatar', userController.removeAvatar);
router.get('/:id', userController.getUserById);

module.exports = router;
