const express = require("express");
const fs = require("fs");
const path = require('path');
const bodyParser = require("body-parser");
const main = require("./main.js")

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'web')));

app.get("/", (req,res) => {
    fs.readFile(__dirname+"/web/index.html", "utf-8", (err, html) => {
        if(err) {console.error(err);return};
        res.send(html);
    });
});

app.post("/submitConfig", (req,res) => {
    let parsed = JSON.parse(req.body.configSubmition);
    main.start(parsed);
    fs.readFile(__dirname+"/web/finished.html", "utf-8", (err, html) => {
        if(err) {console.error(err);return};
        res.send(html);
    });
    
});

console.log("\n\x1b[1m\x1b[36m\n   -------------------\n   | GD Image Loader |\n   -------------------\x1b[0m\n")
app.listen(2000, () => console.log('\x1b[33m   Navigate to http://localhost:2000 in a web browser to enter configuration\x1b[0m'));