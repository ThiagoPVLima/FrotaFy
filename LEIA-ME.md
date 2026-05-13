# FrotaFy 🚗

Sistema de gestão de manutenção automotiva para uso pessoal no Windows.

## Requisitos

- **Node.js** 18+ → https://nodejs.org (versão LTS)
- **Git** (opcional, para atualizações automáticas) → https://git-scm.com/download/win

## Instalação

1. Extraia a pasta em qualquer local (ex: `C:\FrotaFy`)
2. Execute **`instalar.bat`** (duplo clique)
3. Aguarde a instalação (cria atalho na Área de Trabalho)

## Uso diário

- Use o atalho **"FrotaFy"** na Área de Trabalho
- Ou execute **`iniciar.vbs`** diretamente

O sistema abre automaticamente no navegador em `http://localhost:3000`

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| Dashboard | Visão geral, KPIs, alertas e gastos mensais |
| Veículos | Cadastro completo com quilometragem |
| Serviços | Registro de manutenções com peças e óleo |
| Alertas | Preventivos por km e/ou data |
| Combustível | Controle de abastecimentos e consumo médio |
| Financeiro | Análise de gastos por período e tipo |
| Configurações | Backup automático (local + Google Drive) e tipos de serviço |

## Backup

Configure em **Configurações → Backup**:
- **Local**: escolha uma pasta (detecta Google Drive, OneDrive, Dropbox automaticamente)
- **Google Drive**: conecte sua conta para backup automático na nuvem
- Backup automático a cada N horas configurável
- Máximo de 7 backups locais e 3 no Drive mantidos (rotação automática)

## Backup Google Drive (opcional)

Para ativar o backup no Google Drive:
1. Acesse o [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto e ative a **Google Drive API**
3. Em "Credenciais", crie um **OAuth 2.0 Client ID** (tipo: Desktop app)
4. Baixe o arquivo JSON e salve como **`credentials.json`** na pasta do projeto
5. No FrotaFy, vá em Configurações → Backup Google Drive → Conectar

## Atualizar

Via interface: Sidebar → "Atualizar sistema" (requer Git)
Via arquivo: execute `atualizar.bat`

## Dados

O banco de dados fica em `frotafy.db` na pasta do projeto.
Faça backups regulares via interface ou copie o arquivo `.db`.

## Fechar

Use o botão "Fechar sistema" na sidebar, ou feche a janela do terminal.
(Use o botão para encerrar corretamente — ele faz um backup final antes de fechar.)
