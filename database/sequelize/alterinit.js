"use strict";
module.exports = async (sequelize) => {
    //for only postgresql
    console.log("Try alter tables of existed database...");
    await sequelize.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    await sequelize.query("CREATE EXTENSION IF NOT EXISTS cube;");
    await sequelize.query("CREATE EXTENSION IF NOT EXISTS earthdistance;");
    await sequelize.sync({ force: false, alter: { drop: false } });
    console.log("Fetch users and events from db...");
    const { User, EventNote, Image } = sequelize.models;
    const users = await User.scope("clientView").findAll();
    const events = await EventNote.findAll({
        include: [{
            model: User,
            attributes: ['id'],
            as: "Members",
            through: { attributes: [] }
        }, {
            model: Image.scope("onlyPath"),
            attributes: ['path'],
            as: "Photos",
            through: { attributes: [], where: { index: 0 } }
        }]
    });
    console.log("Re-create firebase & firestore collections..")
    const deleteAllUsers = async (nextPageToken) => {
        let listUsersResult = await firebase.auth().listUsers(1000, nextPageToken);
        listUsersResult.users.forEach((userRecord) => {
            console.log('delete user: ', userRecord.uid);
        });
        await firebase.auth().deleteUsers(listUsersResult.users.map(x => x.uid));
        if (listUsersResult.pageToken) {
            await deleteAllUsers(listUsersResult.pageToken);
        }
    };
    // Start listing users from the beginning, 1000 at a time.
    await deleteAllUsers();
    for (let user of users) {
        console.log("Create user with id: " + user.id + "...");
        await firebase.auth().createUser({ uid: user.id });
        const firestoreUser = {
            avatarUrl: user.dataValues.avatarImg,
            firstName: user.firstName,
            lastName: user.lastName
        };
        await firebase.firestore().collection('users').doc(user.id).set(firestoreUser);
    }
    for (let event of events) {
        console.log("Create chat room with id: " + event.id + "...");
        const chatRoom = {
            imageUrl: event.Photos[0]?.path,
            name: event.title,
            type: "group",
            userIds: []
        };
        await firebase.firestore().collection('rooms').doc(event.id).set(chatRoom);
        if (event.Members.length > 0) {
            console.log("Set members to chat room with id: " + event.id + "...");
            const membersId = event.Members.map(x => x.id);
            const roomRef = firebase.firestore().collection('rooms').doc(event.id);
            await roomRef.update({
                userIds: membersId
            });
        }
    }
    console.log("Done!");
}