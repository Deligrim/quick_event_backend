'use strict'

const Fs = require('fs');
const Axios = require('axios');

async function downloadFile(url, name) {
    const path = process.env.TEMP_PATH + "/" + name;
    const writer = Fs.createWriteStream(path);

    const response = await Axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(path));
        writer.on('error', reject);
    })
}
module.exports = { downloadFile }