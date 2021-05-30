const { Sequelize } = require("sequelize");
//const { applyExtraSetup } = require('./extra-setup');
require("./types");
// Option 2: Passing parameters separately (other dialects)
const sequelize = new Sequelize(
  process.env.DBMS_DB,
  process.env.DBMS_USER,
  process.env.DBMS_PASSWORD,
  {
    host: process.env.DBMS_HOST,
    dialect: process.env.DBMS_DIALECT,

  }
);

const modelDefiners = [

  require("./models/media/image.model"),
  require("./models/media/video.model"),

  require("./models/user/user.model"),
  require("./models/user/mail.account.model"),
  require("./models/user/vk.account.model"),

  require("./models/event/event.city.model"),
  require("./models/event/tag.model"),
  require("./models/event/event.schedule.note.model"),

  require("./models/event/event.model"),
  require("./models/post/post.model"),
];

// We define all models according to their files.
for (const model of modelDefiners) {
  model.init(sequelize);
}
// We execute any extra setup after the models are defined, such as adding associations.
for (const model of modelDefiners) {
  model.assoc(sequelize);
}
if (process.argv.find((a) => a == "reinit")) require("./reinit")(sequelize); //force reinstance table and fill init data
else if (process.argv.find((a) => a == "alter")) require("./alterinit")(sequelize); //smooth alter tables

module.exports = sequelize;
