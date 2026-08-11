@echo off
setlocal EnableDelayedExpansion
rem ============================================================================
rem  P6 comparison harness - step 1 of 3: programmatic import of the 13 cases.
rem
rem  Uses Oracle's documented command-line import (P6 Professional 23.x:
rem  Primavera.CacheService.exe /actionScript=...) to CREATE the 13 synthetic
rem  projects under the XVA EPS node in the live "Forensic" standalone DB.
rem  P6's own import engine does all ID allocation - no raw SQL writes.
rem
rem  After this succeeds:  open P6, open the 13 XV* projects, press F9,
rem  Schedule. Each project keeps its own data date (XV08/XV10 = 12-Jan-2026,
rem  the rest 05-Jan-2026) - confirm the dialog shows those, do not edit them.
rem  Then run:  python db-read-capture.py
rem
rem  Your password is typed here, into your own console, and goes only to
rem  Oracle's executable. It is not stored anywhere.
rem ============================================================================

set "P6DIR=C:\Program Files\Oracle\Primavera P6\P6 Professional\23.12.1"
set "HERE=%~dp0"
set "ACTIONS=%HERE%db-import-actions.xml"
set "LOG=%HERE%p6-import-log.txt"
set "ALIAS=Forensic"

echo.
echo  P6 comparison harness - CLI import of 13 synthetic cases into EPS "XVA"
echo  Database alias: %ALIAS%
echo.

rem -- P6 must be closed during a CLI import (documented Oracle requirement,
rem    and SQLite is single-user). Refuse rather than fail halfway.
tasklist /FI "IMAGENAME eq PM.exe" 2>nul | find /I "PM.exe" >nul
if not errorlevel 1 (
    echo  [ABORT] P6 Professional is running. Close P6 completely, then rerun.
    exit /b 90
)

if not exist "%P6DIR%\Primavera.CacheService.exe" (
    echo  [ABORT] Primavera.CacheService.exe not found under:
    echo          %P6DIR%
    exit /b 91
)
if not exist "%ACTIONS%" (
    echo  [ABORT] Action script not found: %ACTIONS%
    exit /b 92
)

set /p "P6USER=P6 username (Enter for ADMIN): "
if "%P6USER%"=="" set "P6USER=ADMIN"
set /p "P6PASS=P6 password for %P6USER%: "
if "%P6PASS%"=="" (
    echo  [ABORT] Empty password.
    exit /b 93
)

echo.
echo  Importing... (log: %LOG%)
"%P6DIR%\Primavera.CacheService.exe" /username=%P6USER% /password=%P6PASS% /alias=%ALIAS% /actionScript="%ACTIONS%" /pmlogfile="%LOG%"
set "RC=%ERRORLEVEL%"
set "P6PASS="

echo.
if "%RC%"=="0" (
    echo  [OK] Import succeeded. 13 projects created under EPS "XVA".
    echo.
    echo  NEXT: open P6, open all 13 XV* projects together, press F9, Schedule.
    echo        Leave each project's data date exactly as shown.
    echo        Then run:  python "%HERE%db-read-capture.py"
) else (
    echo  [FAIL] Import exit code %RC%.
    if "%RC%"=="1" echo         1 = invalid database alias
    if "%RC%"=="2" echo         2 = invalid username or password
    if "%RC%"=="3" echo         3 = action script not found
    if "%RC%"=="4" echo         4 = invalid action type
    if "%RC%"=="5" echo         5 = insufficient security privileges
    if "%RC%"=="6" echo         6 = failure processing the import action
    echo         See log: %LOG%
)
exit /b %RC%
