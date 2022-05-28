@ECHO OFF
mode con:cols=75 lines=25

start chrome --new-window --app=http://localhost:2002

node restore.js