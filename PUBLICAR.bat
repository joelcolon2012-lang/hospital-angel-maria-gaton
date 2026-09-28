@echo off
title Publicando app del Hospital...
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%USERPROFILE%\.mingit\cmd;C:\Program Files\Git\cmd;%PATH%"
set "NODE_OPTIONS=--use-system-ca"
set "LOG=%~dp0publicar_log.txt"
echo ==== PUBLICACION %date% %time% ==== > "%LOG%"

echo [1/5] Dejando de publicar la base de datos y las plantillas con datos de pacientes (los archivos se quedan en la PC)... >> "%LOG%"
git rm -r --cached --ignore-unmatch database database_backup_pre_upgrade backup_pre_upgrade/database templates >> "%LOG%" 2>&1

echo [2/5] Guardando cambios en Git... >> "%LOG%"
git add -A >> "%LOG%" 2>&1
git commit -m "v2.13.0: CIE-10 en diagnosticos y detector de errores logico-clinicos" >> "%LOG%" 2>&1
echo COMMIT_EXIT=%errorlevel% >> "%LOG%"

echo [3/5] Subiendo a GitHub (Render se actualiza desde aqui)... >> "%LOG%"
git push origin main >> "%LOG%" 2>&1
echo PUSH_EXIT=%errorlevel% >> "%LOG%"

echo [4/5] Instalando dependencias si faltan... >> "%LOG%"
if not exist "node_modules\pdfjs-dist" call npm.cmd install >> "%LOG%" 2>&1

echo [5/5] Compilando y publicando en GitHub Pages... >> "%LOG%"
git fetch origin gh-pages:gh-pages >> "%LOG%" 2>&1
call npm.cmd run deploy >> "%LOG%" 2>&1
echo DEPLOY_EXIT=%errorlevel% >> "%LOG%"

echo ==== FIN ==== >> "%LOG%"
exit
