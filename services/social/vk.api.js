const axios = require('axios').default;

async function checkToken(token) {
    try {
        const response = await axios.get('https://api.vk.com/method/secure.checkToken', {
            params: {
                token,
                v: process.env.VK_API_VERSION, //5.126
                access_token: process.env.VK_SECURE_TOKEN
            }
        })
        //console.log(response);
        return (response.data);
    } catch (error) {
        //console.log(error);
        throw error;
    }
}

async function getUser(idVk) {
    try {
        const response = await axios.get('https://api.vk.com/method/users.get', {
            params: {
                user_ids: idVk,
                fields: 'photo_400_orig',
                name_case: 'Nom',
                lang: 'ru',
                v: process.env.VK_API_VERSION, //5.126
                access_token: process.env.VK_SECURE_TOKEN
            }
        })
        //console.log(response);
        return (response.data);
    } catch (error) {

        //console.log(error);
        throw error;
    }
}


module.exports = { checkToken, getUser }