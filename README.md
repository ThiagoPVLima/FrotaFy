# FrotaFy

Gerenciador de frota pessoal para Windows. Controle manutenções, abastecimentos, alertas preventivos e gastos da sua frota com interface moderna e backup automático.

---

## Recursos

- **Veículos** — cadastro com foto, cor, marca, modelo e quilometragem atual
- **Serviços** — registro de manutenções com tipo, valor, peças e dados de óleo
- **Abastecimento** — histórico de abastecimentos com litros, valor e média de consumo
- **Alertas preventivos** — lembretes por km ou dias (troca de óleo, revisão, IPVA, etc.)
- **Financeiro** — análise de gastos por período e por veículo com gráficos
- **Backup automático** — local (pasta configurável) e Google Drive
- **Exportação** — planilha Excel com todo o histórico

---

## Instalação

**Requisitos:** Windows 10/11 com Node.js 18+ instalado.

1. Clone o repositório:
   ```
   git clone https://github.com/ThiagoPVLima/FrotaFy.git
   cd FrotaFy
   ```

2. Execute o instalador:
   ```
   instalar.bat
   ```

O instalador instala as dependências, compila o frontend, cria o atalho na área de trabalho e inicia o app automaticamente.

---

## Uso

- **Iniciar:** duplo clique no atalho `FrotaFy` na área de trabalho, ou execute `iniciar.bat`
- **Parar:** feche a janela do terminal ou pressione `Ctrl+C`
- **Atualizar:** execute `atualizar.bat` — busca a versão mais recente do GitHub

O app roda localmente em `http://localhost:3000`.

---

## Backup no Google Drive

1. Acesse **Configurações → Google Drive** dentro do app
2. Clique em **Conectar com Google Drive** e autorize no navegador
3. Configure o intervalo de backup (padrão: 6 horas)

Os backups ficam na pasta `FrotaFy-Backup` do seu Google Drive.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Svelte 4 + TypeScript |
| Build | Vite 5 |
| Backend | Node.js + Express |
| Banco | SQLite via sql.js |
| Cloud | Google Drive API v3 |

---

## Licença

MIT
