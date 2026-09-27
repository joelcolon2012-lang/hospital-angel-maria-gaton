@echo off
cd /d "%~dp0"
set "PATH=C:\Program Files\Git\cmd;C:\Program Files\nodejs;%PATH%"
set "OUT=%~dp0diagnostico_git.txt"
echo ==== DIAGNOSTICO GIT (solo lectura) ==== > "%OUT%"
echo Fecha: %date% %time% >> "%OUT%"
where git >> "%OUT%" 2>&1
git --version >> "%OUT%" 2>&1
echo ---- remoto ---- >> "%OUT%"
git remote -v >> "%OUT%" 2>&1
echo ---- rama ---- >> "%OUT%"
git branch -a >> "%OUT%" 2>&1
echo ---- ultimo commit ---- >> "%OUT%"
git log -3 --oneline >> "%OUT%" 2>&1
echo ---- archivos de base de datos rastreados por git ---- >> "%OUT%"
git ls-files database database_backup_pre_upgrade backup_pre_upgrade public/hospital_master_db.json >> "%OUT%" 2>&1
echo ---- en el historial ---- >> "%OUT%"
git log --oneline --all -- database/hospital_master_db.json >> "%OUT%" 2>&1
echo ---- estado ---- >> "%OUT%"
git status --short >> "%OUT%" 2>&1
echo ---- usuario ---- >> "%OUT%"
git config user.name >> "%OUT%" 2>&1
git config user.email >> "%OUT%" 2>&1
git config credential.helper >> "%OUT%" 2>&1
echo ---- node ---- >> "%OUT%"
node --version >> "%OUT%" 2>&1
echo FIN >> "%OUT%"
exit
