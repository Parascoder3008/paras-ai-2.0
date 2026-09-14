@echo off
REM Start the AI OS dashboard and KEEP it up.
REM Double-click this. Keep the window open — closing it stops the console.
REM If node ever exits, this relaunches it after 3 seconds, so a crash is a
REM blip rather than a dead demo.

title AI OS dashboard
cd /d "%~dp0"

REM UTF-8 everywhere: the mind-map skeleton is 200KB of JSON containing
REM Hinglish text and em-dashes, and a cp1252 pipe kills python mid-write.
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1

echo.
echo   AI OS dashboard
echo   ---------------
echo   deck   http://localhost:8080/ultron/
echo   mind   http://localhost:8080/mind/
echo   os map http://localhost:8080/os/
echo.
echo   Ctrl+C twice to stop.
echo.

REM restarts.log gets one line per (re)start — so a crash mid-recording is
REM diagnosable afterward even if nobody was watching this window live.
echo [%DATE% %TIME%] supervisor started >> restarts.log

:loop
node --env-file=.env server.js
echo.
echo   [supervisor] dashboard exited at %TIME% — restarting in 3s...
echo [%DATE% %TIME%] node exited, restarting >> restarts.log
timeout /t 3 /nobreak >nul
goto loop
