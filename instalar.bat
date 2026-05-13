@echo off
chcp 65001 > nul
title FrotaFy - Instalacao

echo.
echo  =============================================
echo    FrotaFy - Instalacao
echo  =============================================
echo.

:: Eleva para administrador (necessario para instalar Node/Git)
net session >nul 2>&1
if errorlevel 1 (
    echo  Solicitando permissao de administrador...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs -WorkingDirectory '%~dp0'"
    exit /b
)

:: Node.js
node --version >nul 2>&1
if not errorlevel 1 (
    echo  [OK] Node.js ja instalado.
) else (
    echo  Instalando Node.js ^(pode demorar alguns minutos^)...
    winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
        echo.
        echo  [ERRO] Nao foi possivel instalar o Node.js automaticamente.
        echo  Instale manualmente em: https://nodejs.org
        pause
        exit /b 1
    )
    echo  [OK] Node.js instalado!
)

:: Git
git --version >nul 2>&1
if not errorlevel 1 (
    echo  [OK] Git ja instalado.
) else (
    echo  Instalando Git...
    winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
        echo.
        echo  [ERRO] Nao foi possivel instalar o Git automaticamente.
        echo  Instale manualmente em: https://git-scm.com
        pause
        exit /b 1
    )
    echo  [OK] Git instalado!
)

:: Atualiza PATH para esta sessao (sem precisar reiniciar)
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "PATH=%%b"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "PATH=%PATH%;%%b"

echo.

:: Dependencias npm
echo  Instalando dependencias, aguarde...
cd /d "%~dp0"
call npm install
if errorlevel 1 (
    echo  [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
)
echo  [OK] Dependencias instaladas
echo.

:: Build do frontend
echo  Compilando o sistema, aguarde...
call npm run build
if errorlevel 1 (
    echo  [ERRO] Falha ao compilar o sistema.
    pause
    exit /b 1
)
echo  [OK] Sistema compilado
echo.

:: Atalho na area de trabalho
echo  Criando atalho na area de trabalho...
powershell -ExecutionPolicy Bypass -File "%~dp0criar-atalho.ps1"
if errorlevel 1 (
    echo  [AVISO] Atalho nao criado. Use o iniciar.bat diretamente.
) else (
    echo  [OK] Atalho criado na area de trabalho
)

echo.
echo  =============================================
echo    Instalacao concluida!
echo    Clique em "FrotaFy" na area de trabalho.
echo  =============================================
echo.
pause
