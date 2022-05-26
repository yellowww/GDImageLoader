(setFocus = (id) => {
    document.getElementById("settingsContent").style.display = "none";
    document.getElementById("errorContent").style.display = "none";
    document.getElementById("procedureContent").style.display = "none";

    document.getElementById(id).style.display = "block";
    document.getElementById("mainContent").scrollTop = 0;
})("settingsContent")

const urlParms = new URLSearchParams(window.location.search);
const isFromHome = urlParms.get("fromHome");

if(isFromHome == null) document.getElementById("backContainer").style.display = "none"; 