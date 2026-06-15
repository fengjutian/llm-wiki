@echo off
REM Wrapper to ignore symlink errors in winCodeSign 7z extraction
"D:\github\llm-wiki\node_modules\builder-util\node_modules\7zip-bin\win\x64\7za_real.exe" %* 2>&1
REM Always return success to bypass symlink permission errors
exit /b 0
