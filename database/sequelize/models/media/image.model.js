const { DataTypes, Model } = require("sequelize");
const {
  ValidationError,
  ValidationErrorItem,
} = require("sequelize/lib/errors");
const envUtils = require.main.require("./utils-modules/environment.utils");
const fsUtils = require.main.require("./utils-modules/filesystem.utils");
const sharp = require("sharp");
const md5 = require("md5");
const _ = require("lodash");
const moment = require("moment");

class Image extends Model {
  static async createImageFromPath(path, options) {
    try {
      options = _.defaults(options, {
        isDefault: false,
        saveOptions: {},
      });
      const image = Image.build({ isDefault: options.isDefault });
      image.setDataValue("path", envUtils.localToEncoded(path));
      await image.save(options.saveOptions);
      return image;
    } catch (e) {
      console.log("createImage error: ");
      console.log(e);
      throw new ValidationError(null, [
        new ValidationErrorItem(e.message, "Validation error", "image", ""),
      ]);
    }
  }
  static async createImage(img, group, name, options) {
    //img - string|buffer
    options = _.defaults(options, {
      isDefault: false,
      overrideNamePath: null,
      jpegOptions: { quality: 80 },
      resizeArgs: {
        width: 512,
        height: 512,
        fit: "cover",
      },
      saveOptions: {},
    });
    const tr = options.saveOptions.transaction;

    const namePath = options.overrideNamePath != null ? options.overrideNamePath : `${name}_${moment.utc().format("x[.jpg]")}`;
    let md5group = md5(group);
    md5group = md5group.slice(0, md5group.length / 2);
    const fullLocalPath = `${process.env.INTERNAL_PUBLIC_PATH}${process.env.IMAGES_PATH}/${md5group}/${namePath}`;
    const fullTempLocalPath = `${process.env.INTERNAL_PUBLIC_PATH}${process.env.IMAGES_PATH}/${md5group}_temp/${namePath}`;

    try {
      await fsUtils.createDir(tr ? fullTempLocalPath : fullLocalPath);
      await sharp(img)
        //.limitInputPixels(true)
        .resize(options.resizeArgs)
        .jpeg(options.jpegOptions)
        .toFile(tr ? fullTempLocalPath : fullLocalPath);
      if (tr) {
        tr.afterCommit(() => {
          console.log(`Move`);
          fsUtils
            .createDir(fullLocalPath)
            .then(() => {
              fsUtils.move(fullTempLocalPath, fullLocalPath);
              fsUtils.deleteFileSync(fullTempLocalPath, true);
            });
        });
        setTimeout(function () {
          try {
            fsUtils.deleteFileSync(fullTempLocalPath, true);
            //console.log(`Temp file removed: ${fullTempLocalPath}`);
          } catch (e) {
            /* temp file was moved success */
          }
        }, 100 * 1000); //remove temp file after transaction commit timeout
      }
      const image = Image.build({ isDefault: options.isDefault });
      image.setDataValue("path", envUtils.localToEncoded(fullLocalPath));
      await image.save(options.saveOptions);
      return image;
    } catch (e) {
      console.log("createImage error: ");
      console.log(e);
      throw new ValidationError(null, [
        new ValidationErrorItem(e.message, "Validation error", "image", ""),
      ]);
    }
  }

  async destroyImage(options) {
    try {
      var imgEnc = this.getDataValue("path");
      //console.log(imgEnc + " ->\n\t" + value);
      if (imgEnc && !this.isDefault) {
        //console.log("Try deleting unnecessary files: " + imgEnc);
        await this.destroy(options);
        const delFile = () =>
          fsUtils.deleteFile(
            envUtils.globalToLocal(imgEnc),
            true,
            options && options.untilDir
          );
        if (options && options.transaction)
          options.transaction.afterCommit(() => {
            delFile().catch((e) => console.log("File not exist", e));
          });
        else await delFile();
      } else {
        console.log("Image is default or null path", e);
      }
    } catch (e) {
      console.log("File not exist in db!", e);
    }
  }
  // toJSON() {
  //   let attributes = Object.assign({}, this.get())
  //   //remap avatar for clientView scope
  //   // if (this.constructor._scopeNames.includes("onlyGlobalPath")) {
  //   //   //attributes.globalPath = attributes.thumbnail.globalPath;
  //   //   delete attributes.path;
  //   // }
  //   return attributes
  // }
}

module.exports = {
  init: (sequelize) => {
    Image.init(
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4
        },
        isDefault: {
          allowNull: false,
          defaultValue: false,
          type: DataTypes.BOOLEAN,
        },

        // globalPath: {
        //   type: DataTypes.VIRTUAL,
        //   get() {
        //     return envUtils.encodedToGlobal(this.path);
        //   },
        // },
        path: {
          type: DataTypes.LINK,
          allowNull: false,
          // get() {
          //   return this.getDataValue("path");
          // },
          // set(value) {
          //   throw new Error(
          //     "Do not try to set the `path` value directly, use methods!"
          //   );
          // },
        },
      },
      {
        sequelize,
        modelName: "Image",
        timestamps: true,
        updatedAt: false,
        scopes: {
          defaultAvatar: {
            where: {
              isDefault: true,
              path: process.env.DEFAULT_AVATAR,
            },
          },
        },
      }
    );
  },
  assoc: (sequelize) => {
    Image.addScope("onlyPath", {
      attributes: ["path"]
    });
  },
};
