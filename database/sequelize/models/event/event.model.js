const { DataTypes, Model, Op } = require("sequelize");
const {
  ValidationError,
  ValidationErrorItem,
} = require("sequelize/lib/errors");
const _ = require("lodash");

class EventNote extends Model {

  static async createEvent(payload, options) {
    const { Image, Tag, EventCity, EventScheduleNote } = sequelize.models;
    options = _.defaults(options, {
      transaction: null
    });
    var transaction = options.transaction || (await sequelize.transaction());
    try {
      //find city
      const city = await EventCity.findByPk(payload.regionId, { transaction });
      if (!city) {
        throw new ValidationError(null, [
          new ValidationErrorItem('City not found', 'Validation error', 'regionId')
        ]);
      }
      //create event and link to city
      const newEvent = await EventNote.create({
        title: payload.title,
        description: payload.description,
        regionId: city.id
      }, { transaction });
      //create and link schedules
      for (let i = 0; i < payload.schedule.length; i++) {
        await EventScheduleNote.createEventScheduleNote(
          {
            ...payload.schedule[i],
            eventId: newEvent.id
          }
          , { transaction });
        //await newEvent.addSchedule(scheduleNote, { transaction });
      }
      //create and link images
      for (let i = 0; i < payload.photos.length; i++) {
        const galleryPhoto = await Image.createImage(
          payload.photos[i],
          payload.title,
          'picture' + i,
          {
            resizeArgs: {
              withoutEnlargement: true,
              height: 1024,
              width: 1024,
            },
            saveOptions: { transaction }
          });
        await newEvent.addPhoto(galleryPhoto, { transaction, through: { index: i } });
      }
      //link tags
      for (let i = 0; i < payload.tags.length; i++) {
        const tag = await Tag.findByPk(payload.tags[i], { transaction });
        if (!tag) {
          throw new ValidationError(null, [
            new ValidationErrorItem('Tag not found', 'Validation error', `tags[${i}]`)
          ]);
        }
        await newEvent.addTag(tag, { transaction });
      }
      if (!options.transaction) transaction.commit().catch(() => {/*rollback already call*/ });
      return newEvent;
    }
    catch (e) {
      if (!options.transaction) await transaction.rollback();
      throw e;
    }
  }

  static async updateEvent(payload, options) {
    const { Image, Tag, EventCity, EventScheduleNote } = sequelize.models;
    options = _.defaults(options, {
      transaction: null
    });
    var transaction = options.transaction || (await sequelize.transaction());
    try {
      const eventNote = await EventNote.findByPk(payload.id, { transaction });
      if (!eventNote) {
        throw new ValidationError(null, [
          new ValidationErrorItem(
            "Event not exist in database",
            null,
            "id",
            null
          ),
        ]);
      }
      payload = _.defaults(payload,
        {
          title: eventNote.title,
          description: eventNote.description,
          regionId: eventNote.regionId
        });
      if (payload.regionId != eventNote.regionId) {
        const city = await EventCity.findByPk(payload.regionId, { transaction });
        if (!city) {
          throw new ValidationError(null, [
            new ValidationErrorItem('City not found', 'Validation error', 'regionId')
          ]);
        }
      }
      _.assign(eventNote, _.pick(payload, ['title', 'description', 'regionId']))
      await eventNote.save({ transaction });
      if (payload.schedule && payload.schedule.length > 0) {
        const oldSchedules = await eventNote.getSchedules({ transaction });
        for (let i = 0; i < oldSchedules.length; i++) {
          await oldSchedules[i].destroyEventScheduleNote({ transaction });
        }
        for (let i = 0; i < payload.schedule.length; i++) {
          await EventScheduleNote.createEventScheduleNote(
            {
              ...payload.schedule[i],
              eventId: eventNote.id
            }
            , { transaction });
        }
      }
      if (payload.tags && payload.tags.length > 0) {
        //await eventNote.removeTags({ transaction });
        let tags = [];
        for (let i = 0; i < payload.tags.length; i++) {
          const tag = await Tag.findByPk(payload.tags[i], { transaction });
          if (!tag) {
            throw new ValidationError(null, [
              new ValidationErrorItem('Tag not found', 'Validation error', `tags[${i}]`)
            ]);
          }
          tags.push(tag);
        }
        if (tags.length < payload.tags.length) {
          throw new ValidationError(null, [
            new ValidationErrorItem('Some tag not found', 'Validation error',
              payload.tags.filter(x => tags.every(t => t.title !== x)))
          ]);
        }
        await eventNote.setTags(tags, { transaction });
      }
      if (payload.photos && payload.photos.length > 0) {

        const oldPhotos = await eventNote.getPhotos({ transaction });
        for (let i = 0; i < oldPhotos.length; i++) {
          await oldPhotos[i].destroyImage({ transaction, deleteDir: false });
        }
        for (let i = 0; i < payload.photos.length; i++) {
          const galleryPhoto = await Image.createImage(
            payload.photos[i],
            payload.title,
            'picture' + i,
            {
              resizeArgs: {
                withoutEnlargement: true,
                height: 1024,
                width: 1024,
              },
              saveOptions: { transaction }
            });
          await eventNote.addPhoto(galleryPhoto, { transaction, through: { index: i } });
        }
      }
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
      const oldSchedules = await this.getSchedules({ transaction });
      for (let i = 0; i < oldSchedules.length; i++) {
        await oldSchedules[i].destroyEventScheduleNote({ transaction });
      }
      const oldPhotos = await this.getPhotos({ transaction });
      for (let i = 0; i < oldPhotos.length; i++) {
        await oldPhotos[i].destroyImage({ transaction });
      }
      const posts = await this.getPosts({ transaction });
      for (let i = 0; i < posts.length; i++) {
        await posts[i].destroyPostRecord({ transaction });
      }
      //todo : impl other delete
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
    if (attributes.Tags) {
      for (let i = 0; i < attributes.Tags.length; i++) {
        attributes.Tags[i] = attributes.Tags[i].title;
      }
    }
    if (attributes.membersCount) {
      attributes.membersCount = +attributes.membersCount;
    }
    const scope = this.constructor._scopeNames;
    if (scope.includes("preview") || scope.includes("orderPointDistance") || scope.includes("micro")) {
      attributes = { thumbnail: attributes.Photos[0].path, ...attributes };
      delete attributes.Photos;
    }
    else if (attributes.Photos) {
      attributes.Photos = attributes.Photos.map((v => v.path));
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
      },
      {
        sequelize,
        modelName: "EventNote",
        timestamps: false
      }
    );
    sequelize.define('Event_Gallery', { index: DataTypes.INTEGER }, { timestamps: false });
    sequelize.define('Event_Tags', {}, { timestamps: false });
  },
  assoc: (sequelize) => {
    const { User, Image, Event_Members, Event_Gallery, EventScheduleNote, EventCity, Tag, Event_Tags, PostRecord } = sequelize.models;

    // EventNote.belongsTo(Image, {
    //   as: 'thumb',
    //   foreignKey: 'thumbId'
    // });
    EventNote.hasMany(EventScheduleNote, {
      as: 'Schedules',
      foreignKey: 'eventId'
    });
    EventNote.hasMany(PostRecord, {
      as: 'Posts',
      foreignKey: 'eventId'
    });
    EventNote.belongsTo(EventCity, {
      as: 'region',
      foreignKey: 'regionId'
    });


    EventNote.belongsToMany(Image, {
      through: Event_Gallery,
      as: 'Photos' // Промо-фотографии события
    });
    EventNote.belongsToMany(Tag, {
      as: "Tags", //Теги события
      through: Event_Tags,
      foreignKey: "EventId",
      otherKey: "Tag",
    });
    EventNote.belongsToMany(User, {
      as: "Members", //Участники и организаторы
      through: Event_Members,
      foreignKey: "EventId",
      otherKey: "UserId",
    });

    EventNote.addScope("clientView", function (alias = "EventNote") {
      return {
        attributes: [
          "id",
          "title",
          "description",
          [sequelize.literal(`(SELECT COUNT(*) FROM "Event_Members" WHERE "Event_Members"."EventId" = "${alias}"."id")`),
            'membersCount'],
        ],
        include: [
          {
            model: EventCity.scope('preview'),
            as: "region"
          },
          {
            model: Image.scope("onlyPath"),
            attributes: ['path'],
            as: "Photos",
            through: {
              attributes: [],
            }
          },
          {
            model: Tag,
            as: "Tags",
            through: { attributes: [] }
          },
          {
            model: EventScheduleNote.scope('clientView'),
            as: "Schedules"
          },
        ]
      }
    });
    EventNote.addScope("orderPointDistance", function (coors = [33, 44], limit = 10, alias = "EventNote") {
      return {
        attributes: [
          "id",
          "title",
          [sequelize.literal(`(SELECT COUNT(*) FROM "Event_Members" WHERE "Event_Members"."EventId" = "${alias}"."id")`), 'membersCount'],
          //[sequelize.literal(`("Schedules"."location"::point <@> '(${coors[0]}, ${coors[1]})')::numeric * 1.609344`), 'distance']
        ],
        include: [
          {
            model: EventCity.scope('preview'),
            as: "region"
          },
          {
            model: Image.scope("onlyPath"),
            attributes: ['path'],
            as: "Photos",
            through: {
              attributes: [],
              where: {
                index: 0
              }
            }
          },
          {
            model: Tag,
            as: "Tags",
            through: { attributes: [] }
          },
          {
            model: EventScheduleNote.scope({
              method: ['pointDistance', coors, "Schedules"]
            }),
            as: "Schedules"
          },

        ],
        order: [sequelize.literal(`"Schedules.distance"`)],

      }
    });
    EventNote.addScope("micro", function (alias = "EventNote") {
      return {
        attributes: [
          "id"
        ],
        include: [
          {
            model: Image.scope("onlyPath"),
            attributes: ['path'],
            as: "Photos",
            through: {
              attributes: [],
              where: {
                index: 0
              }
            }
          },
        ]
      }
    });
    EventNote.addScope("preview", function (alias = "EventNote") {
      return {
        attributes: [
          "id",
          "title",
          [sequelize.literal(`(SELECT COUNT(*) FROM "Event_Members" WHERE "Event_Members"."EventId" = "${alias}"."id")`),
            'membersCount'],
        ],
        include: [
          {
            model: EventCity.scope('preview'),
            as: "region"
          },
          {
            model: Image.scope("onlyPath"),
            attributes: ['path'],
            as: "Photos",
            through: {
              attributes: [],
              where: {
                index: 0
              }
            }
          },
          {
            model: Tag,
            as: "Tags",
            through: { attributes: [] }
          },
          {
            model: EventScheduleNote.scope('clientView'),
            as: "Schedules"
          },

        ]
      }
    });
  },
};
