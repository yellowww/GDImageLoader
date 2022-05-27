const express = require("express");
const fs = require("fs");
const path = require('path');
const bodyParser = require("body-parser");
const main = require("./main.js")
const builder = require("./build.js");

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'web')));
app.use(express.static(path.join(__dirname, 'saves')));

app.get("/", (req,res) => {
    fs.readFile(__dirname+"/web/home/home.html", "utf-8", (err, html) => {
        if(err) {console.error(err);return};
        res.send(html);
    });
});

app.get("/help", (req,res) => {
    fs.readFile(__dirname+"/web/help/help.html", "utf-8", (err, html) => {
        if(err) {console.error(err);return};
        res.send(html);
    });
});

app.post("/submitConfig", (req,res) => {
    let parsed = JSON.parse(req.body.configSubmition);
    if(parsed.new) main.start(parsed.config);
    else builder.loadConstruct("./saves/"+parsed.config.save, parsed.config.newLevel,parsed.config.level,parsed.config.width,parsed.config.editorLayer,parsed.config.density,()=> {
        setTimeout(()=>main.closeMessage(0),100);
    });
    fs.readFile(__dirname+"/web/home/finished.html", "utf-8", (err, html) => {
        if(err) {console.error(err);return};
        res.send(html);
    });
});

const loadSaveKey = () => {
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
        },150);
    });
}
loadSaveKey();
process.title = "GD Image Loader"
process.stdout.write("\033[8;150;400");
console.log("\n\x1b[1m\x1b[36m\n   -------------------\n   | GD Image Loader |\n   -------------------\x1b[0m\n")
app.listen(2000, () => console.log('\x1b[33m   Navigate to the the window opened to enter configuration\x1b[0m\n\n'));
