"use strict";
module.exports = (sequelize) =>
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
