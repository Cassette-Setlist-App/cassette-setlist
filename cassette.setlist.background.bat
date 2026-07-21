@echo off
setlocal enabledelayedexpansion

set "folder=Cassette-Setlist Background"
set "json=%folder%\cassette.setlist.background.json"

echo [ > "%json%"

set first=true

for %%f in ("%folder%\*.jpg" "%folder%\*.jpeg" "%folder%\*.png" "%folder%\*.bmp" "%folder%\*.webp") do (
    if exist "%%f" (
        if !first! == true (
            echo "%%~nxf" >> "%json%"
            set first=false
        ) else (
            echo ,"%%~nxf" >> "%json%"
        )
    )
)

echo ] >> "%json%"

echo Background JSON updated.
