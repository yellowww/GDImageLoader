document.getElementById("scanWidthInput").onblur = () => {
    const input = document.getElementById("scanWidthInput");
    if (input.value<0) input.value=0;
}

document.getElementById("scanHeightInput").onblur = () => {
    const input = document.getElementById("scanHeightInput");
    if (input.value<0) input.value=0;
}

document.getElementById("thresholdInput").onblur = () => {
    const input = document.getElementById("thresholdInput");
    if (input.value>1) input.value=1;
    if (input.value<0) input.value=0;
}

document.getElementById("incorperateThresholdInput").onblur = () => {
    const input = document.getElementById("incorperateThresholdInput");
    if (input.value<0) input.value=0;
}

document.getElementById("whiteTransparentInput").onchange = () => {
    const input = document.getElementById("whiteTransparentInput").checked;
    document.getElementById("protectWhitesInput").checked = input;
} 

document.getElementById("overlapQualityInput").onblur = () => {
    const input = document.getElementById("overlapQualityInput");
    if (input.value>1) input.value=1;
    if (input.value<0) input.value=0;
}

document.getElementById("passThresholdInput").onblur = () => {
    const input = document.getElementById("passThresholdInput");
    if (input.value>1) input.value=1;
    if (input.value<0) input.value=0;
}

document.getElementById("layerInput").onblur = () => {
    const input = document.getElementById("layerInput");
    if (input.value<0) input.value=0;
}

document.getElementById("LOADloadWidthInput").onblur = () => {
    const input = document.getElementById("LOADloadWidthInput");
    if (input.value<0) input.value=0;
}

document.getElementById("loadWidthInput").onblur = () => {
    const input = document.getElementById("loadWidthInput");
    if (input.value<0) input.value=0;
}

document.getElementById("specifiedDensityInput").onblur = () => {
    const input = document.getElementById("specifiedDensityInput");
    if (input.value<0) input.value=0;
}

document.getElementById("LOADspecifiedDensityInput").onblur = () => {
    const input = document.getElementById("LOADspecifiedDensityInput");
    if (input.value<0) input.value=0;
}

document.getElementById("LOADlayerInput").onblur = () => {
    const input = document.getElementById("LOADlayerInput");
    if (input.value<0) input.value=0;
}


document.getElementById("startButton").onclick = () => {
    const json = compileJSON();
    if(json) {
        document.getElementById("configSubmition").value = JSON.stringify(json);
        document.getElementById("submitConfigInput").click();
    }
}

document.getElementById("newLevelInput").onchange = () => {
    const active = document.getElementById("newLevelInput").checked;
    let container =  document.getElementById("gdLevelContainer");

    if(active) {
        container.style.filter = "opacity(0.4)";
        container.style.pointerEvents = "none";
    } else {
        container.style.filter = "opacity(1)";
        container.style.pointerEvents = "all";

    }
}

document.getElementById("densityOverrideInput").onchange = () => {
    const active = document.getElementById("densityOverrideInput").checked;
    let container =  document.getElementById("specifiedDensityContainer");

    if(!active) {
        container.style.filter = "opacity(0.4)";
        container.style.pointerEvents = "none";
    } else {
        container.style.filter = "opacity(1)";
        container.style.pointerEvents = "all";

    }
}

document.getElementById("LOADnewLevelInput").onchange = () => {
    const active = document.getElementById("LOADnewLevelInput").checked;
    let container =  document.getElementById("LOADgdLevelContainer");

    if(active) {
        container.style.filter = "opacity(0.4)";
        container.style.pointerEvents = "none";
    } else {
        container.style.filter = "opacity(1)";
        container.style.pointerEvents = "all";

    }
}

document.getElementById("LOADdensityOverrideInput").onchange = () => {
    const active = document.getElementById("LOADdensityOverrideInput").checked;
    let container =  document.getElementById("LOADspecifiedDensityContainer");

    if(!active) {
        container.style.filter = "opacity(0.4)";
        container.style.pointerEvents = "none";
    } else {
        container.style.filter = "opacity(1)";
        container.style.pointerEvents = "all";

    }
}

document.getElementById("newConfigButton").onclick = () => {
    document.getElementById("newConfigButton").style.backgroundColor = "rgb(165,148,100)";
    document.getElementById("loadConfigButton").style.backgroundColor = "rgba(0,0,0,0)";
    document.getElementById("newConfigContainer").style.display = "block";
    document.getElementById("loadConfigContainer").style.display = "none";
}

document.getElementById("loadConfigButton").onclick = () => {
    document.getElementById("loadConfigButton").style.backgroundColor = "rgb(165,148,100)";
    document.getElementById("newConfigButton").style.backgroundColor = "rgba(0,0,0,0)";
    document.getElementById("newConfigContainer").style.display = "none";
    document.getElementById("loadConfigContainer").style.display = "block";
}

const compileJSON = () => {
    const image = document.getElementById("imageInput").value;
    let level = document.getElementById("levelInput").value;
    const saveLocation = document.getElementById("saveLocationInput").value;  
    const saveImages = document.getElementById("saveImages").checked;  
    const lowObjectMode = document.getElementById("lowObjectModeInput").checked;  
    const resWidth = document.getElementById("scanWidthInput").value;  
    const resHeight = document.getElementById("scanHeightInput").value;  
    const threshold = document.getElementById("thresholdInput").value;  
    const incorperateThreshold = document.getElementById("incorperateThresholdInput").value;  
    const whiteIsTransparency = document.getElementById("whiteTransparentInput").checked;  
    const protectWhites = document.getElementById("protectWhitesInput").checked;  
    const overlapQuality = document.getElementById("overlapQualityInput").value;  
    const passThreshold = document.getElementById("passThresholdInput").value;  
    const newLevel = document.getElementById("newLevelInput").checked;  
    const bakeArtifacts = document.getElementById("bakeArtifactsInput").checked;
    const editorLayer = document.getElementById("layerInput").value;
    const imageWidth = document.getElementById("loadWidthInput").value;
    const densityOverride = document.getElementById("densityOverrideInput").checked;
    const enhanceDetails = document.getElementById("enhanceDetailsInput").checked;
    let specifiedDensity = densityOverride?document.getElementById("specifiedDensityInput").value:"NA";
    if(newLevel) level = "NA";
    const isNull = checkIfNull([
        ["path to image",image],
        ["level",level],
        ["save location",saveLocation],
        ["resolution width",resWidth],
        ["resolution height", resHeight],
        ["threshold", threshold],
        ["incorperate threshold", incorperateThreshold],
        ["overlap quality", overlapQuality],
        ["pass threshold",passThreshold],
        ["editor layer",editorLayer],
        ["image width",imageWidth],
        ["specified maximum density", specifiedDensity]
    ]);
    if(specifiedDensity == "NA") specifiedDensity = false;
    if(isNull) {
        document.getElementById("errorOut").style.display="block";
        document.getElementById("errorOut").innerHTML = `
            [CONFIG ERROR] setting 
            '<div style='color:rgb(40,20,60);display:inline-block;'>${isNull}</div>'
            must be defined.
        `
        return false;
    }
    return config = {
        imagePath:"./"+image,
        gdLevel:level,
        newLevel:newLevel,
        generateImageSave:saveImages,
        saveLocation:"./saves/"+saveLocation,
        res:[Number(resWidth),Number(resHeight)],//horizontal: [200,250], vertical:[150,175],
        threshold:Number(threshold),//0.075,
        incorperateThreshold:Number(incorperateThreshold),
        whiteThreshold:245,
        maxCallback:250,
        assetRes:100,
        overlapQuality:Number(overlapQuality), //0.9 defines the starting resolution of the solution, will be scaled if low object count is enabled
        passThreshold:Number(passThreshold), //0.75 the threshold at which a solution will be disregarded if there is too much overlap
        lowObjectCount:lowObjectMode,
        bakeArtifacts:bakeArtifacts,
        protectWhites:protectWhites, // prevent artifacts in white colors (rgb>config.whiteThreshold) useful when removeing white
        whiteIsTransparency: whiteIsTransparency,
        cleanUpNonMerged:!enhanceDetails, // true = replace single pixels with neighbors, false = create new group for every single pixel
        editorLayer:editorLayer,
        imageWidth:imageWidth,
        specifiedDensity:specifiedDensity
    }
}

const checkIfNull = (props) => {
    for(let i=0;i<props.length;i++) {
        if(props[i][1] == "") return props[i][0];
    }
    return false;
}