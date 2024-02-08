@ECHO OFF
mode con:cols=75 lines=25

if exist "node_modules\express\" (
	start chrome --new-window --app=http://localhost:2002
	node ./restore.js
) else (
	echo installing dependencies...    This will only happen once.
	npm install
	start chrome --new-window --app=http://localhost:2002
	node ./restore.js
)