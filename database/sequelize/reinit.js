"use strict";
module.exports = async (sequelize) => {
  //for only postgresql
  await sequelize.query("CREATE EXTENSION IF NOT EXISTS postgis;");
  await sequelize.query("CREATE EXTENSION IF NOT EXISTS cube;");
  await sequelize.query("CREATE EXTENSION IF NOT EXISTS earthdistance;");

  sequelize
    .sync({ force: true })
    .then(() => {
      const { Image } = sequelize.models;
      //Add raw default avatar image
      Image.create(
        {
          isDefault: true,
          path: process.env.DEFAULT_AVATAR,
        }, { raw: true }).catch(console.log);
    })
    .catch(console.log);
}