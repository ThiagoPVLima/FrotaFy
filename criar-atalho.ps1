# Pasta do projeto = pasta onde este script esta
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Desktop real do usuario
$desktop = [Environment]::GetFolderPath('Desktop')

$vbsPath = Join-Path $ProjectDir "iniciar.vbs"
$batPath = Join-Path $ProjectDir "iniciar.bat"
$icoPath = Join-Path $ProjectDir "public\logo.ico"
$lnkPath = Join-Path $desktop   "FrotaFy.lnk"

try {
    $shell          = New-Object -COM WScript.Shell
    $shortcut       = $shell.CreateShortcut($lnkPath)
    $shortcut.TargetPath       = "wscript.exe"
    $shortcut.Arguments        = "`"$vbsPath`" `"$batPath`""
    $shortcut.WorkingDirectory = $ProjectDir
    $shortcut.WindowStyle      = 1
    $shortcut.Description      = "FrotaFy - Gestao de Frota Automotiva"

    if (Test-Path $icoPath) {
        $shortcut.IconLocation = $icoPath
    }

    $shortcut.Save()
    Write-Host "[OK] Atalho criado em: $lnkPath"
} catch {
    Write-Host "[ERRO] $_"
    exit 1
}
