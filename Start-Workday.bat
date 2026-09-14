@echo off
cd /d "%~dp0"
node scripts/brain.cjs status
node scripts/ops.cjs brief
echo.
echo This is a local work queue. No messages or posts were sent.
pause
