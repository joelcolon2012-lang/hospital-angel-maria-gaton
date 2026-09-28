@echo off
title Publicando app del Hospital...
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%USERPROFILE%\.mingit\cmd;C:\Program Files\Git\cmd;%PATH%"
set "NODE_OPTIONS=--use-system-ca"
set "LOG=%~dp0publicar_log.txt"
echo ==== PUBLICACION %date% %time% ==== > "%LOG%"

echo [1/6] Dejando de publicar la base de datos y las plantillas con datos de pacientes (los archivos se quedan en la PC)... >> "%LOG%"
git rm -r --cached --ignore-unmatch database database_backup_pre_upgrade backup_pre_upgrade/database templates >> "%LOG%" 2>&1

echo [2/6] Guardando cambios en Git... >> "%LOG%"
git add -A >> "%LOG%" 2>&1
git commit -m "v2.13.3: se integran los cambios de sincronizacion hechos en otra copia (Codex) + impresion sin direccion ni hora" >> "%LOG%" 2>&1
echo COMMIT_EXIT=%errorlevel% >> "%LOG%"

echo [3/6] Integrando cambios que ya estan en GitHub (hechos desde otra copia del proyecto)... >> "%LOG%"
git fetch origin main >> "%LOG%" 2>&1
rem Una sola vez: esta PC ya contiene esos cambios combinados, en choque se conserva la version de la PC.
if exist ".merge_ours_once" (
  git merge --no-edit -X ours origin/main >> "%LOG%" 2>&1
) else (
  git merge --no-edit origin/main >> "%LOG%" 2>&1
)
set "MERGE_RC=%errorlevel%"
echo MERGE_EXIT=%MERGE_RC% >> "%LOG%"
if exist ".merge_ours_once" del ".merge_ours_once"
if not "%MERGE_RC%"=="0" (
  git merge --abort >> "%LOG%" 2>&1
  echo CONFLICTO: los cambios de GitHub chocan con los de esta PC. No se sube nada; avise a Claude. >> "%LOG%"
  goto fin
)

echo [4/6] Subiendo a GitHub (Render se actualiza desde aqui)... >> "%LOG%"
git push origin main >> "%LOG%" 2>&1
echo PUSH_EXIT=%errorlevel% >> "%LOG%"

echo [5/6] Instalando dependencias si faltan... >> "%LOG%"
if not exist "node_modules\pdfjs-dist" call npm.cmd install >> "%LOG%" 2>&1

echo [6/6] Compilando y publicando en GitHub Pages... >> "%LOG%"
git fetch origin gh-pages:gh-pages >> "%LOG%" 2>&1
call npm.cmd run deploy >> "%LOG%" 2>&1
echo DEPLOY_EXIT=%errorlevel% >> "%LOG%"

:fin
echo ==== FIN ==== >> "%LOG%"
exit
