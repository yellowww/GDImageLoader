let data;
let saveKey;
let dropdownOpen = false;
let selectedOption;

fetch("/key.json")
    .then(res=>res.json())
    .then(json=>saveKey=json)

const loadKey = (cb) => {
    fetch("/backupKey")
        .then(res=>res.json())
        .then(json=>{data=json;cb()})
}

loadKey(()=> {
    const keys = Object.keys(data);
    keys.sort((a,b)=>b-a);
    const optionContainer = document.getElementsByClassName("dropdown-option-container")[0];
    for(let i=0;i<keys.length;i++) {
        const thisBackup = data[keys[i]];
        const displayString = `${thisBackup.saveName.split("./saves/")[1]} &#8594; ${thisBackup.levelName}`;
        let e = document.createElement("div");
        e.classList.add('dropdown-option');
        e.innerHTML = displayString;
        e.onclick = () => {
            selectedOption = keys[i];
            document.getElementsByClassName("dropdown-content")[0].innerHTML = displayString;
            selectOption();
        }
        optionContainer.appendChild(e);
    }
})


const dropdownText = document.getElementsByClassName("dropdown-content")[0]
const itemContainer = document.getElementsByClassName("dropdown-option-container")[0]
dropdownText.onclick = ()=>{
    if(!dropdownOpen) {
        itemContainer.style.maxHeight="5.5cm";
        setTimeout(()=> {dropdownOpen=true},10)
    };
}
document.body.onclick = ()=>{
    if(dropdownOpen) {
        itemContainer.style.maxHeight="0cm";
        setTimeout(() => {dropdownOpen=false},10)
    };
}

const selectOption = () => {
    const selectedBackup = data[selectedOption];
    let displayString;
    const saveName = selectedBackup.saveName.split("./saves/")[1];
    if(selectedBackup.levelName != "new level")     displayString = `Load backup from <div class="bold">before</div> save <div class="content-focus">${saveName}</div> was loaded into level <div class="content-focus">${selectedBackup.levelName}</div>.`
    else     displayString = `Load backup from <div class="bold">before</div> save <div class="content-focus">${saveName}</div> was loaded into a new level.`

    const backupDate = formatDate(new Date(selectedBackup.timeCreated));
    document.getElementById("backupDescription").innerHTML = displayString;
    document.getElementById("backupDate").innerHTML = `Backup was made on <div class="bold">${backupDate}</div>`;

    let errorDisplay = document.getElementById("imageInfo");
    let savePreview = document.getElementById("savePreview");
    if(saveKey.map(e=>e.name).includes(saveName)) {
        if(saveKey[saveKey.map(e=>e.name).indexOf(saveName)].hasSaves) {
        fetch(`${saveName}/Stats.json`)
            .then(res=>res.json())
            .then(stats=>{
                if(selectedBackup.stats == JSON.stringify(stats)) {
                    errorDisplay.style.display = "none";
                    savePreview.style.display = "block";
                    savePreview.src = `${saveName}/PrimSet.png`;                          
                } else {
                    savePreview.style.display = "none";
                    errorDisplay.innerHTML = "Outdated Image preview.";
                    errorDisplay.style.display = "block";
                }
            });            
        } else {
            savePreview.style.display = "none";
            errorDisplay.innerHTML = "Could not find image preview.";
            errorDisplay.style.display = "block";            
        }
    } else {
        savePreview.style.display = "none";
        errorDisplay.innerHTML = "Could not find image preview.";
        errorDisplay.style.display = "block";
    }
    document.getElementById("lowerContent").style.display = "block";
}

const formatDate = (date) => {
    const dateString = date.toString();
    let dateArray = dateString.split(' ');
    for(let i=0;i<4;i++) dateArray.pop();
    return dateArray.join(' ');
}

const openWarning = () => {
    document.body.style.overflowY="hidden";
    window.scrollTo(0,0);
    document.getElementById("warningContainer").style.display = "block";
}

const closeWarning = () => {
    document.body.style.overflowY="auto";
    document.getElementById("warningContainer").style.display = "none";
}

const submit = () => {
    document.getElementById("submitDataField").value = selectedOption;
    document.getElementById("submitDataInput").click();
}