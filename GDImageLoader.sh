#!/bin/bash
printf '\033[8;35;150t'

start chrome --new-window --app=http://localhost:2000

node main.js
