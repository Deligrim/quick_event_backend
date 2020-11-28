# REST API

REST API 2 версии для приложения Quick Event.

## Содержание документации

- [Введение в API](#введение-в-api)
    - [Роли пользователей](#роли-пользователей)
    - [Формат запроса](#формат-запроса)
    - [Формат ответа](#формат-ответа)
- [Процесс авторизации](#процесс-авторизации)
	- [Использование JWT для пользователей и организаторов](#использование-jwt-для-пользователей-и-организаторов)
	- [Использование API токена для администратора](#использование-api-токена-для-администратора)
	- [API авторизации с помощью email](#api-авторизации-с-помощью-email)
	    - [Локальная регистрация](#локальная-регистрация)
	    - [Локальная авторизация](#локальная-авторизация)
	- [API авторизации через VK](#api-авторизации-через-vk)
	- [API авторизации через Facebook](#api-авторизации-через-facebook)
	- [API авторизации через Google](#api-авторизации-через-google)
- [API Пользователей](#api-пользователей)
    - [Админский уровень доступа](#админский-уровень-доступа)
        - [Создание пользователя](#создание-пользователя)
        - [Получение списка пользователей](#получение-списка-пользователей)
        - [Удаление пользователя](#удаление-пользователя)
    - [Пользовательский уровень доступа](#пользовательский-уровень-доступа)
        - [Получение информации о профиле](#получение-информации-о-профиле)
        - [Получение информации о пользователе](#получение-информации-о-пользователе)
- [API Событий](#api-событий)
    - [Админский уровень доступа](#админский-уровень-доступа-1)
        - [Создание события](#создание-события)
        - [Редактирование события](#редактирование-события)
        - [Удаление события](#удаление-события)
    - [Пользовательский уровень доступа](#пользовательский-уровень-доступа-1)
        - [Редактирование события организатором](#редактирование-события-организатором)
    - [Публичный уровень доступа](#публичный-уровень-доступа)
        - [Получение списка событий](#получение-списка-событий)
        - [Получение информации о событии](#получение-информации-о-событии)

# Введение в API:

API соответсвует архитектурному стилю взаимодействия REST.

Ниже описаны подробности используемых ролей с разделённым уровнем доступа, форматов запросов и ответов.

## Роли пользователей:

Всего есть три роли с различными правами доступа: **администратор**, **организатор** и **пользователь**.

Также есть несколько функций API с публичным доступом, такие как просмотр событий.

В документации явно указано, какая роль может использовать тот или инной API.

Подробнее об авторизации для разных ролей, написано в разделе [Процесс авторизации](#процесс-авторизации)

## Формат запроса:

Все запросы отправляются по протоколу HTTP на URL с обязательным API префиксом (далее API_PREFIX):
```url
https://qevent.slar.ru/api/v2
```
Запросы **GET** и **DELETE** исключают наличие тела запроса и являются идемпотентными. 
Все параметры в запросах **GET** и **DELETE** передаются прямо в URL (обозначаются в документации по шаблону *:param*). 

Запросы **POST** и **PUT** могут содержать URL параметры (обозначаются в документации по шаблону *:param*) и тело запроса в одном из следующих форматов:
   - *application/x-www-form-urlencoded* - в случае, если тело запроса не предпологает наличие полей с файлами.
   - *multipart/form-data* - в случае, если запрос предпологает наличие полей с файлами по спецификации.

Необязательный поля в теле запроса обозначаются в документации как *optional*.

## Формат ответа:

### Все ответы API возвращаются в формате JSON с кодом ответа:
   - OK 200
   - Bad Request 400
   - Unauthorized 401
   - Forbidden 403
   - Internal Error 500

### Общий шаблон для всех ответов:

```json
{
    "success": true,
    "other_filed": "..."
}
```

### Общий шаблон для ошибок:

#### Краткий:

```json
{
    "success": false,
    "code": "errorname",
    "msg": "Error messege"
}
```

#### Расширенный (пример):

```json
{
    "success": false,
    "code": "badrequest",
    "msg": "Bad request",
    "reason": [
        {
            "message": "User.lastName cannot be null",
            "type": "notNull Violation",
            "path": "lastName",
            "value": null
        }
    ]
}
```

# Процесс авторизации:

В этом разделе описан процесс авторизации, регистрации и аутентификации для пользователей (в т.ч. организаторов) и администраторов.

## Использование JWT для пользователей и организаторов:

JSON Web Token (JWT) — это открытый стандарт `RFC 7519` для создания токенов доступа, основанный на формате JSON.

   - В случае успешной авторизации (правильный пароль и email для локальной или завершённый процесс OAuth 2.0), сервер выдаёт JWT токен.
   - JWT токен должен хранится на клиенте и использоваться в API, требующий **Пользовательский уровень доступа** в виде значения заголовка `Authorization`.
   - Срок жизни JWT токена составляет 10 дней с момента выдачи, после чего клиенту необходимо запросить новый, пройдя процедуру аутентификации.
   - В случае отсутствия токена, будет выдана ошибки:
   ```json
    {
        "success": false,
        "code": "no_token_supplied",
        "msg": "Authentication failed. Token not provided."
    }
   ```

## Использование API токена для администратора:

   - API admin токен - это секретный токен, выдаваемый администратору навсегда.
   - API admin токен должен хранится у администратора и использоваться в API, требующий **Админский уровень доступа** в виде значения заголовка `Authorization`.

## API авторизации с помощью email:

Локальная авторизация предполагает предосталение заранее зарегестрированной валидной пары email-пароль для выдачи JWT токена.

### Локальная регистрация:

`POST API_PREFIX/user/register/local`

Регистрация пользователя с ролью user с локальныйм способом авторизации (email).

##### Должен быть со следующими полями: 

1. `email` - Email аккаунта (должен быть в формате e-mail)
2. `password` - Пароль аккаунта (6..32 символа)
3. `firstName` - Имя пользователя (2..24 символа)
4. `avatar` - Аватар пользователя, файл изображения в jpg или png формате. Будет обрезан по центру до 1024 пикселей по тем сторонам, которые больше этого значения. Должен быть меньше 5мб. *Optional*

#### Запрос с помощью curl:

```bash
curl --location --request POST 'https://qevent.slar.ru/api/v2/user/register/local' \
--form 'email=test3@ya.ru' \
--form 'password=123456' \
--form 'firstName=Малинов' \
--form 'lastName=Константин' \
--form 'role=organizator' \
--form 'avatar=@/Users/admin/Downloads/Astronaut.jpg'
```

#### Ответ:

##### 200 OK:
```json
{
    "success": true,
    "msg": "Successful created new user"
}
```

##### 400 Bad Request (для примера, не включим email в запрос):

```json
{
    "success": false,
    "code": "badrequest",
    "msg": "Bad request",
    "reason": [
        {
            "message": "MailAccount.email cannot be null",
            "type": "notNull Violation",
            "path": "email",
            "value": null
        }
    ]
}
```

### Локальная авторизация:

`POST API_PREFIX/user/login/local`

Авторизация пользователя с ролью user или organizator с локальныйм способом авторизации (email).

##### Должен быть со следующими полями:

1. `email` - Email аккаунта (должен быть в формате e-mail)
2. `password` - Пароль аккаунта (6..32 символа)

#### Запрос с помощью curl:

```bash
curl --location --request POST 'https://qevent.slar.ru/api/v2/user/register/local' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'email=test3@ya.ru' \
--data-urlencode 'password=123456' \
```

#### Ответ:

##### 200 OK:
```json
{
    "success": true,
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjQ0OTUyNGVlLWRkMjctNDY0Mi05YzVlLWVjMGZmY2FmY2ViZSIsImlhdCI6MTYwNjQwMjgwODY5NywiZXhwIjoxNjA3MjY2ODA4Njk3fQ.yiPtiSJ75rOmb29Pzickk9VJd22iFrVfxPfvoWXg_CM",
    "userId": "449524ee-dd27-4642-9c5e-ec0ffcafcebe"
}
```

`token` - JWT-токен с сроком жизни 10 дней.
`userId` - UUID пользователя.

##### 401 Bad Request (для примера, пароль не верный):

```json
{
    "success": false,
    "code": "auth_failed",
    "msg": "Authentication failed"
}
```

## API авторизации через VK:

*Будет реализовано в будущем.*

## API авторизации через Facebook:

*Будет реализовано в будущем.*

## API авторизации через Google:

*Будет реализовано в будущем.*

# API Пользователей:

## Админский уровень доступа:

### Создание пользователя:

`POST API_PREFIX/user/create`

Создание пользователя с заданной ролью (user or organizator) с локальныйм способом авторизации (email).

##### Должен быть со следующими полями:

1. `email` - Email аккаунта (должен быть в формате e-mail)
2. `password` - Пароль аккаунта (6..32 символа)
3. `firstName` - Имя пользователя (2..24 символа)
4. `role` - Роль пользователя (должна быть `user` или `organizator`)
5. `avatar` - Аватар пользователя, файл изображения в jpg или png формате. Будет обрезан по центру до 1024 пикселей по тем сторонам, которые больше этого значения. Должен быть меньше 5мб.*Optional*

#### Запрос с помощью curl:

```bash
curl --location --request POST 'https://qevent.slar.ru/api/v2/user/create' \
--header 'Authorization: ADMIN_API_TOKEN' \
--form 'email=test3@ya.ru' \
--form 'password=123456' \
--form 'firstName=Малинов' \
--form 'lastName=Константин' \
--form 'role=organizator' \
--form 'avatar=@/Users/admin/Downloads/Astronaut.jpg'
```

#### Ответ:

##### 200 OK:
```json
{
    "success": true,
    "newUserId": "5a12dfc6-8eba-43a3-a417-bc8a6ca37e15" 
}
```

`newUserId` - UUID нового пользователя

##### 400 Bad Request (для примера, не включим email в запрос):

```json
{
    "success": false,
    "code": "badrequest",
    "msg": "Bad request",
    "reason": [
        {
            "message": "MailAccount.email cannot be null",
            "type": "notNull Violation",
            "path": "email",
            "value": null
        }
    ]
}
```

### Получение списка пользователей:

`GET API_PREFIX/user/list/all`

Получение списка всех пользователей (кроме администраторов)

#### Запрос с помощью curl:

```bash
curl --location --request GET 'https://qevent.slar.ru/api/v2/user/list/all' \
--header 'Authorization: ADMIN_API_TOKEN' \
```

#### Ответ:

##### 200 OK:
```json
{
    "success": true,
    "usersCount": 2,
    "users": [
        {
            "id": "5a12dfc6-8eba-43a3-a417-bc8a6ca37e15",
            "firstName": "Климашин",
            "lastName": "Максим",
            "role": "user",
            "avatarImg": "https://qevent.slar.ru/storage/images/cb5e6f1a7bce87f0/avatar_1606512497368.jpg"
        },
        {
            "id": "71c460e8-9de0-46d9-adbd-9df2c0bdbc1d",
            "firstName": "Малинов",
            "lastName": "Константин",
            "role": "organizator",
            "avatarImg": "https://qevent.slar.ru/storage/images/b5dcdc2c1777f613/avatar_1606600767168.jpg"
        }
    ]
}
```

`usersCount` - количество пользователей.

### Удаление пользователя:

`DELETE API_PREFIX/user/:UUID`

Удаление конкретного пользователя.

#### Параметры:

*UUID* - identifier of specific user

#### Запрос с помощью curl:

```bash
curl --location --request DELETE 'https://qevent.slar.ru/api/v2/user/449524ee-dd27-4642-9c5e-ec0ffcafcebe' \
--header 'Authorization: ADMIN_API_TOKEN'
```

#### Ответ:

##### 200 OK:

```json
{
    "success": true
}
```

##### 404 Not found:

```json
{
    "success": false,
    "code": "notfound",
    "msg": "User not exist!"
}
```

## Пользовательский уровень доступа:

### Получение информации о профиле:

`GET API_PREFIX/user/self`

Получение информации о своём профиле

#### Запрос с помощью curl:

```bash
curl --location --request GET 'https://qevent.slar.ru/api/v2/user/self' \
--header 'Authorization: JWT' \
```

#### Ответ:

##### 200 OK:
```json
{
    "success": true,
    "user": {
        "id": "449524ee-dd27-4642-9c5e-ec0ffcafcebe",
        "firstName": "Климашин",
        "lastName": "Максим",
        "role": "user",
        "avatarImg": "https://qevent.slar.ru/storage/images/20a2f34c36da8659/avatar_1606402703968.jpg"
    }
}
```

### Получение информации о пользователе:

`GET API_PREFIX/user/from/:UUID`

Получение информации о конкретном пользователе

#### Параметры:

*UUID* - UUID конкретного пользователя

#### Запрос с помощью curl:

```bash
curl --location --request GET 'https://qevent.slar.ru/api/v2/user/from/20e2a0b6-2de3-4059-beab-3b9b2720efa7' \
--header 'Authorization: JWT' \
```

#### Ответ:

##### 200 OK:
```json
{
    "success": true,
    "user": {
        "id": "449524ee-dd27-4642-9c5e-ec0ffcafcebe",
        "firstName": "Климашин",
        "lastName": "Максим",
        "role": "user",
        "avatarImg": "https://qevent.slar.ru/storage/images/20a2f34c36da8659/avatar_1606402703968.jpg"
    }
}
```

##### 404 Not Found:
```json
{
    "success": false,
    "code": "notfound",
    "msg": "User not found"
}
```

# API Событий:

Этот раздел описывает API для событий: функции для создания, редактирования, просмотра списков и отдельных событий, а также удаления.

## Админский уровень доступа:

### Создание события:

`POST API_PREFIX/event/admin/`

Добавление нового мероприятия.

##### Должен быть со следующими полями: 

1. `title` - Название (2..40 символов)
2. `description` - Описание (0..1400 символов)
3. `startDateOfEvent` - Дата начала события (дата со временем в ISO формате в UTC).
4. `endDateOfEvent` - Дата окончания события (дата со временем в ISO формате в UTC). Должна быть позже, чем дата начала. Должна равняться дате начала события, если событие не растягивается во времени.
5. `location` - Адрес проведения события (2..100 символов).
6. `kind` - тип события, должен быть одним из списка:
    * `other` - Другие
    * `sport` - Спорт
    * `culture` - Культура
    * `youth` - Молодёжное
    * `concert` - Концерт
    * `theatre` - Театр
    * `contest` - Соревнование
    * `festival` - Фестиваль
    * `stock` - Акция
7. `thumbnail` - файл изображения в jpg или png формате. Будет обрезан по центру до 1024 пикселей по тем сторонам, которые больше этого значения. Должен быть меньше 5мб.

#### Запрос с помощью curl:

```bash
curl --location --request POST 'https://qevent.slar.ru/api/v2/event/admin' \
--header 'Authorization: ADMIN_API_TOKEN' \
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

#### Ответ:

##### 200 OK:
```json
{
    "success":true,
    "newEventId":"2170d275-4ddd-43ed-881f-569351bccb3e"
}
```
`newEventId` - UUID созданного мероприятия

##### 400 Bad Request (for example do not include the location in the request):

```json
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

### Редактирование события

`PUT API_PREFIX/event/admin/:UUID`

Редактирование информации конкретного мероприятия.

#### Параметры:

*UUID* - UUID конкретного мепроприятия

##### Должен быть со следующими полями: 

1. `title` - Название (2..40 символов). *Optional*
2. `description` - Описание (0..1400 символов) *Optional*
3. `startDateOfEvent` - Дата начала события (дата со временем в ISO формате в UTC). *Optional*
4. `endDateOfEvent` - Дата окончания события (дата со временем в ISO формате в UTC). Должна быть позже, чем дата начала. Должна равняться дате начала события, если событие не растягивается во времени. *Optional*
5. `location` - Адрес проведения события (2..100 символов). *Optional*
6. `kind` - тип события, должен быть одним из списка, *optional*:
    * `other` - Другие
    * `sport` - Спорт
    * `culture` - Культура
    * `youth` - Молодёжное
    * `concert` - Концерт
    * `theatre` - Театр
    * `contest` - Соревнование
    * `festival` - Фестиваль
    * `stock` - Акция
7. `thumbnail` - файл изображения в jpg или png формате. Будет обрезан по центру до 1024 пикселей по тем сторонам, которые больше этого значения. Должен быть меньше 5мб. *Optional*

#### Запрос с помощью curl:

```bash
curl --location --request PUT 'https://qevent.slar.ru/api/v2/event/admin/2170d275-4ddd-43ed-881f-569351bccb3e' \
--header 'Authorization: ADMIN_API_TOKEN' \
--form 'title=Событие Ноябрьска' \
--form 'description=Уже совсем скоро будет главное событие города - 
запуск мобильного приложения, собирающие все события города
в одном месте на официальном уровне.' \
--form 'kind=culture' \
```

#### Ответ:

##### 200 OK:

```json
{
    "success":true
}
```

##### 400 Bad Request (for example UUID param not exist in database):

```json
{
    "success": false,
    "code": "badrequest",
    "msg": "Bad request",
    "reason": [
        {
            "message": "Event not exist in database",
            "type": null,
            "path": "payload.id",
            "value": null
        }
    ]
}
```

### Удаление события:

`DELETE API_PREFIX/event/admin/:UUID`

Удаление конкретного мероприятия.

#### Параметры:

*UUID* - UUID конкретного мероприятия. 

#### Запрос с помощью curl:

```bash
curl --location --request DELETE 'https://qevent.slar.ru/api/v2/event/admin/1a4d8e9f-96c7-4b5c-b23c-2e584f9b4fbc' \
--header 'Authorization: ADMIN_API_TOKEN'
```

#### Ответ:

##### 200 OK:

```json
{
    "success": true
}
```

##### 404 Not found:

```json
{
    "success": false,
    "code": "notfound",
    "msg": "Event not exist!"
}
```

## Пользовательский уровень доступа:

### Редактирование события организатором:

`PUT API_PREFIX/event/:UUID`

Редактирование данных в существующем событии.
*Необходима роль организатора для совершения запроса*

#### Параметры:

*UUID* - identifier of specific event

##### Должен быть со следующими полями: 

1. `title` - Название (2..40 символов). *Optional*
2. `description` - Описание (0..1400 символов) *Optional*
3. `startDateOfEvent` - Дата начала события (дата со временем в ISO формате в UTC) *Optional*
4. `endDateOfEvent` - Дата окончания события (дата со временем в ISO формате в UTC). Должна быть позже, чем дата начала. Должна равняться дате начала события, если событие не растягивается во времени. *Optional*
5. `location` - Адрес проведения события (2..100 символов) *Optional*
6. `kind` - тип события, должен быть одним из списка, *optional*:
    * `other` - Другие
    * `sport` - Спорт
    * `culture` - Культура
    * `youth` - Молодёжное
    * `concert` - Концерт
    * `theatre` - Театр
    * `contest` - Соревнование
    * `festival` - Фестиваль
    * `stock` - Акция
7. `thumbnail` - файл изображения в jpg или png формате. Будет обрезан по центру до 1024 пикселей по тем сторонам, которые больше этого значения. Должен быть меньше 5мб. *Optional*

#### Запрос с помощью curl:

```bash
curl --location --request PUT 'https://qevent.slar.ru/api/v2/event/2170d275-4ddd-43ed-881f-569351bccb3e' \
--header 'Authorization: JWT_TOKEN' \
--form 'title=Событие Ноябрьска' \
--form 'description=Уже совсем скоро будет главное событие города - 
запуск мобильного приложения, собирающие все события города
в одном месте на официальном уровне.' \
--form 'kind=culture' \
```

#### Ответ:

##### 200 OK:

```json
{
    "success":true
}
```

##### 400 Bad Request (для пример, UUID параметр не соответсвует ни одному событию базе данных):

```json
{
    "success": false,
    "code": "badrequest",
    "msg": "Bad request",
    "reason": [
        {
            "message": "Event not exist in database",
            "type": null,
            "path": "payload.id",
            "value": null
        }
    ]
}
```

## Публичный уровень доступа:

### Получение списка событий:

`GET API_PREFIX/event/`

Получение списка всех мероприятий.

#### Запрос с помощью curl:

```bash
curl --location --request GET 'https://qevent.slar.ru/api/v2/event/'
```

#### Ответ:

##### 200 OK:

```json
{
    "success": true,
    "events": [
        {
            "status": "in progress",
            "id": "2de26097-658e-4fdb-acb1-91032be76a63",
            "title": "Выставка #ЯмалРодина",
            "startDateOfEvent": "2020-10-28T10:20:30.000Z",
            "endDateOfEvent": "2020-12-01T10:20:30.000Z",
            "kind": "culture",
            "imageURL": "https://qevent.slar.ru/storage/images/50add274a1654e26/thumbnail_858819.jpg"
        },
        {
            "status": "pending",
            "id": "2de26097-658e-4fdb-acb1-91032be76a65",
            "title": "Событие Ноябрьска",
            "startDateOfEvent": "2020-12-10T10:20:30.000Z",
            "endDateOfEvent": "2020-12-12T10:20:30.000Z",
            "kind": "culture",
            "imageURL": "https://qevent.slar.ru/storage/images/7e92eba037ad2d2b/thumbnail_862781.jpg"
        }
    ]
}
```

### Получение информации о событии:

`GET API_PREFIX/event/:UUID`

Получение информации о конкретном мероприятии.

#### Параметры:

*UUID* - identifier of specific event

#### Запрос с помощью curl:

```bash
curl --location --request GET 'https://qevent.slar.ru/api/v2/event/72a0394a-7052-4761-8d95-9984765d3ade'
```

#### Ответ:

##### 200 OK:

```json
{
    "success": true,
    "eventNote": {
        "status": "pending",
        "id": "72a0394a-7052-4761-8d95-9984765d3ade",
        "title": "Событие Ноябрьска",
        "description": "Уже совсем скоро будет главное событие города - \nзапуск мобильного приложения, собирающие все события города\nв одном месте на официальном уровне.",
        "startDateOfEvent": "2020-12-10T10:20:30.000Z",
        "endDateOfEvent": "2020-12-12T10:20:30.000Z",
        "location": "Ноябрьск, Россия",
        "kind": "culture",
        "imageURL": "https://qevent.slar.ru/storage/images/7e92eba037ad2d2b/thumbnail_187618.jpg"
    }
}
```
`status` - must be `pending`, `in progress` and `done` and depends on the current date and the start and end dates of the event

##### 404 Not Found:

```json
{
    "success": false,
    "code": "notfound",
    "msg": "Event not exist!"
}
```