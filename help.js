const express = require("express");
const fs = require("fs");
const path = require('path');

const app = express();


app.use(express.static(path.join(__dirname, 'web')));

app.get("/", (req,res) => {
    fs.readFile(path.join(__dirname,"web/help/help.html"), "utf-8", (err, html) => {
        if(err) {console.error(err);return};
        res.send(html);
    });
});

process.title = "GD Image Loader - Help"
app.listen(2001, () => {
    console.log('\n\x1b[33mNavigate to the the window opened\x1b[0m');

    process.stdout.write("Press any key to close program...\n");
    const readline = require('readline');

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    process.stdin.on('keypress', (str, key) => {
        process.exitCode = 0;
        process.exit();
    })

});

