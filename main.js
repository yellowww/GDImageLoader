const Jimp = require("jimp");
const { createCanvas } = require("canvas");
const fs = require("fs");
const router = require("./router.js");
let ctx,canvas;



let config = {
    imagePath:"./sourceImages/posniack1.png",
    newLevel:false,
    gdLevel:undefined,
    generateImageSave:true,
    saveLocation:"",
    res:[150,175],//horizontal: [200,250], vertical:[150,175],
    threshold:0.08,//0.075,
    incorperateThreshold:5,
    whiteThreshold:245,
    maxCallback:250,
    assetRes:100,
    overlapQuality:0.45, //0.9 defines the starting resolution of the solution, will be scaled if low object count is enabled
    passThreshold:0.55, //0.75 the threshold at which a solution will be disregarded if there is too much overlap
    lowObjectCount:true,
    protectWhites:true, // prevent artifacts in white colors (rgb>config.whiteThreshold) useful when removeing white
    whiteIsTransparency:true,
    cleanUpNonMerged:true, // true = replace single pixels with neighbors, false = create new group for every single pixel
}


const grouping = {
    groups:[],
    links:[],
    objs:[],
    bounded:[],
    finsishedPrimitives:[],
    relativePrimatives:[],
    totalPrimOverlap:0,
    initLinks:() => {
        const container = new Array(config.res[0]);
        for(let i=0;i<container.length;i++) {
            const nested = new Array(config.res[1]);
            nested.fill(-1);
            container[i] = nested;
        }
        grouping.links = container;
    },
    scalePrimitives:(amount) => {
        for(let i=0;i<grouping.finsishedPrimitives.length;i++) {
            for(let j=0;j<grouping.finsishedPrimitives[i].length;j++) {
                    let thisPrim = grouping.finsishedPrimitives[i][j];
                    thisPrim.x*=amount;
                    thisPrim.y*=amount;
                    thisPrim.size=amount*thisPrim.size;
            }
        }
    },
    removeWhitePrimitives:() => {
        for(let i=0;i<grouping.finsishedPrimitives.length;i++) {
            const thisPrimColor = grouping.finsishedPrimitives[i][0].color;
            if(thisPrimColor[0]>config.whiteThreshold && thisPrimColor[1]>config.whiteThreshold && thisPrimColor[2]>config.whiteThreshold) {
                grouping.finsishedPrimitives.splice(i,1);
                i--;
            }
        }
    },
    countPrims:() => {
        let count = 0;
        for(let i=0;i<grouping.finsishedPrimitives.length;i++) {
            count+=grouping.finsishedPrimitives[i].length;
        }
        return count;
    },
    countPixels:(group) => {
        let count = 0;
        for(let i=0;i<group.binary.length;i++) {
            for(let j=0;j<group.binary[i].length;j++) {
                if(group.binary[i][j]) count++;
            }
        }
        return count;
    },
    createRelativePrims:() => {
        let relativePrims = [];
        for(let i=0;i<grouping.finsishedPrimitives.length;i++) {
            let thisRelColumn = [];
            for(let j=0;j<grouping.finsishedPrimitives[i].length;j++) {
                const thisPrim = grouping.finsishedPrimitives[i][j];
                const newPrim = {
                    x:thisPrim.x/config.res[0],
                    y:thisPrim.y/config.res[0],
                    size:thisPrim.size*(config.res[0]/100),
                    color:thisPrim.color,
                    name:thisPrim.name
                }
                thisRelColumn.push(newPrim);
            }
            relativePrims.push(thisRelColumn);
        }
        return relativePrims;
    },
    setTotalPrimOverlap:() => {
        for(let i=0;i<grouping.finsishedPrimitives.length;i++) {
            grouping.totalPrimOverlap +=grouping.finsishedPrimitives[i].totalOverlap;
        }
    }
}

let workingData;
let originalData;

const thread = {
    currentObjects:0,
    currentPixelsScanned:0,
    currentGroupIndex:0,
    vectorizeTime:undefined,
    loadAndInit:(localConfig) => {
        config = localConfig;
        canvas = createCanvas(config.res[0],config.res[1]);
        ctx = canvas.getContext('2d');   
        thread.start();
    },
    start:() => {
        if(fs.existsSync(config.saveLocation)) {
            console.log(`\x1b[33m\x1b[1m[WARNING]\x1b[0m\x1b[33m filepath \x1b[34m${config.saveLocation}\x1b[33m already exists`);
            console.log("Program will proceed to overwrite save files in this location.\x1b[0m\n");
        } else {
            process.stdout.write("\x1b[1mBuilt save directory\x1b[0m\n\n");
            fs.mkdirSync(config.saveLocation);
        }            
        thread.mainThread();
    },
    doSolutionIteration:(i) => {
        thread.currentGroupIndex = i;
        if(i>=grouping.bounded.length) {
            thread.vectorizeTime = new Date().getTime()-thread.solveStartTime;
            terminal.logVectorFinish();
            grouping.setTotalPrimOverlap();
            grouping.finsishedPrimitives.sort((a,b) => b.totalOverlap-a.totalOverlap);
            grouping.finsishedPrimitives = grouping.finsishedPrimitives.map(e=>e.solutions);
            if(config.whiteIsTransparency)grouping.removeWhitePrimitives();
            setTimeout(() => {
                process.stdout.write("\x1b[36m\x1b[1m[TOTAL OBJECTS] \x1b[0m\x1b[36m- "+grouping.countPrims()+"\n");
                const relativePrims = grouping.createRelativePrims();
                grouping.relativePrimatives = relativePrims;
                if(config.generateImageSave) {
                    rendering.saveData(config.saveLocation+"/Comp.png");
                    rendering.savePrimitiveSet(grouping.finsishedPrimitives, config.saveLocation+"/PrimSet.png");
                    rendering.saveStandardRender(grouping.countPrims(),config.saveLocation+"/Standard.png");
                }
                rendering.saveStatsFile(config.saveLocation+"/Stats.json")    
                rendering.saveGDIFile(config.saveLocation+"/ConstructFile.gdi");   
                return;                
            },200);

        } else {                
            solutions.solveWholeGroup(grouping.bounded[i], (primitives) => {
                grouping.finsishedPrimitives.push(primitives);
                setTimeout(()=>thread.doSolutionIteration(i+1),3); 
            });
        }
    },
    mainThread:() => {
        process.stdout.write("\x1b[1mLoading image...\x1b[0m\n");
        Jimp.read(config.imagePath, function (err, image) {
            if(err) {process.stdout.write("[IMAGE_LOAD_ERROR] "+err+"\n");return;}
            process.stdout.write("\033[F\r\x1b[K");
            process.stdout.write("\x1b[1mLoading image\x1b[0m - Done!\n");   
            image.resize(config.res[0],config.res[1]);
            workingData=[];
            for(let x=0;x<config.res[0];x++) {
                let thisColumn = [];
                for(let y=0;y<config.res[1];y++) {
                    const thisColor = Jimp.intToRGBA(image.getPixelColor(x, y));
                    thisColumn.push([thisColor.r,thisColor.g,thisColor.b]);
                }
                workingData.push(thisColumn);
            }    
            originalData = workingData.slice();
            process.stdout.write("\x1b[1mLoading assets...\x1b[0m\n");
            assets.loadAssets(() => {
                process.stdout.write("\033[F\r\x1b[K");
                process.stdout.write("\x1b[1mLoading assets\x1b[0m - Done!\n\n");   
                grouping.initLinks();
                compress.init(0,(compressed) => {
                    workingData = compressed;
                    compress.init(1,(compressed) => {
                        workingData = compressed;
                        compress.fillInMissingGroups();
                        compress.convertToGroupObjs(() => {
                            compress.incorperateSmallerGroups();
                            compress.convertToBoundedGroups();
                            grouping.finsishedPrimitives = [];
                            process.stdout.write("\n\n\n\n");
                            thread.solveStartTime = new Date().getTime();
                            thread.doSolutionIteration(0);   
                        });             
                    });
                });        
            });
        });
    }
}

const compress = {
    init: (passType,cb) => {// passType 1=horizontal 0=vertical
        process.stdout.write("\x1b[1mcompresing colors...\x1b[0m pass "+(passType+1)+"/2\n");
        let newWorkingData = workingData.slice();
        for(let i=0;i<newWorkingData.length;i++) {
            for(let j=0;j<newWorkingData[i].length;j++) {
                const adjColor = compress.getAdjColors(config.threshold,i,j,passType);
                if(adjColor != false) {
                    if(workingData[i][j][0] > config.whiteThreshold && workingData[i][j][1] > config.whiteThreshold && workingData[i][j][2] >config.whiteThreshold) compress.percentWhites++;
                    if(grouping.links[adjColor[0]][adjColor[1]] == -1) {
                        grouping.links[adjColor[0]][adjColor[1]] = grouping.groups.length;
                        grouping.groups.push(newWorkingData[adjColor[0]][adjColor[1]]);
                    }
                    grouping.links[i][j] = grouping.links[adjColor[0]][adjColor[1]];
                    newWorkingData[i][j] = workingData[adjColor[0]][adjColor[1]];
                }
            }
        }
        cb(newWorkingData);
    },
    getAdjColors:(threshold,x,y, passType) => {
        const thisColor = workingData[x][y];
        let adjColors = [];
        if(x>0) {
            const checkColor = workingData[x-1][y];
            const score = compress.getColorDist(thisColor, checkColor)
            if(score>1-threshold) adjColors.push({pixel:[x-1,y],score:score});
        }
        if(y>0) {
            const checkColor = workingData[x][y-1];
            const score = compress.getColorDist(thisColor, checkColor);
            if(score>1-threshold) adjColors.push({pixel:[x,y-1],score:score});
        }
        if(x<config.res[0]-1) {
            const checkColor = workingData[x+1][y];
            const score = compress.getColorDist(thisColor, checkColor);
            if(score>1-threshold) adjColors.push({pixel:[x+1,y],score:score});
        }
        if(y<config.res[1]-1) {
            const checkColor = workingData[x][y+1];
            const score = compress.getColorDist(thisColor, checkColor);
            if(score>1-threshold) adjColors.push({pixel:[x,y+1],score:score});
        }
        if(adjColors.length == 0)return false;
        if(workingData[x][y][0] > config.whiteThreshold && workingData[x][y][1] > config.whiteThreshold && workingData[x][y][2] >config.whiteThreshold && config.protectWhites) {
            for(let i=0;i<adjColors.length;i++) {
                const thisAdj = adjColors[i].pixel;
                if(workingData[thisAdj[0]][thisAdj[1]][0] > config.whiteThreshold && 
                    workingData[thisAdj[0]][thisAdj[1]][1] > config.whiteThreshold && 
                    workingData[thisAdj[0]][thisAdj[1]][2] >config.whiteThreshold) return adjColors[i].pixel;

            }
        }
        if(passType || adjColors.length == 1) {
            return adjColors[0].pixel;
            
        } else {
            return adjColors[1].pixel;
        }
    },
    getColorDist:(c0,c1) => {
        for(let i=0;i<c0.length;i++) if(c0[i]<1)c0[i]=1;
        for(let i=0;i<c1.length;i++) if(c1[i]<1)c1[i]=1;

        let rDist = c0[0]/c1[0];
        if(rDist>1)rDist = 1/rDist;
        let gDist = c0[1]/c1[1];
        if(gDist>1)gDist = 1/gDist;
        let bDist = c0[2]/c1[2];
        if(bDist>1)bDist = 1/bDist;

        return (rDist+gDist+bDist)/3;
    },
    fillInMissingGroups:() => {
        process.stdout.write("\n\x1b[1mRepairing missing data\x1b[0m - Done!\n");
        if(config.cleanUpNonMerged) {
            for(let i=0;i<grouping.links.length;i++) {
                for(let j=0;j<grouping.links[i].length;j++) {
                    
                    if(grouping.links[i][j] == -1) {
                        let stop = false;
                        let l=j;
                        for(let k=i;!stop;k++) {
                            if(k>=config.res[0]){l++;k--;};
                            stop = grouping.links[k][l]!=-1;
                            grouping.links[i][j] = grouping.links[k][l];
                        }
                    }
                }
            } 
        } else {
            for(let i=0;i<grouping.links.length;i++) {
                for(let j=0;j<grouping.links[i].length;j++) {
                    if(grouping.links[i][j] == -1) {
                        grouping.links[i][j] = grouping.groups.length;
                        grouping.groups.push(workingData[i][j]);
                    }
                }
            }            
        }
        process.stdout.write("\033[F\r\x1b[K");
        process.stdout.write("\x1b[1mRepairing missing data\x1b[0m - Done!\n");
    },
    convertToGroupObjs:(cb) => {
        process.stdout.write("\n\n\n");
        grouping.objs = [];
        for(let i=0;i<grouping.groups.length;i++) {
            const percent = Math.round((i/grouping.groups.length)*100)
            if(i%400 == 0)  {
                process.stdout.write("\r\x1b[K");
                process.stdout.write("\033[F\r\x1b[K");
                process.stdout.write("\033[F\r\x1b[K");
                process.stdout.write(
                    "\x1b[1m\x1b[4mconverting data into group objects...\x1b[0m\n"+
                    terminal.createProgressBar(i/grouping.groups.length,30)+" "+percent+
                    "%\n");
            }
            const color = grouping.groups[i];
            const refs = compress.findAllRefs(i);
            if(refs.length>0) {
               grouping.objs.push({color:color,pixels:refs}); 
            }
        }
        process.stdout.write("\r\x1b[K");
        process.stdout.write("\033[F\r\x1b[K");
        process.stdout.write("\033[F\r\x1b[K");
        process.stdout.write(
            "\x1b[1m\x1b[4mconverting data into group objects...\x1b[0m\n"+
            terminal.createProgressBar(1,30)+
            " Done!\n\n");
        cb();
    },
    findAllRefs:(index) => {
        let allRefs = [];
        for(let i=0;i<grouping.links.length;i++) {
            for(let j=0;j<grouping.links[i].length;j++) {
                if(grouping.links[i][j] == index) allRefs.push([i,j]);
            }
        }
        return allRefs;
    },
    incorperateSmallerGroups:() => {
        process.stdout.write("\x1b[1mMerging smaller groups...\x1b[0m\n");
        for(let i=0;i<grouping.objs.length;i++) {
            if(grouping.objs[i].pixels.length<config.incorperateThreshold) {
                const thisPixel = grouping.objs[i].pixels[0];
                const closestGroupI = compress.findNearestGroup(thisPixel[0],thisPixel[1]);
                grouping.objs[closestGroupI].pixels = grouping.objs[closestGroupI].pixels.concat(grouping.objs[i].pixels);
                grouping.objs.splice(i,1);
                i--;
            }
        }
        process.stdout.write("\033[F\r\x1b[K");
        process.stdout.write("\x1b[1mMerging smaller groups\x1b[0m - Done!\n");
    },
    findNearestGroup:(x,y) => {
        let min = Infinity,minI=-1;
        for(let i=0;i<grouping.objs.length;i++) {
            const thisPixel = grouping.objs[i].pixels[0];
            const dist = Math.sqrt(Math.pow(thisPixel[0]-x,2)+Math.pow(thisPixel[1]-y,2));
            if(dist<min && grouping.objs[i].pixels.length>config.incorperateThreshold) {
                min=dist;
                minI = i;
            }
        }
        return minI;
    },
    convertToBoundedGroups:() => {
        process.stdout.write("\x1b[1mBinding objects to binary map...\x1b[0m\n");
        for(let i=0;i<grouping.objs.length;i++) {
            const thisGroup = grouping.objs[i].pixels;
            const xMap = thisGroup.map(e=>e[0]), yMap = thisGroup.map(e=>e[1]), stringMap = thisGroup.map(e=>e[0]+","+e[1]);
            const maxX = Math.max(...xMap), minX = Math.min(...xMap), maxY = Math.max(...yMap), minY = Math.min(...yMap);

            let binaryMap = [];
            for(let i=minX;i<=maxX;i++) {
                let binaryColumn = []
                for(let j=minY;j<=maxY;j++) {
                    const thisStringEntry = i+","+j;
                    binaryColumn.push(stringMap.includes(thisStringEntry));
                }
                binaryMap.push(binaryColumn);
            }
            const thisBounded = {
                minX:minX,
                maxX:maxX,
                minY:minY,
                maxY:maxY,
                binary:binaryMap,
                color:grouping.objs[i].color
            };
            grouping.bounded.push(thisBounded);
        }
        process.stdout.write("\033[F\r\x1b[K");
        process.stdout.write("\x1b[1mBinding objects to binary map\x1b[0m - Done!\n");
    }
}


let rendering = {
    saveData: (output) => {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        process.stdout.write("\x1b[35m\x1b[1m[FILE SAVE] \x1b[0m\x1b[35mSaved compressed image to \x1b[34m"+output+"\x1b[0m\n");
        for(let x=0;x<workingData.length;x++) {
            for(let y=0;y<workingData[x].length;y++) {
                const thisColor = workingData[x][y];
                ctx.fillStyle = `rgb(${thisColor[0]},${thisColor[1]},${thisColor[2]})`;
                ctx.fillRect(x,y,1,1);
            }
        }
        const cBuff = canvas.toBuffer('image/png');
        fs.writeFileSync(output, cBuff,(err)=>{if(err)console.error(err)});
    },
    saveGroupData: (output) => {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        process.stdout.write("\x1b[35m\x1b[1m[FILE SAVE] \x1b[0m\x1b[35mSaved grouped data to \x1b[34m"+output+"\x1b[0m\n");
        for(let i=0;i<grouping.objs.length;i++) {
            const groupData = grouping.objs[i];
            for(let j=0;j<groupData.pixels.length;j++) {
                const x = groupData.pixels[j][0], y = groupData.pixels[j][1];
                const thisColor = groupData.color;
                ctx.fillStyle = `rgb(${thisColor[0]},${thisColor[1]},${thisColor[2]})`;
                ctx.fillRect(x,y,1,1);
            }
        }

        const cBuff = canvas.toBuffer('image/png');
        fs.writeFileSync(output, cBuff,(err)=>{if(err)console.error(err)});
    },
    saveAssetData: (asset, output) => {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        process.stdout.write("\x1b[35m\x1b[1m[FILE SAVE] \x1b[0m\x1b[35mSaved asset data to \x1b[34m"+output+"\x1b[0m\n");
        for(let i=0;i<asset.data.length;i++) {
            for(let j=0;j<asset.data.length;j++) {
                let thisColor;
                if(asset.data[i][j]) {
                    thisColor = [0,0,0];
                } else {
                    thisColor = [255,255,255];
                }
                ctx.fillStyle = `rgb(${thisColor[0]},${thisColor[1]},${thisColor[2]})`;
                ctx.fillRect(i,j,1,1);
            }
        }

        const cBuff = canvas.toBuffer('image/png');
        fs.writeFileSync(output, cBuff,(err)=>{if(err)console.error(err)});   
    },
    saveBinaryTexture: (binary, output) => {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        process.stdout.write("\x1b[35m\x1b[1m[FILE SAVE] \x1b[0m\x1b[35mSaved texture binary to "+output+"\x1b[0m\n");
        for(let i=0;i<binary.length;i++) {
            for(let j=0;j<binary[i].length;j++) {
                let thisColor;
                if(binary[i][j]) {
                    thisColor = [0,0,0];
                } else {
                    thisColor = [255,255,255];
                }
                ctx.fillStyle = `rgb(${thisColor[0]},${thisColor[1]},${thisColor[2]})`;
                ctx.fillRect(i,j,1,1);
            }
        }

        const cBuff = canvas.toBuffer('image/png');
        fs.writeFileSync(output, cBuff,(err)=>{if(err)console.error(err)});  
    },
    saveSolution: (solution, output) => {
        process.stdout.write("\x1b[35m\x1b[1m[FILE SAVE] \x1b[0m\x1b[35mSaved solution to \x1b[34m"+output+"\x1b[0m\n");
        ctx.clearRect(0,0,canvas.width,canvas.height);
        for(let i=0;i<solution.length;i++) {
            for(let j=0;j<solution[i].length;j++) {
                let thisColor;
                if(solution[i][j] == 0) {
                    thisColor = [255,255,255];
                } else if (solution[i][j] == 1) {
                    thisColor = [255,0,0];
                } else if(solution[i][j] == 2) {
                    thisColor = [0,0,255];
                } else if(solution[i][j] == 3) {
                    thisColor = [0,0,0];
                }
                ctx.fillStyle = `rgb(${thisColor[0]},${thisColor[1]},${thisColor[2]})`;
                ctx.fillRect(i,j,1,1);
            }
        }

        const cBuff = canvas.toBuffer('image/png');
        fs.writeFileSync(output, cBuff,(err)=>{if(err)console.error(err)});  
    },
    renderSingleSolution:(solution) => {
        const scaled = solutions.scaleSolution(solution);
        for(let i=0;i<scaled.asset.length;i++) {
            for(let j=0;j<scaled.asset[0].length;j++) {
                if(scaled.asset[i][j]) {
                    const x = Math.round(solution.x+i), y=Math.round(solution.y+j);
                    ctx.fillStyle = `rgba(${solution.color[0]},${solution.color[1]},${solution.color[2]},1)`;
                    let renderSize = solution.size;
                    if(renderSize<1) renderSize=1;
                    ctx.fillRect(x,y,Math.round(1/renderSize),Math.round(1/renderSize));                    
                }
            }
        }
    },
    renderPrimitiveGroup:(group) => {
        for(let i=0;i<group.length;i++) {
            rendering.renderSingleSolution(group[i]);
        }
    },
    savePrimitiveSet:(set, output) => {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        process.stdout.write("\x1b[35m\x1b[1m[FILE SAVE] \x1b[0m\x1b[35mSaved primitive set to \x1b[34m"+output+"\x1b[0m\n");
        for(let i=0;i<set.length;i++) {
            rendering.renderPrimitiveGroup(set[i]);
        }
        const cBuff = canvas.toBuffer('image/png');
        fs.writeFileSync(output, cBuff,(err)=>{if(err)console.error(err)});  
    },
    saveStandardRender:(pixels,output) => {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        process.stdout.write("\x1b[35m\x1b[1m[FILE SAVE] \x1b[0m\x1b[35mSaved standard render to \x1b[34m"+output+"\x1b[0m\n");
        const aspect = config.res[0]/config.res[1];
        const w = Math.round(aspect*Math.sqrt(pixels));
        const h = Math.round((1/aspect)*Math.sqrt(pixels));
        if(w>config.res[0] || h>config.res[1]) {
            process.stdout.write("\x1b[31m\x1b[1m[WARNING] \x1b[0m\x1b[31mCould not construct standard render\x1b[0m\n");
            return;
        }
        for(let i=0;i<w;i++) {
            for(let j=0;j<h;j++) {
                const sX = config.res[0]/w, sY = config.res[1]/h;
                const x=i*sX, y=j*sY;
                const col = originalData[Math.round(x)][Math.round(y)];
                ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},1)`;
                ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(sX),Math.ceil(sY));                    
            }
        }
        const cBuff = canvas.toBuffer('image/png');
        fs.writeFileSync(output, cBuff,(err)=>{if(err)console.error(err)});  
    },
    saveGDIFile:(output) => {
        process.stdout.write("\x1b[35m\x1b[1m[FILE SAVE] \x1b[0m\x1b[35mSaved gdi build file to \x1b[34m"+output+"\x1b[0m\n");
        let compiledOutput = [];
        for(let i=0;i<grouping.relativePrimatives.length;i++) {
            const outputData = grouping.relativePrimatives[i].map(e=>{return {
                    x:e.x,
                    y:e.y,
                    size:e.size,
                    asset:e.name,
                    color:e.color,
                }
            });
            compiledOutput.push(outputData);        
        }
        fs.writeFile(output, JSON.stringify(compiledOutput),(err)=>{if(err)console.error(err)});
    },
    saveStatsFile:(output) => {
        process.stdout.write("\x1b[35m\x1b[1m[FILE SAVE] \x1b[0m\x1b[35mSaved build stats to \x1b[34m"+output+"\x1b[0m\n");
        const stats = {
            config:config,
            totalObjects:grouping.countPrims(),
            totalOverlap:grouping.totalPrimOverlap,
            allAssets:assets.assetData.map(e=>e.name),
            vectorizeTime:thread.vectorizeTime
        }
        fs.writeFile(output, JSON.stringify(stats),(err)=>{if(err)console.error(err)});
    }
}





let terminal = {
    createProgressBar:(progress,width) => {
        let string = "\x1b[1m[\x1b[36m\x1b[46m";
        for(let i=0;i<width;i++) {
            if(i<progress*width) {
            } else {
                if(i-1<progress*width) string+="\x1b[0m\x1b[2m"
            }                
            string+=" ";
        }
        string+="\x1b[0m\x1b[1m]\x1b[0m";
        return string;
    },
    formatTime:(ms) => {
        const secconds = Math.ceil(ms/1000)%60;
        if(secconds.length == 1) secconds = "0"+secconds;
        const minutes = Math.floor(ms/60000);
        return minutes+": "+secconds;
    },
    logVectorStats:() => {
        let percent = (Math.round(thread.currentGroupIndex/grouping.bounded.length*1000)/10).toString(), pixelPercent = (Math.round(thread.currentPixelsScanned/(config.res[0]*config.res[1])*1000)/10).toString();
        if(percent.length < 3) percent +=".0";
        if(pixelPercent.length < 3) pixelPercent +=".0";
        const timeTaken = new Date().getTime()-thread.solveStartTime
        const formattedTime = terminal.formatTime(timeTaken);
        const exactPixelPercent = thread.currentPixelsScanned/(config.res[0]*config.res[1]);
        const timePerPercent = timeTaken/exactPixelPercent;
        const estimatedTime = (1-exactPixelPercent)*timePerPercent;

        const currentObjects = thread.currentObjects;
        const totalObjects = Math.round(currentObjects/exactPixelPercent);
        process.stdout.write("\r\x1b[K");
        process.stdout.write("\033[F\r\x1b[K");
        process.stdout.write("\033[F\r\x1b[K");
        process.stdout.write("\033[F\r\x1b[K");

        process.stdout.write(
            "\x1b[1m\x1b[4mVectorizing Image...\x1b[0m   Working Time:  "+formattedTime+
            "   Estimated Time remaining: "+terminal.formatTime(estimatedTime)+
            "  |  Current objects: "+ currentObjects+"   Estimated total objects: "+totalObjects+"\n"+
            terminal.createProgressBar(thread.currentGroupIndex/grouping.bounded.length,50)+" "+percent+
            "% of "+grouping.bounded.length+" groups solved\n"+
            terminal.createProgressBar(thread.currentPixelsScanned/(config.res[0]*config.res[1]),50)+" "+pixelPercent+
            "% of "+(config.res[0]*config.res[1])+" pixels solved\n"
            );
    },
    logVectorFinish:() => {
        process.stdout.write("\r\x1b[K");
        process.stdout.write("\033[F\r\x1b[K");
        process.stdout.write("\033[F\r\x1b[K");
        process.stdout.write("\033[F\r\x1b[K");
        process.stdout.write("\x1b[1m\x1b[4mVectorizing Image...\x1b[0m - Done!\n");
    }
}


let assets = {
    assetData: [],
    loadAssets: (cb)=> {
        assets.getAllFilesInDir("./assets", (fileNames) => {
            let recordedAssets = 0;
            for(let i=0;i<fileNames.length;i++) {
                assets.loadSingleAsset(fileNames[i], (assetData) => {
                    assets.assetData.push(assetData);
                    recordedAssets++;
                    if(recordedAssets == fileNames.length) cb();
                });
            }
        });
    },
    loadSingleAsset:(asset,cb) => {
        Jimp.read('./assets/'+asset,(err,image) => {
            if(err) {process.stdout.write("ASSET READ ERROR: "+err);return;}
            image.resize(300,300);
            let thisImage = [];
            for(let x=0;x<300;x+=300/config.assetRes) {
                let thisImageCollumn = [];
                for(let y=0;y<300;y+=300/config.assetRes) {
                    const thisColor = Jimp.intToRGBA(image.getPixelColor(x, y));
                    thisImageCollumn.push(thisColor.a>50);
                }
                thisImage.push(thisImageCollumn);
            }
            cb({data:thisImage,name:asset});
        });
    },
    getAllFilesInDir:(dir,cb) => {
        fs.readdir(dir, (err, files) => {
            if(err) {process.stdout.write("ASSET DIRECTORY ERROR: "+err);return;}
            cb(files);
        });
    }
}

let solutions = {
    allSolutions:[],
    currentIteration:0,
    divFactor:0.5,
    thisSolution:undefined,
    currentGroupSolutions:[],
    solveWholeGroup: (group,cb) => {
        solutions.currentGroupSolutions = [];
        let lastTime = 0;
        let groupCopy = {minX:group.mixX,maxX:group.maxX,minY:group.minY,maxY:group.maxY,color:group.color,binary:group.binary.slice()};
        let totalOverlap = 0;
        for(let i=0;i<1000;i++) {
            const inclusions = solutions.getInclusions(groupCopy);
            if(inclusions == 0) break;
            solutions.thisSolution = {x:0,y:0,size:0.05,asset:assets.assetData[5].data};
            solutions.currentIteration = 0;
            solutions.divFactor = 0.5;
            const solution = solutions.tryAllAssets(groupCopy);
            solution.res.color = group.color;
            solutions.cutFromGroup(groupCopy,solution.res);
            totalOverlap += solution.overflow;

            solutions.currentGroupSolutions.push(solution.res);
            thread.currentPixelsScanned+=inclusions-solutions.getInclusions(groupCopy);
            thread.currentObjects++;
            if(lastTime>1000) {
                terminal.logVectorStats();
            }
            lastTime = new Date().getTime();
        }
        for(let i=0;i<solutions.currentGroupSolutions.length;i++) {
            solutions.currentGroupSolutions[i].x+=group.minX;
            solutions.currentGroupSolutions[i].y+=group.minY;
        }
        cb({solutions:solutions.currentGroupSolutions,totalOverlap:totalOverlap});

    },
    tryAllAssets:(group,pass,scoreMin,quality,lastScore,lastOverflow,callStack) => {
        if(callStack == undefined) callStack=0;
        if(pass == undefined) pass=0;
        if(scoreMin == undefined) scoreMin = config.passThreshold;
        if(quality == undefined) quality = config.overlapQuality;
        if(lastScore == undefined) lastScore = -Infinity;
        if(lastOverflow == undefined) lastOverflow = Infinity;
        const totalPixels = solutions.getInclusions(group);
        const totalArea = group.binary.length*group.binary[0].length;
        const totalEmptySpace = totalArea-totalPixels;
        if(pass>=totalPixels) pass=0;
        const startPos = solutions.getNthColition(group,pass);
        const subGroupSize = solutions.getSubGroupSize(group,startPos.x,startPos.y)*2;
        const maxDim = Math.max(config.res[0],config.res[1]);
        let startSize = subGroupSize/(maxDim/1.042)*((1-quality)*0.56)//0.085;
        if(startSize>1) startSize=1;
        let bestResultScore = -Infinity, bestResult, scores = {overlap:Infinity};
        for(let i=0;i<assets.assetData.length;i++) {
            
            solutions.thisSolution = {x:startPos.x,y:startPos.y,size:startSize,asset:assets.assetData[i].data};
            solutions.currentIteration = 0;
            solutions.divFactor = 0.5;
            const result = solutions.solveGroup(group);
            result.name = assets.assetData[i].name;
            const score = solutions.gradeSolution(group,result);
            if(score.overlap == 0) score.overlap = 1;
            let finalScore = score.score-(score.overlap*1)+10000;
            if(score.score == 0) finalScore = -Infinity;
            if(finalScore>bestResultScore) {bestResult = {res:result,overflow:score.overlap};scores={score:score.score,overlap:score.overlap};bestResultScore=finalScore};
            
        }
        if(callStack>=config.maxCallback) return bestResult;
        if(bestResult == undefined) return solutions.tryAllAssets(group,pass+5,scoreMin,quality,lastScore,scores.overlap,callStack+1);
        if(bestResultScore>lastScore*2 && config.lowObjectCount) {
            const nestedRes = solutions.tryAllAssets(group,pass+5,scoreMin,quality*0.75,bestResultScore,scores.overlap,callStack+1)
            if(nestedRes.overflow<scores.overlap*1.25)return nestedRes;
        }
        if(scores.overlap/totalEmptySpace>1-scoreMin && config.lowObjectCount) return solutions.tryAllAssets(group,pass+5,scoreMin/1.2,quality,lastScore,scores.overlap,callStack+1);
        return bestResult;
    },
    solveGroup:(group) => {
        let forceExit = false,lastScore=0;
        while(solutions.divFactor>0.04 && !forceExit && solutions.currentIteration<150) {
            const adjGrades = solutions.getAdjGrades(solutions.thisSolution,group,solutions.divFactor);
            let xMovement = 0,yMovement=0;
            if(isNaN(adjGrades.control)) adjGrades.control = 0;
            solutions.divFactor = (1-adjGrades.control)/2;
            let rMove = Math.round(adjGrades.right*(adjGrades.width/4));
            if(adjGrades.right>0.01 && rMove == 0) rMove = 1;
            solutions.thisSolution.x+=rMove;
            xMovement+=rMove;
            let lMove = Math.round(adjGrades.left*(adjGrades.width/4));
            if(adjGrades.left>0.01 && lMove == 0) lMove = 1;
            solutions.thisSolution.x-=lMove;
            xMovement-=lMove;

            let tMove = Math.round(adjGrades.top*(adjGrades.height/4));
            if(adjGrades.top>0.01 && tMove == 0) tMove = 1;
            solutions.thisSolution.y-=tMove;
            yMovement-=tMove;
            let bMove = Math.round(adjGrades.bottom*(adjGrades.height/4));
            if(adjGrades.bottom>0.01 && bMove == 0) bMove = 1;
            solutions.thisSolution.y+=bMove;
            yMovement+=bMove;


            const totalMove = Math.sqrt(Math.pow(xMovement,2)+Math.pow(yMovement,2));
            if(solutions.currentIteration%10 == 0) {
                if(Math.abs(lastScore-solutions.divFactor)<0.1) forceExit=true;
                else lastScore=solutions.divFactor;
            }
            if(totalMove<0.3) {
                if(adjGrades.overflow>adjGrades.scaleScore) {
                    solutions.thisSolution.size/=(solutions.divFactor*1)+1
                } else solutions.thisSolution.size*=(solutions.divFactor*1.1)+1;
            }
            if(solutions.thisSolution.size>1)solutions.thisSolution.size=1;

            solutions.currentIteration++;
        }
        return solutions.thisSolution;
    },
    getAdjGrades:(solution,group,divFactor) => {
        const maxArea = solutions.getMaxSolutionArea(solution,group);
        let solutionCopy = {x:solution.x,y:solution.y,size:solution.size,asset:solution.asset};
        const control = solutions.gradeSolution(group,solutionCopy);
        const w = control.bounds.maxX-control.bounds.minX,h=control.bounds.maxY-control.bounds.minY;
        
        solutionCopy.size*=1+divFactor;
        const large = solutions.gradeSolution(group,solutionCopy);
        solutionCopy.size=solution.size;
        solutionCopy.size/=divFactor+1;
        const small = solutions.gradeSolution(group,solutionCopy);
        solutionCopy.size=solution.size;

        solutionCopy.x+= Math.round(w*divFactor);
        const right = solutions.gradeSolution(group,solutionCopy);
        solutionCopy.x-= Math.round(w*divFactor*2);
        const left = solutions.gradeSolution(group,solutionCopy);

        solutionCopy.x=solution.x;
        solutionCopy.y+= Math.round(h*divFactor);
        const bottom = solutions.gradeSolution(group,solutionCopy);
        solutionCopy.y-= Math.round(h*divFactor*2);
        const top = solutions.gradeSolution(group,solutionCopy);
        let rTop = top.score-control.score,rBottom = bottom.score-control.score,rLeft = left.score-control.score,rRight = right.score-control.score,rLarge = large.score/control.score,rSmall=control.overlap/small.overlap;
        if(rTop<0)rTop=0;
        if(rBottom<0)rBottom=0;
        if(rLeft<0)rLeft=0;
        if(rRight<0)rRight=0;

        return {
            scaleScore:rLarge,
            overflow:rSmall,
            top:rTop/maxArea,
            bottom:rBottom/maxArea,
            left:rLeft/maxArea,
            right:rRight/maxArea,
            width:w,
            height:h,
            control:control.score/maxArea,
            absoluteScore:control.score
        }
    },
    getMaxSolutionArea:(solution,group) => {
        let groupArea  = 0;
        for(let i=0;i<group.binary.length;i++) {
            for(let j=0;j<group.binary[i].length;j++) {
                if(group.binary[i][j]) groupArea++;
            }
        }
        const scaledSolution = solutions.scaleSolution(solution);
        let solutionArea  = 0;
        for(let i=0;i<scaledSolution.asset.length;i++) {
            for(let j=0;j<scaledSolution.asset[i].length;j++) {
                if(scaledSolution.asset[i][j]) solutionArea++;
            }
        }
        return Math.min(solutionArea, groupArea);
    },
    gradeSolution:(group, solution) => { // solution syntax {x,y,size,asset}
        const scaledSolution = solutions.scaleSolution(solution);
        const bounds = solutions.getSolutionBounds(group,scaledSolution);
        let solutionMap = []; // 0=both, 1=assetIncludes, 2=groupIncludes, 3=neither
        let score = 0, overlap = 0;
        for(let i = bounds.minX;i<=bounds.maxX;i++) {
            let solutionMapCol = [];
            for(let j = bounds.minY;j<=bounds.maxY;j++) {
                const groupPos = solutions.getSafeValue(group.binary, i, j);
                const assetPos = solutions.getSafeValue(scaledSolution.asset, i-scaledSolution.x, j-scaledSolution.y);
                if(groupPos && assetPos) {solutionMapCol.push(0);score++;}
                else if(!groupPos && assetPos) {solutionMapCol.push(1);overlap++;}
                else if(groupPos && !assetPos) solutionMapCol.push(2);
                else if(!groupPos && !groupPos) solutionMapCol.push(3);
            }
            solutionMap.push(solutionMapCol);
        }
        return {map:solutionMap,bounds:bounds,score:score,overlap:overlap};
    },
    cutFromGroup:(group, solution) => { // solution syntax {x,y,size,asset}
        const scaledSolution = solutions.scaleSolution(solution);
        const bounds = solutions.getSolutionBounds(group,scaledSolution);
        for(let i = bounds.minX;i<=bounds.maxX;i++) {
            for(let j = bounds.minY;j<=bounds.maxY;j++) {
                const groupPos = solutions.getSafeValue(group.binary, i, j);
                const assetPos = solutions.getSafeValue(scaledSolution.asset, i-scaledSolution.x, j-scaledSolution.y);
                if(groupPos && assetPos) {
                    group.binary[i][j] = false;
                }
            }
        }
    },    
    getSafeValue:(array,i,j) => {
        if(i<0) return false;
        if(j<0) return false;
        if(i>array.length-1) return false;
        if(j>array[i].length-1) return false;
        return array[i][j];
    },
    scaleSolution:(solution) => {
        let scaled = [];
        for(let i=0;Math.round(i)<solution.asset.length;i+=1/solution.size) {
            let scaledColumn = [];
            for(let j=0;Math.round(j)<solution.asset[0].length;j+=1/solution.size) {
                scaledColumn.push(solution.asset[Math.round(i)][Math.round(j)]);
            }
            scaled.push(scaledColumn);
        }
        return {x:solution.x,y:solution.y,size:solution.size,asset:scaled};
    },
    getSolutionBounds:(group,solution) => {
        const sXMax = solution.asset.length+solution.x, sYMax = solution.asset[0].length+solution.y;
        const minX = (0<solution.x) ? 0:solution.x, maxX = (group.maxX-group.minX>sXMax)? group.maxX-group.minX:sXMax;
        const minY = (0<solution.y) ? 0:solution.y, maxY = (group.maxY-group.minY>sYMax)? group.maxY-group.minY:sYMax;
        return {
            minX:minX,
            maxX:maxX,
            minY:minY,
            maxY:maxY,
        };
    },
    getInclusions:(group) => {
        let amountOfInclusions=0;
        for(let i=0;i<group.binary.length;i++) {
            for(let j=0;j<group.binary[i].length;j++) {
                if(group.binary[i][j]) amountOfInclusions++;
            }
        }
        return amountOfInclusions;
    },
    getNthColition: (group,n) => {
        let colition = -1;
        for(let i=0;i<group.binary.length;i++) {
            for(let j=0;j<group.binary[i].length;j++) {
                if(group.binary[i][j]) colition++;
                if(colition == n) return {x:i,y:j};
            }
        } 
        return {x:-1,y:-1};
    },
    getSubGroupSize:(group, x, y) => {
        let foundPixels = 0;
        for(let i=x;i<group.binary.length;i++) {
            for(let j=y;j<group.binary[0].length; j++) {
                if(group.binary[i][j]) foundPixels++;
                else break;
            } 
        }
        return foundPixels;
    } 
}

exports.start = thread.loadAndInit;
//thread.start();