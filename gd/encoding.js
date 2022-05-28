const fs = require('fs');
const path = require('path')
const Crypto = require('./crypto.js');
const zlib = require('zlib');
let crypto = new Crypto()


const decode = (cb) => {
    let gdSave = path.join(process.env.HOME || process.env.USERPROFILE, "AppData\\Local\\GeometryDash\\CCLocalLevels.dat");
    fs.readFile(gdSave, 'utf8', function (err, saveData) {
        if (err) return console.log("Error! Could not open or find GD save file");
        let decoded = crypto.decode(saveData)
        if (!decoded) return;
        cb(decoded)
    });
}

const  decodeSave = (cb) => {
    let gdSave = path.join(process.env.HOME || process.env.USERPROFILE, "AppData/Local/GeometryDash/CCGameManager.dat");
    fs.readFile(gdSave, 'utf8', function (err, saveData) {
        if (err) return console.log("Error! Could not open or find GD save file")
        let decoded = crypto.decode(saveData)
        if (!decoded) return;
        cb(decoded);
    })
}

const encodeSave = (data) => {
    let gdSave = path.join(process.env.HOME || process.env.USERPROFILE, "AppData\\Local\\GeometryDash\\CCLocalLevels.dat");
    let gzip = zlib.gzipSync(Buffer.from(data)).toString("base64");
    gzip = gzip.replace(/\//g, "_");
    gzip = gzip.replace(/\+/g, "-");
    const xor = crypto.xor(gzip,11);
    console.log(`\x1b[36m\x1b[1mUpdated GD save files\x1b[0m\x1b[36m | File size: \x1b[34m\x1b[47m${Math.round(xor.length/1000)}kb\x1b[0m`);
    console.log("\x1b[31m\x1b[1mFor help with bugs/errors, run the \x1b[4mHelp.cmd\x1b[0m\x1b[1m\x1b[31m file");
    console.log("\x1b[31m\x1b[1mIf this program did not work properly and broke your level, run the \x1b[4mRecovery.cmd\x1b[0m\x1b[1m\x1b[31m file to revert changes.\x1b[0m ")

    fs.writeFile(gdSave, xor, (err) => {if(err)console.log(err)});
    return xor;
}

exports.decodeLevel = decode;
exports.decodeSave = decodeSave;
exports.encode = encodeSave;