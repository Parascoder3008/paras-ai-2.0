@echo off
REM Start the JARVIS listener in its own window, owned by you.
REM Double-click this. Keep the window open — closing it stops the ear.
REM (A listener started from an automation session dies with that session;
REM this is the version that keeps running.)

title JARVIS listener
cd /d "%~dp0"

REM Male SAPI voice by default. Override before running to change it:
REM   set JARVIS_SAPI_VOICE=Microsoft Zira Desktop
if "%JARVIS_SAPI_VOICE%"=="" set JARVIS_SAPI_VOICE=Microsoft David Desktop

REM Push-to-talk ON by default: hold Right Ctrl and speak. Purely additive --
REM the double clap and the "jarvis" wake word still work exactly as before.
REM It is the one trigger with no thresholds to tune, so it is the one that
REM behaves the same in any room. Set to 0 to go back to hands-free only.
if "%JARVIS_PTT%"=="" set JARVIS_PTT=1

REM UTF-8 so Hindi/Hinglish transcripts and em-dashes never crash a print.
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1

:loop
echo.
echo   Starting JARVIS. Hold Right Ctrl, double-clap, or say "jarvis".
echo   Ctrl+C to stop.
echo.

node "%~dp0..\scripts\python-runtime.cjs" listener.py %*

if errorlevel 1 (
  echo.
  echo   [supervisor] listener crashed - restarting in 3s... ^(Ctrl+C now to stop for good^)
  timeout /t 3 /nobreak >nul
  goto loop
)

echo.
echo   Listener stopped.
pause
