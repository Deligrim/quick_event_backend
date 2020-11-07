const { Sequelize } = require("sequelize");
//const { applyExtraSetup } = require('./extra-setup');

// Option 2: Passing parameters separately (other dialects)
const sequelize = new Sequelize(
  process.env.MYSQL_DB,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    dialect: process.env.MYSQL_DIALECT,
  }
);

const modelDefiners = [

  require("./models/media/image.model"),

  require("./models/event/event.model"),
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

module.exports = sequelize;
