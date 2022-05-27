const fs = require('fs');
const path = require('path');

const restore = (id) => {
    fs.readFile(path.join(__dirname, "/cache",id+".dat"), 'utf-8', (err,file) => {
        if(err) return console.error(err)
        let gdSave = path.join(process.env.HOME || process.env.USERPROFILE, "AppData\\Local\\GeometryDash\\CCLocalLevels.dat");
        fs.writeFile(gdSave,file,err=>{if(err)return console.error(err)});
        process.stdout.write("sucsessfully loaded backup.\n");
    })    
}

restore('261268508');