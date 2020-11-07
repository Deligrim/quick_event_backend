const { DataTypes, Model } = require("sequelize");
const {
  ValidationError,
  ValidationErrorItem,
} = require("sequelize/lib/errors");

class EventNote extends Model {

  static async createEvent(payload, options, cb) {
    const { Image } = sequelize.models;
    options = require("lodash").defaults(options, {
      transaction: null
    });
    var transaction = options.transaction || (await sequelize.transaction());
    try {

      if (payload.endDateOfEvent < payload.startDateOfEvent)
        throw new ValidationError(null, [
          new ValidationErrorItem(
            "End date cannot be earlier than start",
            null,
            "payload.endDateOfEvent",
            payload.endDateOfEvent
          ),
        ]);

      const thumbnail = await Image.createImage(
        payload.thumbnail.path,
        payload.title,
        'thumbnail',
        {
          resizeArgs: {
            withoutEnlargement: true,
            height: 1024,
          },
          saveOptions: { transaction }
        });

      const newEvent = await EventNote.create({
        title: payload.title,
        description: payload.description,
        startDateOfEvent: payload.startDateOfEvent,
        endDateOfEvent: payload.endDateOfEvent,
        location: payload.location,
        kind: payload.kind,
        thumbId: thumbnail.id,
      }, { transaction });

      return newEvent;
    }
    catch (e) {
      if (!options.transaction) await transaction.rollback();
      throw e;
    }
  }
  async destroyEvent(options) {
    var transaction = options && options.transaction || (await sequelize.transaction());
    try {
      const thumb = await this.getThumb({ transaction });
      await thumb.destroyImage({ transaction });
      await this.destroy({ transaction });
      if (!options || !options.transaction) await transaction.commit();
    }
    catch (e) {
      if (!options || !options.transaction) await transaction.rollback();
      throw e;
    }
  }
  toJSON() {
    let attributes = Object.assign({}, this.get())
    if (this.constructor._scopeNames.includes("clientView")) {
      attributes.imageURL = attributes.thumb.globalPath;
      delete attributes.thumb;
    }
    return attributes
  }
}

module.exports = {
  init: (sequelize) => {
    EventNote.init(
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: DataTypes.INTEGER,
        },
        title: {
          allowNull: false,
          type: DataTypes.STRING,
          validate: {
            len: [2, 20]
          }
        },
        description: {
          allowNull: false,
          type: DataTypes.STRING,
          validate: {
            len: [0, 260]
          }
        },
        startDateOfEvent: {
          allowNull: false,
          type: DataTypes.DATE,
        },
        endDateOfEvent: {
          allowNull: false,
          type: DataTypes.DATE,
        },
        location: {
          allowNull: false,
          type: DataTypes.STRING,
          validate: {
            len: [2, 26]
          }
        },
        kind: {
          allowNull: false,
          defaultValue: 'other',
          type: DataTypes.STRING,
          validate: {
            isIn: {
              args: [['other', 'sport', 'culture', 'youth', 'concert', 'theatre', 'contest', 'festival', 'stock']],
              msg: "The event type must be one of the valid list"
            }
          }
        },
        status: {
          type: DataTypes.VIRTUAL,
          get() {
            const now = new Date();
            if (now < this.startDateOfEvent) return "pending"
            if (now < this.endDateOfEvent) return "in progress"
            return "done"
          }
        }
      },
      {
        sequelize,
        modelName: "EventNote",
        timestamps: false
      }
    );
  },
  assoc: (sequelize) => {
    const { Image } = sequelize.models;
    EventNote.belongsTo(Image, {
      as: 'thumb',
      foreignKey: 'thumbId'
    });
    EventNote.addScope("clientView", {
      include: {
        model: Image.scope("onlyGlobalPath"),
        as: "thumb"
      }
    });
    EventNote.addScope("preview", {
      attributes: ["id", "title", "startDateOfEvent", "kind", "status"]
    });
  },
};
