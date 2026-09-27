@echo off
title Hospital Regional Angel Maria Gaton - Emergencias
color 0b
cd /d "%~dp0"

echo ====================================================================
echo      HOSPITAL REGIONAL ANGEL MARIA GATON - SERVICIO DE EMERGENCIAS
echo ====================================================================
echo.

:: Configurar rutas de Node y certificados del sistema
set "PATH=C:\Program Files\nodejs;C:\Users\PC\AppData\Local\Microsoft\WindowsApps;%PATH%"
set "NODE_OPTIONS=--use-system-ca"

:: Instalar dependencias si faltan
if not exist "node_modules" (
    echo Instalando dependencias por primera vez...
    call npm.cmd install
)

:: Recompilar SOLO si hay cambios nuevos en el codigo (antes nunca se actualizaba)
node scripts\needs-build.js
if errorlevel 1 (
    echo Compilando la version mas reciente de la aplicacion...
    call npm.cmd run build
    if errorlevel 1 (
        echo.
        echo [ERROR] La compilacion fallo. Revisa los mensajes de arriba.
        pause
        exit /b 1
    )
)

:: Detectar IP local para conectar desde iPhone / Android
for /f "tokens=4" %%a in ('route print ^| find " 0.0.0.0 "') do (
    set "LOCAL_IP=%%a"
    goto :ip_done
)
:ip_done

echo ====================================================================
echo   [PC] Enlace para usar en esta computadora:
echo        http://localhost:3000
echo.
echo   [CELULAR] Enlace para iPhone / Android (en la misma red Wi-Fi):
echo        http://%LOCAL_IP%:3000
echo.
echo   [CUALQUIER LUGAR] Enlace recomendado (celular, casa u hospital):
echo        https://joelcolon2012-lang.github.io/hospital-angel-maria-gaton/
echo.
echo   Todos los enlaces guardan en la MISMA base central en la nube.
echo   Esta PC guarda ademas una copia de respaldo automatica.
echo ====================================================================
echo.
echo Abriendo aplicacion en el navegador de tu PC...
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000"

echo.
echo Servidor en ejecucion. (Manten esta ventana abierta mientras uses la app)
echo Para detener el servidor, simplemente cierra esta ventana.
echo.

:: Cerrar un servidor anterior de esta app que siga ocupando el puerto 3000
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":3000 .*LISTENING"') do (
    tasklist /fi "PID eq %%p" | find /i "node.exe" >nul && taskkill /pid %%p /f >nul 2>&1
)

:: Servidor central: API + tiempo real + aplicacion web en el puerto 3000
set "PORT=3000"
node server\index.js

pause
