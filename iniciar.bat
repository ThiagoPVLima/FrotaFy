@echo off
title FrotaFy

:: Encerra servidor anterior na porta 3000, se houver
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Instala dependencias se node_modules nao existir
if not exist "node_modules\" (
    echo  Primeira execucao — instalando dependencias...
    cd /d "%~dp0"
    npm install
    if errorlevel 1 (
        echo.
        echo  ERRO: Falha ao instalar dependencias.
        pause
        exit /b 1
    )
    echo.
)

:: Compila o frontend se dist nao existir
if not exist "dist\" (
    echo  Compilando o sistema...
    cd /d "%~dp0"
    npm run build
    if errorlevel 1 (
        echo.
        echo  ERRO: Falha ao compilar o sistema.
        pause
        exit /b 1
    )
    echo.
)

:: Abre o navegador apos 3 segundos em segundo plano
start /B cmd /c "ping -n 4 127.0.0.1 >nul & start http://localhost:3000"

echo  FrotaFy rodando em http://localhost:3000
echo  Feche esta janela para encerrar o servidor.
echo.

:: Inicia o servidor
cd /d "%~dp0"
node server.js

:: Se chegar aqui, o servidor encerrou
if errorlevel 1 (
    echo.
    echo  ERRO: O servidor encerrou inesperadamente.
    echo  Verifique o terminal acima para detalhes do erro.
    echo.
    pause
)
