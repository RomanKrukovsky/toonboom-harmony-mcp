@echo off
REM install_moho_plugin.bat - MohoMCP plugin installer (Windows).
REM
REM Copies MohoMCP_Server.lua, MohoMCP_Poller.lua, json.lua and the moho_mcp\
REM core into Moho's per-user scripts directory. Re-running is safe: identical
REM files are left alone and pre-existing foreign files are backed up, never
REM silently overwritten.

setlocal EnableDelayedExpansion

echo ============================================
echo  MohoMCP Plugin Installer ^(Windows^)
echo ============================================
echo.

REM ---------------------------------------------------------------------------
REM Locate the plugin source.
REM
REM This script lives in <repo>\scripts\ but the plugin lives in
REM <repo>\moho-plugin\. %~dp0 is this script's own directory, so go up one
REM level. Resolving relative to the script means the installer works no matter
REM which directory it is launched from.
REM ---------------------------------------------------------------------------
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "REPO_ROOT=%%~fI"
set "SRC=%REPO_ROOT%\moho-plugin"

if not exist "%SRC%\MohoMCP_Server.lua" (
    echo ERROR: cannot find the plugin source directory.
    echo   Expected: %SRC%
    echo   This script must stay inside the repository, in the scripts\ folder,
    echo   alongside a sibling moho-plugin\ directory.
    exit /b 1
)

REM ---------------------------------------------------------------------------
REM Install into the per-user scripts directory.
REM
REM Writing into "C:\Program Files\..." requires Administrator and is wiped by
REM Moho updates. %APPDATA%\Moho\scripts needs no elevation and survives
REM upgrades, which is why the previous Program Files target is not used.
REM ---------------------------------------------------------------------------
set "USER_SCRIPTS=%APPDATA%\Moho\scripts"
set "MENU_DEST=%USER_SCRIPTS%\menu"
set "SUB_DEST=%MENU_DEST%\MohoMCP"
set "TOOL_DEST=%USER_SCRIPTS%\tool"
set "IPC_DEST=%LOCALAPPDATA%\MohoMCP\ipc"
set "STAMP=.mohomcp_installed"

echo Source:      %SRC%
echo Destination: %USER_SCRIPTS%
echo Spool ^(IPC^): %IPC_DEST%
echo.

echo Creating directories...
if not exist "%SUB_DEST%\moho_mcp\tools" mkdir "%SUB_DEST%\moho_mcp\tools" 2>NUL
if not exist "%MENU_DEST%\moho_mcp\tools" mkdir "%MENU_DEST%\moho_mcp\tools" 2>NUL
if not exist "%TOOL_DEST%" mkdir "%TOOL_DEST%" 2>NUL
if not exist "%IPC_DEST%" mkdir "%IPC_DEST%" 2>NUL

REM Timestamp for backup filenames.
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>NUL') do set "LDT=%%I"
if not defined LDT set "LDT=00000000000000"
set "BACKUP_SUFFIX=bak-%LDT:~0,8%_%LDT:~8,6%"

set "BACKED_UP=0"
set "COPIED=0"
set "UNCHANGED=0"
set "VERIFY_FAILED=0"

REM All files the plugin needs at runtime. batch.lua and workflow.lua are
REM included: MohoMCP_Server.lua registers batch.execute and the workflow.*
REM methods, so omitting them makes those tools fail at dispatch.
call :install_one "MohoMCP_Server.lua"
call :install_one "MohoMCP_Poller.lua"
call :install_one "json.lua"
call :install_one "moho_mcp\protocol.lua"
call :install_one "moho_mcp\validator.lua"
call :install_one "moho_mcp\server.lua"
call :install_one "moho_mcp\tools\document.lua"
call :install_one "moho_mcp\tools\layer.lua"
call :install_one "moho_mcp\tools\bone.lua"
call :install_one "moho_mcp\tools\animation.lua"
call :install_one "moho_mcp\tools\mesh.lua"
call :install_one "moho_mcp\tools\batch.lua"
call :install_one "moho_mcp\tools\workflow.lua"

REM The Poller is a *tool*: it must also live under tool\ to appear in the toolbar.
call :copy_guarded "%SRC%\MohoMCP_Poller.lua" "%TOOL_DEST%\MohoMCP_Poller.lua" "%TOOL_DEST%"

REM Mark these trees as ours so a re-run upgrades instead of making backups.
echo MohoMCP installed from %SRC%> "%SUB_DEST%\%STAMP%"
echo MohoMCP installed from %SRC%> "%MENU_DEST%\%STAMP%"
echo MohoMCP installed from %SRC%> "%TOOL_DEST%\%STAMP%"

REM ---------------------------------------------------------------------------
REM Verify what actually landed rather than trusting copy.
REM ---------------------------------------------------------------------------
echo.
echo Verifying installation...
call :verify_one "MohoMCP_Server.lua"
call :verify_one "MohoMCP_Poller.lua"
call :verify_one "json.lua"
call :verify_one "moho_mcp\protocol.lua"
call :verify_one "moho_mcp\validator.lua"
call :verify_one "moho_mcp\server.lua"
call :verify_one "moho_mcp\tools\document.lua"
call :verify_one "moho_mcp\tools\layer.lua"
call :verify_one "moho_mcp\tools\bone.lua"
call :verify_one "moho_mcp\tools\animation.lua"
call :verify_one "moho_mcp\tools\mesh.lua"
call :verify_one "moho_mcp\tools\batch.lua"
call :verify_one "moho_mcp\tools\workflow.lua"

if "%VERIFY_FAILED%"=="1" (
    echo.
    echo ERROR: verification failed. The plugin may be partially installed.
    exit /b 1
)
echo   All 13 files verified.

echo.
if not "%BACKED_UP%"=="0" (
    echo IMPORTANT: %BACKED_UP% pre-existing file^(s^) were NOT overwritten silently.
    echo They were renamed with the suffix .%BACKUP_SUFFIX% in place.
    echo.
)

echo ============================================
echo  Installation complete.
echo    %COPIED% file^(s^) written, %UNCHANGED% already up to date.
echo ============================================
echo.
echo To start it:
echo   1. Launch Moho ^(restart it if it was already running^).
echo   2. Scripts menu ^> MohoMCP ^> MohoMCP Server.
echo      The label shows a green dot when the server is running.
echo.
echo To confirm it is working:
echo   A file named health.json appears in the spool directory within
echo   a few seconds of starting the server:
echo     dir "%IPC_DEST%\health.json"
echo.
echo Spool directory:
echo   Default: %IPC_DEST%
echo   Override with MOHO_IPC_DIR, or MOHO_MCP_IPC_DIR if that is unset.
echo   The MCP bridge and this plugin must resolve the SAME directory,
echo   otherwise requests are written where nobody reads them.
echo.
pause
exit /b 0

REM ===========================================================================
REM Subroutines
REM ===========================================================================

:install_one
set "REL=%~1"
if not exist "%SRC%\%REL%" (
    echo ERROR: missing source file moho-plugin\%REL%
    exit /b 1
)
call :copy_guarded "%SRC%\%REL%" "%SUB_DEST%\%REL%" "%SUB_DEST%"
call :copy_guarded "%SRC%\%REL%" "%MENU_DEST%\%REL%" "%MENU_DEST%"
exit /b 0

:copy_guarded
REM %1 = source, %2 = destination, %3 = destination tree root
if exist "%~2" (
    fc /b "%~1" "%~2" >NUL 2>&1
    if not errorlevel 1 (
        set /a UNCHANGED+=1
        exit /b 0
    )
    REM Differs. If this tree was not installed by us, preserve the old file.
    if not exist "%~3\%STAMP%" (
        move /y "%~2" "%~2.%BACKUP_SUFFIX%" >NUL 2>&1
        set /a BACKED_UP+=1
    )
)
copy /y "%~1" "%~2" >NUL
if errorlevel 1 (
    echo   FAILED to copy %~1
    exit /b 1
)
set /a COPIED+=1
exit /b 0

:verify_one
set "REL=%~1"
fc /b "%SRC%\%REL%" "%SUB_DEST%\%REL%" >NUL 2>&1
if errorlevel 1 (
    echo   MISMATCH: %SUB_DEST%\%REL%
    set "VERIFY_FAILED=1"
)
exit /b 0
