#!/bin/bash
printf '\033[8;25;75t'

start chrome --new-window --app=http://localhost:2002

node restore.js