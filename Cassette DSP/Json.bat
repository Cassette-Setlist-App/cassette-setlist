@echo off
setlocal EnableDelayedExpansion

REM ------------------------------------------------------------
REM  BASE FOLDER = WHERE THIS BAT FILE IS LOCATED
REM ------------------------------------------------------------
set "baseDir=%~dp0"
set "settingsDir=%baseDir%Settings"
set "outputFile=%baseDir%cassette.dsp.settings.json"

echo Script folder: "%baseDir%"
echo Settings dir:  "%settingsDir%"
echo Output file:   "%outputFile%"
echo.

REM ------------------------------------------------------------
REM  CHECK FOLDERS
REM ------------------------------------------------------------
if not exist "%settingsDir%" (
    echo ERROR: Settings folder not found: "%settingsDir%"
    goto :end
)

dir /b "%settingsDir%\*.json" >nul 2>&1
if errorlevel 1 (
    echo ERROR: No .json files found in "%settingsDir%"
    goto :end
)

REM ------------------------------------------------------------
REM  START JSON ARRAY
REM ------------------------------------------------------------
echo [ > "%outputFile%"

set "firstItem=true"

REM ------------------------------------------------------------
REM  LOOP THROUGH ALL JSON FILES
REM ------------------------------------------------------------
for %%f in ("%settingsDir%\*.json") do (
    echo Including: %%~nxf

    if "!firstItem!"=="true" (
        set "firstItem=false"
    ) else (
        echo , >> "%outputFile%"
    )

    echo   { >> "%outputFile%"
    echo     "name": "%%~nf", >> "%outputFile%"
    echo     "data": >> "%outputFile%"
    type "%%f" >> "%outputFile%"
    echo   } >> "%outputFile%"
)

REM ------------------------------------------------------------
REM  CLOSE JSON ARRAY
REM ------------------------------------------------------------
echo ] >> "%outputFile%"

echo.
echo DONE: "%outputFile%" created.

:end
pause
endlocal
