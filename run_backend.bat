@echo off
cd /d "%~dp0"
call pip install -r backend/requirements.txt
call uvicorn app.main:app --reload --app-dir backend
pause
