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

:: Si no existe la carpeta dist, compilar la aplicacion
if not exist "dist" (
    echo Compilando la aplicacion por primera vez...
    call npm.cmd run build
)

:: Detectar IP local para conectar desde iPhone
for /f "tokens=4" %%a in ('route print ^| find " 0.0.0.0 "') do (
    set "LOCAL_IP=%%a"
    goto :ip_done
)
:ip_done

echo ====================================================================
echo   [PC] Enlace para usar en esta computadora:
echo        http://localhost:3000
echo.
echo   [IPHONE] Enlace para usar en tu iPhone (en la misma red Wi-Fi):
echo        http://%LOCAL_IP%:3000
echo ====================================================================
echo.
echo Abriendo aplicacion en el navegador de tu PC...
timeout /t 2 >nul
start http://localhost:3000

echo.
echo Servidor en ejecucion. (Manten esta ventana abierta mientras uses la app)
echo Para detener el servidor, simplemente cierra esta ventana.
echo.

call npm.cmd run preview -- --port 3000 --host

pause