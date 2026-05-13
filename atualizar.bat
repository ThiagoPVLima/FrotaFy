@echo off
title FrotaFy - Atualizacao
echo.
echo  Atualizando FrotaFy...
echo.

:: Encerra servidor anterior na porta 3000, se houver
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Baixa atualizacoes do GitHub
cd /d "%~dp0"
git pull
echo.

:: Reinstala dependencias
echo  Instalando dependencias...
npm install
echo.

:: Recompila o frontend
echo  Compilando o sistema...
npm run build
echo.

echo  Tudo atualizado! Pode abrir o FrotaFy normalmente.
echo.
pause
