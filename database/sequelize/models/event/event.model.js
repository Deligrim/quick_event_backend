const { DataTypes, Model } = require("sequelize");
const {
  ValidationError,
  ValidationErrorItem,
} = require("sequelize/lib/errors");
const _ = require("lodash");

class EventNote extends Model {

  static async createEvent(payload, options) {
    const { Image } = sequelize.models;
    options = require("lodash").defaults(options, {
      transaction: null
    });
    var transaction = options.transaction || (await sequelize.transaction());
    try {
      if (!(payload.endDateOfEvent instanceof Date) || isNaN(payload.endDateOfEvent) ||
        !(payload.startDateOfEvent instanceof Date) || isNaN(payload.startDateOfEvent) ||
        payload.endDateOfEvent < payload.startDateOfEvent)
        throw new ValidationError(null, [
          new ValidationErrorItem(
            "End date must be valid and cannot be and earlier than start",
            null,
            "payload.endDateOfEvent",
            payload.endDateOfEvent
          ),
        ]);

      const thumbnail = await Image.createImage(
        payload.thumbnail.buffer,
        payload.title,
        'thumbnail',
        {
          resizeArgs: {
            withoutEnlargement: true,
            height: 1024,
            width: 1024,
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
      if (!options.transaction) transaction.commit().catch(() => {/*rollback already call*/ });
      return newEvent;
    }
    catch (e) {
      if (!options.transaction) await transaction.rollback();
      throw e;
    }
  }

  static async updateEvent(payload, options) {
    const { Image } = sequelize.models;
    options = require("lodash").defaults(options, {
      transaction: null
    });
    var transaction = options.transaction || (await sequelize.transaction());
    try {
      const eventNote = await EventNote.findByPk(payload.id, { transaction });
      console.log(eventNote);
      if (!eventNote) {
        throw new ValidationError(null, [
          new ValidationErrorItem(
            "Event not exist in database",
            null,
            "payload.id",
            null
          ),
        ]);
      }
      payload = _.defaults(_.pick(payload,
        ['title',
          'kind',
          'location',
          'description',
          'startDateOfEvent',
          'endDateOfEvent',
          'thumbnail']),
        {
          title: eventNote.title,
          kind: eventNote.kind,
          location: eventNote.location,
          description: eventNote.description,
          startDateOfEvent: eventNote.startDateOfEvent,
          endDateOfEvent: eventNote.endDateOfEvent
        });
      if (!(payload.endDateOfEvent instanceof Date) || isNaN(payload.endDateOfEvent) ||
        !(payload.startDateOfEvent instanceof Date) || isNaN(payload.startDateOfEvent) ||
        payload.endDateOfEvent < payload.startDateOfEvent)
        throw new ValidationError(null, [
          new ValidationErrorItem(
            "End date must be valid and cannot be and earlier than start",
            null,
            "payload.endDateOfEvent",
            payload.endDateOfEvent
          ),
        ]);
      if (payload.thumbnail) {
        const thumb = await eventNote.getThumb({ transaction });
        await thumb.destroyImage({ transaction });
        const newThumbnail = await Image.createImage(
          payload.thumbnail.buffer,
          payload.title,
          'thumbnail',
          {
            resizeArgs: {
              withoutEnlargement: true,
              height: 1024,
              width: 1024,
            },
            saveOptions: { transaction }
          });
        await eventNote.setThumb(newThumbnail, { transaction });
      }
      _.assign(eventNote, _.omit(payload, ['thumbnail']))
      await eventNote.save({ transaction });
      if (!options.transaction)
        transaction.commit().catch(() => {/*rollback already call*/ });
      return eventNote;
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
}

module.exports = {
  init: (sequelize) => {
    EventNote.init(
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4
        },
        title: {
          allowNull: false,
          type: DataTypes.STRING,
          validate: {
            len: [2, 40]
          }
        },
        description: {
          allowNull: false,
          type: DataTypes.TEXT,
          validate: {
            len: [0, 1400]
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
            len: [2, 100]
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
    sequelize.define('Event_Gallery', {}, { timestamps: false });
  },
  assoc: (sequelize) => {
    const { User, Image, Event_Organizator, Event_Gallery } = sequelize.models;
    EventNote.belongsTo(Image, {
      as: 'thumb',
      foreignKey: 'thumbId'
    });

    EventNote.belongsToMany(Image, {
      through: Event_Gallery,
      as: 'Photos'
    });

    EventNote.belongsToMany(User, {
      as: "Members", //Участники и организаторы
      through: Event_Organizator,
      foreignKey: "EventId",
      otherKey: "UserId",
    });

    EventNote.addScope("clientView", function (path = "") {
      return {
        attributes: [
          "id",
          "title",
          "description",
          "location",
          "startDateOfEvent",
          "endDateOfEvent",
          "kind",
          "status",
          [sequelize.fn('REPLACE',
            sequelize.col(`${path}thumb.path`),
            process.env.HOST_MASK,
            process.env.APP_HOST),
            `thumbImg`]
        ],
        include: {
          attributes: [],
          model: Image,
          as: "thumb"
        }
      }
    });
    EventNote.addScope("preview", function (path = "") {
      return {
        attributes: [
          "id",
          "title",
          "startDateOfEvent",
          "endDateOfEvent",
          "kind",
          "status",
          [sequelize.fn('REPLACE',
            sequelize.col(`${path}thumb.path`),
            process.env.HOST_MASK,
            process.env.APP_HOST),
            `thumbImg`]
        ],
        include: {
          attributes: [],
          model: Image,
          as: "thumb"
        }
      }
    });
  },
};
