@ECHO OFF
mode con:cols=150 lines=35

if exist "node_modules\express\" (
	start chrome --new-window --app=http://localhost:2000
	node ./main.js
) else (
	echo installing dependencies...     This will only happen once.
	npm install
	start chrome --new-window --app=http://localhost:2000
	node ./main.js
)