const url = new URL(window.location);
const isFromHome = url.searchParams.get("h");
let startPage = url.searchParams.get("s");
if(!["settings","error","procedure"].includes(startPage)) startPage = "settings"

if(isFromHome == null) document.getElementById("backContainer").style.display = "none"; 


(setFocus = (id) => {
    if(url.searchParams.get("s") != id) {
        url.searchParams.set("s",id);
        window.history.pushState('helpDescription',"GD IMAGE LOADER - HELP",url.href);
    }
    
    id+="Content";
    document.getElementById("settingsContent").style.display = "none";
    document.getElementById("errorContent").style.display = "none";
    document.getElementById("procedureContent").style.display = "none";

    document.getElementById(id).style.display = "block";
    document.getElementById("mainContent").scrollTop = 0;
})(startPage)

