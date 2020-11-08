# REST API

The REST API to the Quick Event app is described below.

## Adding an event that will be displayed in the feed.

`POST /api/v1/event/`

#### Must be perform in multipart/form-data with following fields: 

1. `title` - Title (2..40 chars)
2. `description` - Description (0..1400 chars)
3. `startDateOfEvent` - Start date of event (date with time in ISO format with UTC mark)
4. `endDateOfEvent` - End date of event (date with time in ISO format with UTC mark). Must be later than the start date. Must be equal to the start date if the event does not extend in time.
5. `location` - Address of event (2..100 chars)
6. `kind` - type of event, must be one of list:
    * `other`,
    * `sport`,
    * `culture`,
    * `youth`,
    * `concert`,
    * `theatre`,
    * `contest`,
    * `festival`,
    * `stock`
7. `thumbnail` - image file in jpg or png format. Will be reduced if more than 1024 pixels on one of the sides. Must be smaller than 5 mb.

#### Request in curl

```
curl --location --request POST 'http://localhost:4848/api/v1/event/' \
--form 'title=Событие Ноябрьска' \
--form 'description=Уже совсем скоро будет главное событие города - 
запуск мобильного приложения, собирающие все события города
в одном месте на официальном уровне.' \
--form 'startDate=2020-12-10T10:20:30Z' \
--form 'endDate=2020-12-12T10:20:30Z' \
--form 'location=Ноябрьск, Россия' \
--form 'kind=culture' \
--form 'thumbnail=@noyabrsk.jpg'
```

#### Response in JSON

###### OK 200 (all rigth):
```
    {
        "success":true,
        "newEventId":1
    }

    `newEventId` - id of added event
```

###### 400 Bad Request (for example do not include the location in the request):

```
    {
        "success": false,
        "code": "badrequest",
        "msg": "Bad request",
        "reason": [
            {
                "message": "EventNote.location cannot be null",
                "type": "notNull Violation",
                "path": "location",
                "value": null
            }
        ]
    }
```

## Get specific event

`GET /api/v1/event/:id`

#### Params
    * id - identifier of specific event

#### Request

`curl --location --request GET 'http://localhost:4848/api/v1/event/1'`

#### Responce

###### OK 200:

```
    {
        "success": true,
        "eventNote": {
            "status": "pending",
            "id": 1,
            "title": "Событие Ноябрьска",
            "description": "Уже совсем скоро будет главное событие города - \nзапуск мобильного приложения, собирающие все события города\nв одном месте на официальном уровне.",
            "startDateOfEvent": "2020-12-10T10:20:30.000Z",
            "endDateOfEvent": "2020-12-12T10:20:30.000Z",
            "location": "Ноябрьск, Россия",
            "kind": "culture",
            "imageURL": "http://localhost:4848/storage/images/7e92eba037ad2d2b/thumbnail_187618.jpg"
        }
    }
```
    `status` - must be `pending`, `in progress` and `done` and depends on the current date and the start and end dates of the event

###### 404 Not Found:

```
    {
        "success": false,
        "msg": "Event not exist!"
    }
```

## Get list of events

`GET /api/v1/event/`

#### Request

`curl --location --request GET 'http://localhost:4848/api/v1/event/'`

#### Responce

###### OK 200:

```
    {
        "success": true,
        "events": [
            {
                "status": "in progress",
                "id": 1,
                "title": "Выставка #ЯмалРодина",
                "startDateOfEvent": "2020-10-28T10:20:30.000Z",
                "endDateOfEvent": "2020-12-01T10:20:30.000Z",
                "kind": "culture",
                "imageURL": "http://localhost:4848/storage/images/50add274a1654e26/thumbnail_858819.jpg"
            },
            {
                "status": "pending",
                "id": 2,
                "title": "Событие Ноябрьска",
                "startDateOfEvent": "2020-12-10T10:20:30.000Z",
                "endDateOfEvent": "2020-12-12T10:20:30.000Z",
                "kind": "culture",
                "imageURL": "http://localhost:4848/storage/images/7e92eba037ad2d2b/thumbnail_862781.jpg"
            }
        ]
    }
```