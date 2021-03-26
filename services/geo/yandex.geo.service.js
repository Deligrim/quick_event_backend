"use strict";
const axios = require('axios').default;
const { ValidationError, ValidationErrorItem } = require('sequelize/lib/errors');

async function getAddressFromCords(longitude, latitude) {
    const path = "https://geocode-maps.yandex.ru/1.x?geocode=" +
        longitude +
        ',' +
        latitude +
        "&apikey=" +
        process.env.YANDEX_API_KEY +
        "&format=json&kind=house&results=1";
    const result = await axios.get(path);
    console.log(JSON.stringify(result.data));
    if (result.data.response.GeoObjectCollection.metaDataProperty.GeocoderResponseMetaData.found > 0) {
        const address = result.data.response.GeoObjectCollection.featureMember[0].GeoObject.name;
        const countryCity = result.data.response.GeoObjectCollection.featureMember[0].GeoObject.description;
        return { address, countryCity };
    } else {
        console.error("Bad yandex responce!");
        console.error(result);
        throw new ValidationError(null, [
            new ValidationErrorItem(
                "Bad geolocation",
                null,
                "longitude, latitude",
                null
            ),
        ]);
    }
}

async function getCoordsFromAddress(address) {
    address = encodeURIComponent(address);
    //console.log("Try get address coords: " + address);
    const path = "https://geocode-maps.yandex.ru/1.x?geocode=" +
        address +
        "&apikey=" +
        process.env.YANDEX_API_KEY +
        "&format=json&results=1";
    const result = await axios.get(path);
    console.log(JSON.stringify(result.data));
    if (result.data.response && result.data.response.GeoObjectCollection.metaDataProperty.GeocoderResponseMetaData.found > 0) {
        const pos = result.data.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos.split(" ");
        const addressName = result.data.response.GeoObjectCollection.featureMember[0].GeoObject.name;
        const countryCity = result.data.response.GeoObjectCollection.featureMember[0].GeoObject.description;
        const [longitude, latitude] = pos;
        return { longitude, latitude, addressName, countryCity };
    } else {
        console.log("Empty yandex responce!");
        console.log(JSON.stringify(result));
        throw new ValidationError(null, [
            new ValidationErrorItem(
                "Bad geolocation",
                null,
                "address",
                null
            ),
        ]);
    }
}

module.exports = { getAddressFromCords, getCoordsFromAddress };