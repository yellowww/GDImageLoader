const fs = require('fs');
const gd = require("./gd/encoding.js");
const zlib = require('zlib')

//square: 1,211,2,x,3,y,6,rot,32,scale,21,1,41,1,43,HaSaVa1a1
//diamond: 1,211,2,x,3,y,6,(rot-45),32,(scale*0.69),41,1,43,HaSaVa1a1
//triangle: 1,693,2,x,3,y,6,rot,32,scale,41,1,43,HaSaVa1a1


let build = {
    remainingData:undefined,
    remainingParsedData:undefined,
    data:undefined,
    decodedLevel:undefined,
    parsedObjs:undefined,
    loadBuildFile:(file,cb) => {
        fs.readFile(file, 'utf-8', (err,data) => {
            if(err) {console.error(err);return};
            build.data = JSON.parse(data);
            cb();
        });
    },
    loadIntoLevel:(newLevel) => {
        build.loadBuildFile("./saves/cat/ConstructFile.gdi", () => {
            gd.decodeLevel((xml) => {
                const levelData = build.getSingleLevel("image test", xml);
                build.parsedObjs = levelData.split(';');
                build.addObj("square",500,300,5,0,[255,0,255]);
                build.addObj("tri",700,200,7,135,[0,255,255]);
                build.compressToGDFormat();
                
            });
        });
    },
    getSingleLevel:(level,data) => {
        let dataCpy = data.slice();
        dataCpy = build.cutAtChar(dataCpy, level);
        if(build.getRemoved(dataCpy, "k4</k><s>").includes("<k>k2</k>")) { // has no object data tag.
            dataCpy = build.cutAtChar(dataCpy, "</s>");
            dataCpy = "<k>k4</k><s>H4sIAAAAAAAACqWQ0Q3CMAxEFwqSz3HSVHx1Bga4AboCwxPH8JfSIn7uEtv3ZHl_5JZAEyqhhZlaCoEwDYui8QZWQkS4EERxaRQ24gkOhOg1BP5HrFOEz0TgEkTp-RnIr_EByRmmHGLkl23qIUb7W4f2DOwMZHNIhkO69vlcv0PmBPM15MJJJvG0b8hJ3EpYDbPUNd5LVN7W3B55HT8dGoDR2GxodCFhSHJ_AblH157VAgAA</s><k>k5</k><s>Player</s><k>k34</k><s>H4sIAAAAAAAACzPUszCytgYAYgPcnwYAAAA=</s>"+dataCpy;
            data = build.getRemoved(data, level+"</s>")+dataCpy;
        }

        dataCpy = build.cutAtChar(dataCpy, "k4</k><s>");
        dataCpy = build.cutToChar(dataCpy, "</s>");
        build.remainingData = data.replace(dataCpy,"[[PARSEDCONTAINER]]");            
    
        let decoded = Buffer.from(dataCpy,'base64');
        decoded = zlib.unzipSync(decoded).toString();
        build.remainingParsedData = build.cutToChar(decoded,"kA11,0;")+"kA11,0;";
        decoded = build.cutAtChar(decoded, "kA11,0;")
        return decoded;
    },
    cutAtChar:(string,subString) => {
        let copy = string.slice();
        const startIndex = copy.indexOf(subString);
        copy = copy.split('');
        copy.splice(0,startIndex+subString.length);
        return copy.join('');
    },
    getRemoved:(string,subString) => {
        let copy = string.slice();
        const startIndex = copy.indexOf(subString);
        copy = copy.split('');
        return copy.splice(0,startIndex+subString.length).join('');
    },
    cutToChar:(string,subString) => {
        let copy = string.slice();
        const startIndex = copy.indexOf(subString);
        copy = copy.split('');
        copy.splice(startIndex,string.length-startIndex);
        return copy.join('');
    },
    addObj:(type,_x,_y,_scale,_rot,rgb) => {
        let x=_x, y=_y;
        let scale = _scale;
        let rot = _rot;
        let id;
        let hsv = build.rgbToHsvString(rgb[0],rgb[1],rgb[2]);
        if(type=="diamond") {
            scale*=0.69;
            rot+=45;
            id=211;
        }
        if(type=="square") id=211;
        if(type=="tri") id=693;
        build.parsedObjs.pop();
        build.parsedObjs.push(`1,${id},2,${x},3,${y},6,${rot},32,${scale},41,1,43,${hsv}`);
        build.parsedObjs.push('');
        console.log(build.parsedObjs);
    },
    rgbToHsvString: (r,g,b) => {
        let rabs, gabs, babs, rr, gg, bb, h, s, v, diff, diffc, percentRoundFn;
        rabs = r / 255;
        gabs = g / 255;
        babs = b / 255;
        v = Math.max(rabs, gabs, babs),
        diff = v - Math.min(rabs, gabs, babs);
        diffc = c => (v - c) / 6 / diff + 1 / 2;
        percentRoundFn = num => Math.round(num * 100) / 100;
        if (diff == 0) {
            h = s = 0;
        } else {
            s = diff / v;
            rr = diffc(rabs);
            gg = diffc(gabs);
            bb = diffc(babs);
    
            if (rabs === v) {
                h = bb - gg;
            } else if (gabs === v) {
                h = (1 / 3) + rr - bb;
            } else if (babs === v) {
                h = (2 / 3) + gg - rr;
            }
            if (h < 0) {
                h += 1;
            }else if (h > 1) {
                h -= 1;
            }
        }
        const hue = Math.round((h * 360)+300)%360-180;
        return `${hue}a${s}a${v}a1a1`;
    },
    compressToGDFormat:() => {
        let dataString = build.parsedObjs.join(';');
        dataString = build.remainingParsedData+dataString;
        let compressedData = zlib.gzipSync(Buffer.from(dataString)).toString("base64");
        compressedData = compressedData.replace(/\//g, "_");
        compressedData = compressedData.replace(/\+/g, "-");
        let complete = build.remainingData.replace("[[PARSEDCONTAINER]]",compressedData);
        gd.encode(complete);
    },
    getDifferences:(s0,s1) => {
        let diffs = 0;
        for(let i=0;i<s0.length;i++) {
            if(s0[i] != s1[i]) diffs++;
        }
        console.log(diffs)
    }
}


/*build.getDifferences(
    "H4sIAAAAAAAAC6WUb2-qMBTGv4rZeyYFyp9EWZALwlWmOJnTNwSBMRRQhGndp7-iLQu47M0lIeH5tT09PfQ5vSeUJp1jeCjiXdZ_AI_0w5Pc2ydxUTZpJ9pcdP-BuXzLvSD2S7m3lcdjy6VBr7u9oEq7caEcDldddroV2br09_BW1UZXFctcrxtfEXMFhVyGRXn5Lq4QYjhNvHN4IBSwjcgMwLEYEgvwmABCII0JCwkyb8sO8mXocCPMHWHvyC10UO3dvR3GBb-fDIgkmzodkW-nLApkGeAlhq-xiCsAaJocX5QaxwcSCV9NuS0TwD2T6HtGih6nXhR2qtKTTVg8Egw_9v55UL0fpjFLfNbukzkcnmNwhangR-UXtrPgVMtG2ph5sRG7UncZRIMIRqJPv06MczDUvVK39gvXQtwWpm_rIfe2tm02yHTTf3P2aKnRL36pi6eJONlvVvMTNIbByD_Os0_RTCJm-a5ALqZmJrL0bDVAWuAOZvlRtOdoQiMYh4bLjjwKaRvL2jh8YfjRgrYcBZle6AHXlpbaUHqPDIc658_T8o_qhK_l3zxN9N1XHvjha7QOSo06MrNc-VwPGW-djjfRM9LFSJ0F6pi3nQ_g8IEJdaVMnZ2OEFxYf9HKmxrS5qynEz8cISmX5u9ZsAOT3d6AMFEplAmD_PhsKTBSTory-y1nfyzv19QpvtRzGS2VZTT1s9Oywv3_sIZYW0OE9TS2GecH-3BCYwZHLjl75y9Kgo-AqTJr2azKru2zR6FmXDt3E2Ly7WHiGqo-DjFoJWhcQYjLA7DmsSbXn8WaXHpiNa41Tn4U6U881gLWAtYc1rV5AQYSASQhurUjAG3ANEDVcsiL2y7T_DXdW0_uXnu3_A8hsACc2AUAAA==",
    "H4sIAAAAAAAACqWUb2-qMBTGv4rZeyYFyp9EWZALwlWmOJnTNwSBMRRQhGndp7-iLQu47M0lIeH5tT09PfQ5vSeUJp1jeCjiXdZ_AI_0w5Pc2ydxUTZpJ9pcdP-BuXzLvSD2S7m3lcdjy6VBr7u9oEq7caEcDldddroV2br09_BW1UZXFctcrxtfEXMFhVyGRXn5Lq4QYjhNvHN4IBSwjcgMwLEYEgvwmABCII0JCwkyb8sO8mXocCPMHWHvyC10UO3dvR3GBb-fDIgkmzodkW-nLApkGeAlhq-xiCsAaJocX5QaxwcSCV9NuS0TwD2T6HtGih6nXhR2qtKTTVg8Egw_9v55UL0fpjFLfNbukzkcnmNwhangR80XtrPgVMtG2ph5sRG7UncZRIMIRqJPv06MczDUvVK39gvXQtwWpm_rIfe2tm02yHTTf3P2aKnRL36pi6eJONlvVvMTNIbByD_Os0_RTCJm-a5ALqZmJrL0bDVAWuAOZvlRtOdoQiMYh4bLjjwKaRvL2jh8YfjRgrYcBZle6AHXlpbaUHqPDIc658_T8o_qhK_l3zxN9N1XHvjha7QOSo06MrNc-VwPGW-djjfRM9LFSJ0F6pi3nQ_g8IEJdaVMnZ2OEFxYf9HKmxrS5qynEz8cISmX5u9ZsAOT3d6AMFEplAmD_PhsKTBSTory-y1nfyzv19QpvtRzGS2VZTT1s9Oywv3_sIZYW0OE9TS2GecH-3BCYwZHLjl75y9Kgo-AqTJr2azKru2zR6FmXDt3E2Ly7WHiGqo-DjFoJWhcQYjLA7DmsSbXn8WaXHpiNa41Tn4U6U881gLWAtYc1rV5AQYSASQhurUjAG3ANEDVcsiL2y7T_DXdW0_uXnu3_A_Sn8Kx2AUAAA=="

)*/



build.loadIntoLevel();
