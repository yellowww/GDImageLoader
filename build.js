const fs = require('fs');
const gd = require("./gd/encoding.js");
const zlib = require('zlib');
const main = require('./main.js');
const path = require('path');

//square: 1,211,2,x,3,y,6,rot,32,scale,21,1,41,1,43,HaSaVa1a1
//diamond: 1,211,2,x,3,y,6,(rot-45),32,(scale*0.69),41,1,43,HaSaVa1a1
//triangle: 1,693,2,x,3,y,6,rot,32,scale,41,1,43,HaSaVa1a1


let build = {
    remainingData:undefined,
    remainingParsedData:undefined,
    data:undefined,
    decodedLevel:undefined,
    parsedObjs:undefined,
    colorChannel:undefined,
    backup:(saveName,levelName,newLevel,stats,cb) => {
        let gdSave = path.join(process.env.HOME || process.env.USERPROFILE, "AppData\\Local\\GeometryDash\\CCLocalLevels.dat");

        let key = JSON.parse(fs.readFileSync(path.join(__dirname,"/cache/key.json")));

        const allSaves = fs.readdirSync(path.join(__dirname,"cache"));
        const orderedSaves = allSaves.sort((a,b)=>a.split('.')[0]-b.split('.')[0]);
        orderedSaves.pop();
        if(orderedSaves.length>14) {
            for(let i=0;i<orderedSaves.length-14;i++) {
                fs.unlinkSync(path.join(__dirname,"cache",orderedSaves[i]));
                delete key[orderedSaves[i].split('.')[0]];
            }
        }

        fs.readFile(gdSave, "utf-8", (err,data) => {
            if(err) {console.error("Could not cache backup, GD file not found.");return};
            const fileName = (new Date().getTime()-1652751057920);
            fs.writeFile(path.join(__dirname,"cache",fileName+".dat"), data, err=>{if(err)console.error(err)});

            key[fileName] = {
                timeCreated:new Date().getTime(),
                saveName:saveName,
                levelName:newLevel? "new level":levelName,
                stats:stats.toString()
            };
            fs.writeFileSync(path.join(__dirname,"/cache/key.json"),JSON.stringify(key));
            cb();
        })
    },
    loadBuildFile:(file,cb) => {
        fs.readFile(file, 'utf-8', (err,data) => {
            if(err) {console.error(err);return};
            build.data = JSON.parse(data);
          //  build.data = [[{x:0,y:0,size:0.5,color:[0,0,0], asset:"tri1.png"},{x:0,y:0,size:0.25,color:[255,0,0], asset:"square.png"},{x:0.5,y:0.25,size:0.5,color:[0,255,0], asset:"diamond.png"}]]
            //build.data[build.data.length-1].push({x:0,y:0,size:0.5,color:[0,0,0], asset:"tri1.png"});
            cb();
        });
    },
    loadIntoLevel:(save,newLevel,levelName, width,layer,densityOverride,cb) => {
        process.stdout.write(`\x1b[37m\x1b[1mLoading ${save}/ConstructFile.gdi...\x1b[0m`);

        build.loadBuildFile(`${save}/ConstructFile.gdi`, () => {
            process.stdout.write("\r\x1b[K");
            process.stdout.write(`\x1b[37m\x1b[1mLoading ${save}/ConstructFile.gdi\x1b[0m - Done!\n\n`);
            process.stdout.write("Decoding GD save file...");
            gd.decodeLevel((xml) => {
                process.stdout.write("\r\x1b[K");
                process.stdout.write("\x1b[1mDecoding GD save file\x1b[0m - Done!\n\n");
                process.stdout.write("\x1b[1mBacking up previous files\x1b[0m");
                let displayName = newLevel ? "Image To GD":levelName;
                build.backup(save,displayName,newLevel,fs.readFileSync(`${save}/Stats.json`),() => {
                    process.stdout.write("\r\x1b[K");
                    process.stdout.write("\x1b[1mBacking up previous files\x1b[0m - Done!\n\n");
                    const loadFailed = !build.getSingleLevel(levelName, xml,newLevel);
                    if(loadFailed) return;
                    build.getMaxHeight(width,(maxHeight,totalObjects) => {
                        const objectDensity = totalObjects/(width*maxHeight);
                        let targetDensity = false;
                        const densityMax = densityOverride?densityOverride:0.066-Math.sqrt(width/40)/100;
                        const densityMax1 = densityOverride?densityOverride-0.005:0.063-Math.sqrt(width/40)/100;
                        if(objectDensity>densityMax)    {
                            targetDensity = densityMax1;
                            process.stdout.write("\x1b[33m\x1b[1m[WARNING] \x1b[0m\x1b[33m- Object density too high, decreasing render resolution...\nTo get a better result, decrease the quality the image is processed at in the configurator, or increase the Image width.\x1b[0m\n\n");
                        }
                        
                        if(targetDensity) {
                            let remainingObjects = totalObjects;
                            for(let i=build.data.length-1;i>=0;i-=2) {
                                remainingObjects-=build.data[i].length;
                                build.data.splice(i,1);
                                if(remainingObjects/(width*maxHeight)<targetDensity) break;
                            }
                        }
                        let adjustedTotalObjects = 0;
                        for(let i=0;i<build.data.length;i++) {
                            //if(i==3334) console.log(build.data[i]);
                            for(let j=0;j<build.data[i].length;j++) {
                                adjustedTotalObjects++;
                                build.addBuildObject(build.data[i][j],width,maxHeight,i,layer);
                            }
                        }
                        
                        console.log("\x1b[1mSucsesfully added\x1b[0m\x1b[35m "+adjustedTotalObjects+"\x1b[0m\x1b[1m objects to \x1b[0m\x1b[35m'"+displayName+"'\x1b[1m\x1b[0m.\x1b[0m");
                        build.compressToGDFormat(); 
                        cb();                         
                    });
                });
            });
        });
    },
    getMaxHeight:(width,cb) => {
        let maxHeight = -Infinity,totalObjects = 0;
        for(let i=0;i<build.data.length;i++) {
            for(let j=0;j<build.data[i].length;j++) {
                totalObjects++;
                if((build.data[i][j].y)*width>maxHeight) maxHeight = (build.data[i][j].y)*width;
            }
        }
        cb(maxHeight,totalObjects);
    },
    addBuildObject:(thisObject, width,maxHeight,z,eLayer) => {

        const pxToGD = 30;        
        let scale = (thisObject.size*width/pxToGD)*1.5;
        thisObject.x+=thisObject.size/2;
        thisObject.y+=thisObject.size/2;
        const centerX = (thisObject.x)*width, centerY = (thisObject.y)*width;
        const adjX = centerX, adjY = (centerY*-1);
        let x = (adjX)+400, y = (adjY)+100+maxHeight,  color = thisObject.color;
        let name, rotation = 0;
        if(thisObject.asset == "square.png") name = "square";
        if(thisObject.asset == "diamond.png") name = "diamond";
        if(thisObject.asset == "tri1.png") {
            name = "tri";
            rotation = 270;
        }
        if(thisObject.asset == "tri2.png") {
            name = "tri";
            rotation = 180;
        }
        if(thisObject.asset == "tri3.png") {
            name = "tri";
            rotation = 90;
        }
        if(thisObject.asset == "tri4.png") {
            name = "tri";
            rotation = 0;
        } 
        build.addObj(name, x, y, scale, rotation, color,z,eLayer);
    },
    getSingleLevel:(level,data,newLevel) => {
        if(newLevel){
            let allKeys = data.split("<k>");
            allKeys = allKeys.map(e=>{return{name:e.split("</k>")[0],sIndex:data.indexOf(e)}});
            for(let i=0;i<allKeys.length;i++) {
                if(allKeys[i].name.includes("k_")) {
                    const newVal = "k_"+(Number(allKeys[i].name.split('k_')[1])+1);
                    data = build.setCharAt(data,allKeys[i].sIndex,newVal);
                }
            }
            const defaultData = fs.readFileSync(path.join(__dirname,"gd/defaultData/level.txt"), "utf-8");
            data = data.replace(
                "<k>LLM_01</k><d><k>_isArr</k><t />",
                "<k>LLM_01</k><d><k>_isArr</k><t />"+defaultData
            );
            build.remainingData = data;
            build.remainingParsedData = fs.readFileSync(path.join(__dirname,"gd/defaultData/parsedInfo.txt"), "utf-8")
            build.addColorChannel();
            build.parsedObjs = [];
        } else {
            let dataCpy = data.slice();
            let split = dataCpy.split("<k>k2</k>");
            let allNames = [];
            for(let i=1;i<split.length;i++) allNames.push({name:split[i].split("<s>")[1].split("</s>")[0],data:split[i]});
            if(!allNames.map(e=>e.name).includes(level)) {
                console.error(`Level '${level}' not found.`);
                main.closeMessage(1);
                return false;
            }
            dataCpy = build.cutAtChar(dataCpy, "<k>k2</k><s>"+level);
            if(build.getRemoved(dataCpy, "k4</k><s>").includes("<k>k2</k>")) { // has no object data tag.
                dataCpy = build.cutAtChar(dataCpy, "</s>");
                dataCpy = "<k>k4</k><s>H4sIAAAAAAAACqWQ0Q3CMAxEFwqSz3HSVHx1Bga4AboCwxPH8JfSIn7uEtv3ZHl_5JZAEyqhhZlaCoEwDYui8QZWQkS4EERxaRQ24gkOhOg1BP5HrFOEz0TgEkTp-RnIr_EByRmmHGLkl23qIUb7W4f2DOwMZHNIhkO69vlcv0PmBPM15MJJJvG0b8hJ3EpYDbPUNd5LVN7W3B55HT8dGoDR2GxodCFhSHJ_AblH157VAgAA</s><k>k5</k><s>Player</s><k>k34</k><s>H4sIAAAAAAAACzPUszCytgYAYgPcnwYAAAA=</s>"+dataCpy;
                data = build.getRemoved(data, "<k>k2</k><s>"+level+"</s>")+dataCpy;
            }

            dataCpy = build.cutAtChar(dataCpy, "k4</k><s>");
            dataCpy = build.cutToChar(dataCpy, "</s>");
            build.remainingData = data.replace(dataCpy,"[[PARSEDCONTAINER]]");            
            let decoded = Buffer.from(dataCpy,'base64');
            decoded = zlib.unzipSync(decoded).toString();
            build.remainingParsedData = build.cutToChar(decoded,"kA11,0;")+"kA11,0;";
            decoded = build.cutAtChar(decoded, "kA11,0;");
            const colorFail = !build.addColorChannel();
            if(colorFail) return false;
            build.parsedObjs = decoded.split(';');
        }
        return true;
    },
    setCharAt:(str,index,chr) => {
        if(index > str.length-1) return str;
        return str.substring(0,index) + chr + str.substring(index+chr.length);
    },
    addColorChannel:() => {
        let cut = build.cutAtChar(build.remainingParsedData, "kS38,");
        const before = build.cutToChar(build.remainingParsedData, cut);
        cut = build.cutToChar(cut, ",");
        let allChannels = cut.split('|');
        allChannels.pop();
        
        const after = build.cutAtChar(build.remainingParsedData, allChannels[allChannels.length-1]+"|");

        let allUsedChannels = [];
        for(let i=0;i<allChannels.length;i++) {
            let allKeys = allChannels[i].split("_");
            for(let j=0;j<allKeys.length;j+=2) {
                if(j>=allKeys.length) break;
                if(allKeys[j] == "6") allUsedChannels.push(allKeys[j+1]);
            }
        }
        let nextChannelId;
        for(let i=1;i<=allUsedChannels.length;i++) {
            if(!allUsedChannels.includes(i.toString())) {
                nextChannelId = i;
                break;
            }
        }
        if(nextChannelId >= 1000) {
            console.error("No avalible color channels.");
            main.closeMessage(1);
            return false;
        }
        process.stdout.write(`Image is using \x1b[36mcolor channel \x1b[1m${nextChannelId}\x1b[0m\n\n`)
        build.colorChannel = nextChannelId;
        allChannels.push(`1_255_2_255_3_255_11_254_12_254_13_254_4_-1_6_${nextChannelId}_7_1_15_1_18_0_8_1`);
        const compiled = before+allChannels.join("|")+"|"+after;
        build.remainingParsedData = compiled;
        return true;
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
    addObj:(type,_x,_y,_scale,_rot,rgb,z,layer) => {
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
        if(type=="tri") {id=693};
        scale = Math.round(scale*1000)/1000;
        build.parsedObjs.pop();
        //if(z==3334)console.log(x,y,(scale/2.3)/1000*30);
        build.parsedObjs.push(`1,${id},2,${x},3,${y},5,1,6,${rot},32,${scale},41,1,43,${hsv},25,${z},5,true,21,${build.colorChannel},20,${layer}`);
        build.parsedObjs.push('');
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
        const hue = Math.round((h * 360)+180)%360-180;
        return `${hue}a${Math.round((s)*100)/100}a${Math.round((v-1)*100)/100}a1a1`;
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


exports.loadConstruct = build.loadIntoLevel;
setTimeout(()=> {
    //build.loadIntoLevel("./saves/edwin1",false,"Image To GD",1000,1);
},50)
