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

router.get('/getInfo/:id', userController.getUserById);
router.get('/getInfo/:id/events', userController.getUsersEvents);

router.get('/list', authAdmin, userController.getUsers);
router.post('/create', authAdmin, upload.single('avatar'), mailAccountController.create);


router.post('/update/:id', authAdmin, userController.updateUserInfo);
router.delete('/:id', authAdmin, userController.removeUser);

//router.use(authToken); // all routes below required authentication by token

//router.post(process.env.createChatRoom, chatController.createRoom);
//router.get(process.env.lastMessages, chatController.getLastGroupMessages);
router.get('/self/events', authToken, userController.getMyEvents);



router.get('/self', authToken, userController.getSelf);
router.post('/self/update', authToken, userController.updateUserInfo);
router.post('/self/avatar', authToken, upload.single('avatar'), userController.setupAvatar);
router.delete('/self/avatar', authToken, userController.removeAvatar);


module.exports = router;
