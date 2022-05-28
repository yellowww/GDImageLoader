@ECHO OFF
mode con:cols=150 lines=35

start chrome --new-window --app=http://localhost:2000

node main.js
PAUSE