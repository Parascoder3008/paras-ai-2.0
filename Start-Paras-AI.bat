@echo off
cd /d "%~dp0"
title Paras AI 2.0
node scripts/brain.cjs status
node scripts/ops.cjs check
echo Starting the local console. Close this window to stop it.
node --env-file-if-exists=dashboard/.env dashboard/server.js
