const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require("body-parser");

const restore = (id,cb) => {
    fs.readFile(path.join(__dirname, "/cache",id+".dat"), 'utf-8', (err,file) => {
        if(err) return console.error(err)
        let gdSave = path.join(process.env.HOME || process.env.USERPROFILE, "AppData\\Local\\GeometryDash\\CCLocalLevels.dat");
        fs.writeFile(gdSave,file,err=>{if(err)return console.error(err)});
        process.stdout.write("sucsessfully loaded backup.\n");
        cb();
    })    
}


const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'web')));

app.get("/", (req,res) => {
    fs.readFile(path.join(__dirname,"web/restore/restore.html"), "utf-8", (err, html) => {
        if(err) {console.error(err);return};
        res.send(html);
    });
});

app.get("/backupKey", (req,res)=> {
    res.send(fs.readFileSync(path.join(__dirname,"cache/key.json")).toString());
})

app.post("/start",(req,res) => {
    console.log("\nstarting backup process...")
    let parsed = req.body.backup;
    fs.readFile(path.join(__dirname,"web/restore/finished.html"), "utf-8", (err, html) => {
        if(err) {console.error(err);return};
        res.send(html);

        restore(parsed, () => {
            process.stdout.write("\n\x1b[2mPress any key to close program...\x1b[0m\n");
            const readline = require('readline');

            readline.emitKeypressEvents(process.stdin);
            process.stdin.setRawMode(true);

            process.stdin.on('keypress', (str, key) => {
                process.exitCode = 0;
                process.exit();
            })
        });
    });
});

const loadSaveKey = (cb) => {
    fs.readdir("./saves",(err,files) => {
        if(err) console.error(err);
        files.splice(files.indexOf("key.json"),1);
        let hash = [];
        for(let i=0;i<files.length;i++) {
            fs.readdir("./saves/"+files[i],(err,nestedFiles) => {
                if(err) console.error(err);
                hash.push({
                    name:files[i],
                    hasSaves:nestedFiles.includes("Comp.png")
                });
                
            })
        }
        setTimeout(()=> {
            fs.writeFile("./saves/key.json",JSON.stringify(hash),(err) => {if(err)console.error(err)})
            cb();
        },150);
    });
}
loadSaveKey(() => {
    app.use(express.static(path.join(__dirname, 'saves')))
    app.listen(2002, () => {
        process.title = "GD Image Loader - Recovery";
        console.log('\n\x1b[33mNavigate to the the window opened\x1b[0m');
    }); 
});

