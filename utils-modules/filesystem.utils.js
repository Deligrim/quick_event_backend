"use strict";
const fs = require('fs');
const mkdirp = require('mkdirp');
var _ = require('lodash');
var pathUtils = require('path');
const util = require('util');

async function createDir(path) {
    var clearPath = path.endsWith('/') ? _.dropRight(path) : pathUtils.dirname(path);
    await util.promisify(mkdirp)(clearPath);
}
function deleteFileSync(path, deleteEmptyDirectories, untilDir = 'images') {
    try {
    fs.accessSync(path);
    console.log("Delete file: " + path);
    fs.unlinkSync(path);
    }
    catch (e) { }
    if (deleteEmptyDirectories) {
        try {
            while (true) {
                path = pathUtils.dirname(path);
                if (path.endsWith(untilDir)) break; //as a precaution
                fs.rmdirSync(path);
                console.log("Delete directory: " + path);
            }
        } catch (e) { }//rmdir throw exception when path not empty 
    }
};
async function deleteFile(path, deleteEmptyDirectories, untilDir = 'images') {
    await util.promisify(fs.access)(path);
    console.log("Delete file: " + path);
    await util.promisify(fs.unlink)(path);
    if (deleteEmptyDirectories) {
        try {
            while (true) {
                path = pathUtils.dirname(path);
                if (path.endsWith(untilDir)) break; //as a precaution
                await util.promisify(fs.rmdir)(path);
                console.log("Delete directory: " + path);
            }
        } catch (e) { }//rmdir throw exception when path not empty 
    }
};
async function deleteDir(path, until='images') {
    if(!fs.existsSync(path)) return;
    try {
        while (true) {
            path = pathUtils.dirname(path);
            if (path.endsWith(until)) break; //as a precaution
            await util.promisify(fs.rmdir)(path);
            console.log("Delete directory: " + path);
        }
    } catch (e) { }//rmdir throw exception when path not empty 
};
function move(oldPath, newPath) {
    fs.renameSync(oldPath, newPath);
    // try {
    //      fs.renameSync(oldPath, newPath);
    // } catch (err) {
    //     if (err.code === 'EXDEV') {
    //         await createDir(newPath);
    //         var readStream = fs.createReadStream(oldPath);
    //         var writeStream = fs.createWriteStream(newPath);
    //         readStream.on('error', reject);
    //         writeStream.on('error', reject);
    //         readStream.on('close', () => fs.unlink(oldPath, reject));
    //         readStream.pipe(writeStream);
    //     }
    // }
}
module.exports = { createDir, deleteFile, deleteFileSync,deleteDir, move }