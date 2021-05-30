var admin = require('firebase-admin');

var serviceAccount = require("./quick-event-firebase-adminsdk-og7kp-daa7de2f71.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://quick-event-default-rtdb.firebaseio.com"
});

module.exports = admin;