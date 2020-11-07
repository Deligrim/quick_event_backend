'use strict';
const _ = require('lodash');

module.exports =
{
    encodedToGlobal: fileUri => _.replace(fileUri, process.env.HOST_MASK, process.env.APP_HOST),
    encodedToLocal: fileUri => _.replace(fileUri, process.env.HOST_MASK, process.env.INTERNAL_PUBLIC_PATH),
    localToEncoded: fileUri => _.replace(fileUri, process.env.INTERNAL_PUBLIC_PATH, process.env.HOST_MASK),
    localToGlobal: fileUri => _.replace(fileUri, process.env.INTERNAL_PUBLIC_PATH, process.env.APP_HOST),
    globalToEncoded: fileUri => _.replace(fileUri, process.env.APP_HOST, process.env.HOST_MASK),
    globalToLocal: fileUri => _.replace(fileUri, process.env.APP_HOST, process.env.INTERNAL_PUBLIC_PATH),

    encodedsToGlobals: filesUri => filesUri.map(f=>_.replace(f, process.env.HOST_MASK, process.env.APP_HOST)),
    encodedsToLocals: filesUri => filesUri.map(f=>_.replace(f, process.env.HOST_MASK, process.env.INTERNAL_PUBLIC_PATH)),
    localsToEncodeds: filesUri => filesUri.map(f=>_.replace(f, process.env.INTERNAL_PUBLIC_PATH, process.env.HOST_MASK)),
    localsToGlobals: filesUri => filesUri.map(f=>_.replace(f, process.env.INTERNAL_PUBLIC_PATH, process.env.APP_HOST)),
    globalsToEncodeds: filesUri => filesUri.map(f=>_.replace(f, process.env.APP_HOST, process.env.HOST_MASK)),
    globalsToLocals: filesUri => filesUri.map(f=>_.replace(f, process.env.APP_HOST, process.env.INTERNAL_PUBLIC_PATH)),
}