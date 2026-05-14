import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { google } from 'googleapis';
import { Readable } from 'stream';

const require = createRequire(import.meta.url);
const db   = require('./src/lib/db/database.cjs');
const XLSX = require('xlsx');

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── BACKUP CONFIG ────────────────────────────────────────────────────────────
const BACKUP_CFG        = path.join(__dirname, 'backup-config.json');
const GOOGLE_TOKEN_PATH = path.join(__dirname, 'google-token.json');
const GOOGLE_CRED_PATH  = path.join(__dirname, 'credentials.json');
let backupCfg = { intervaloHoras: 6, ultimoBackupDrive: null };
try {
  if (existsSync(BACKUP_CFG))
    backupCfg = { ...backupCfg, ...JSON.parse(readFileSync(BACKUP_CFG, 'utf8')) };
} catch {}

function salvarBackupCfg() {
  writeFileSync(BACKUP_CFG, JSON.stringify(backupCfg, null, 2));
}

// ─── GOOGLE DRIVE ─────────────────────────────────────────────────────────────
function getGoogleAuth() {
  if (!existsSync(GOOGLE_CRED_PATH)) return null;
  try {
    const creds = JSON.parse(readFileSync(GOOGLE_CRED_PATH, 'utf8'));
    const { client_id, client_secret } = creds.installed || creds.web || creds;
    return new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3000/api/google-drive/callback');
  } catch { return null; }
}

function getAuthedClient() {
  const auth = getGoogleAuth();
  if (!auth || !existsSync(GOOGLE_TOKEN_PATH)) return null;
  try {
    const token = JSON.parse(readFileSync(GOOGLE_TOKEN_PATH, 'utf8'));
    if (!token.access_token && !token.refresh_token) return null;
    auth.setCredentials(token);
    auth.on('tokens', tokens => {
      const merged = { ...auth.credentials, ...tokens };
      writeFileSync(GOOGLE_TOKEN_PATH, JSON.stringify(merged, null, 2));
    });
    return auth;
  } catch { return null; }
}

async function fazerBackupDrive() {
  const auth = getAuthedClient();
  if (!auth) throw new Error('Google Drive não conectado');
  const drive = google.drive({ version: 'v3', auth });

  const folderRes = await drive.files.list({
    q: "name='FrotaFy-Backup' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id)',
    spaces: 'drive'
  });
  let folderId;
  if (folderRes.data.files.length > 0) {
    folderId = folderRes.data.files[0].id;
  } else {
    const folder = await drive.files.create({
      requestBody: { name: 'FrotaFy-Backup', mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id'
    });
    folderId = folder.data.id;
  }

  const database = await db.getDb();
  const buffer = Buffer.from(database.export());
  const filename = `frotafy-backup-${localDate()}.db`;

  await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType: 'application/octet-stream', body: Readable.from(buffer) }
  });

  const listRes = await drive.files.list({
    q: `'${folderId}' in parents and name contains 'frotafy-backup-' and trashed=false`,
    orderBy: 'name',
    fields: 'files(id, name)'
  });
  const files = listRes.data.files || [];
  while (files.length > 3) {
    try { await drive.files.delete({ fileId: files.shift().id }); } catch {}
  }

  backupCfg.ultimoBackupDrive = new Date().toISOString();
  salvarBackupCfg();
}

let _driveBackupStatus = { running: false, erro: null };
let _backupTimer = null;
function iniciarBackupAutomatico() {
  if (_backupTimer) clearInterval(_backupTimer);
  if (!existsSync(GOOGLE_TOKEN_PATH) || !backupCfg.intervaloHoras) return;
  const ms = backupCfg.intervaloHoras * 60 * 60 * 1000;
  _backupTimer = setInterval(async () => {
    if (!getAuthedClient()) return;
    try { await fazerBackupDrive(); console.log('[backup] drive ok'); }
    catch (e) { console.error('[backup] drive erro:', e.message); }
  }, ms);
  console.log(`[backup] automático a cada ${backupCfg.intervaloHoras}h (google drive)`);
}
iniciarBackupAutomatico();

// ─── EXPRESS ──────────────────────────────────────────────────────────────────
const app  = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

app.use((req, res, next) => {
  res.setTimeout(20000, () => {
    if (!res.headersSent) res.status(503).json({ error: 'Timeout' });
  });
  next();
});

function route(fn) {
  return async (req, res, next) => {
    try { await fn(req, res, next); }
    catch (e) {
      console.error('[API]', req.method, req.path, e.message);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  };
}

db.getDb().then(() => {
  console.log('✅ Banco de dados pronto');
  if (getAuthedClient()) {
    _driveBackupStatus = { running: true, erro: null };
    fazerBackupDrive()
      .then(() => { _driveBackupStatus = { running: false, erro: null }; console.log('[startup] backup drive ok'); })
      .catch(e => { _driveBackupStatus = { running: false, erro: e.message }; console.error('[startup] backup drive erro:', e.message); });
  }
}).catch(err => console.error('❌ Erro ao iniciar banco:', err));

// ─── VEÍCULOS ─────────────────────────────────────────────────────────────────
app.get('/api/veiculos', route(async (req, res) => {
  await db.getDb();
  const inativos = req.query.inativos === 'true';
  res.json(db.getVeiculos(inativos));
}));

app.get('/api/veiculos/:id', route(async (req, res) => {
  await db.getDb();
  res.json(db.getVeiculo(req.params.id));
}));

app.post('/api/veiculos', route(async (req, res) => {
  await db.getDb();
  const { apelido, placa, marca, modelo, ano, cor, combustivel, km_atual, observacoes } = req.body;
  res.json(db.criarVeiculo(apelido, placa, marca, modelo, ano, cor, combustivel, km_atual, observacoes));
}));

app.put('/api/veiculos/:id', route(async (req, res) => {
  await db.getDb();
  const { apelido, placa, marca, modelo, ano, cor, combustivel, observacoes } = req.body;
  res.json(db.editarVeiculo(req.params.id, apelido, placa, marca, modelo, ano, cor, combustivel, observacoes));
}));

app.patch('/api/veiculos/:id/toggle', route(async (req, res) => {
  await db.getDb();
  res.json(db.toggleVeiculo(req.params.id));
}));

app.post('/api/veiculos/:id/km', route(async (req, res) => {
  await db.getDb();
  const { km, data } = req.body;
  res.json(db.atualizarKm(req.params.id, km, data));
}));

app.get('/api/veiculos/:id/km-historico', route(async (req, res) => {
  await db.getDb();
  res.json(db.getKmHistorico(req.params.id));
}));

// ─── TIPOS DE SERVIÇO ─────────────────────────────────────────────────────────
app.get('/api/tipos-servico', route(async (req, res) => {
  await db.getDb();
  res.json(db.getTiposServico());
}));

app.post('/api/tipos-servico', route(async (req, res) => {
  await db.getDb();
  const { nome, icone, cor } = req.body;
  res.json(db.criarTipoServico(nome, icone, cor));
}));

app.put('/api/tipos-servico/:id', route(async (req, res) => {
  await db.getDb();
  const { nome, icone, cor } = req.body;
  res.json(db.editarTipoServico(req.params.id, nome, icone, cor));
}));

app.delete('/api/tipos-servico/:id', route(async (req, res) => {
  await db.getDb();
  res.json(db.deletarTipoServico(req.params.id));
}));

// ─── SERVIÇOS ─────────────────────────────────────────────────────────────────
app.get('/api/servicos', route(async (req, res) => {
  await db.getDb();
  const { veiculo_id, limite } = req.query;
  res.json(db.getServicos(veiculo_id || null, limite || null));
}));

app.get('/api/servicos/:id', route(async (req, res) => {
  await db.getDb();
  res.json(db.getServico(req.params.id));
}));

app.post('/api/servicos', route(async (req, res) => {
  await db.getDb();
  const { veiculo_id, tipo_servico_id, tipo_servico_custom, data, km_no_momento, valor_total, valor_mao_obra, oleo_tipo, oleo_viscosidade, oleo_marca, oleo_quantidade, observacoes, pecas } = req.body;
  res.json(db.registrarServico(veiculo_id, tipo_servico_id, tipo_servico_custom, data, km_no_momento, valor_total, valor_mao_obra, oleo_tipo, oleo_viscosidade, oleo_marca, oleo_quantidade, observacoes, pecas));
}));

app.put('/api/servicos/:id', route(async (req, res) => {
  await db.getDb();
  const { tipo_servico_id, tipo_servico_custom, data, km_no_momento, valor_total, valor_mao_obra, oleo_tipo, oleo_viscosidade, oleo_marca, oleo_quantidade, observacoes, pecas } = req.body;
  res.json(db.editarServico(req.params.id, tipo_servico_id, tipo_servico_custom, data, km_no_momento, valor_total, valor_mao_obra, oleo_tipo, oleo_viscosidade, oleo_marca, oleo_quantidade, observacoes, pecas));
}));

app.delete('/api/servicos/:id', route(async (req, res) => {
  await db.getDb();
  res.json(db.deletarServico(req.params.id));
}));

// ─── ALERTAS ──────────────────────────────────────────────────────────────────
app.get('/api/alertas', route(async (req, res) => {
  await db.getDb();
  const { veiculo_id } = req.query;
  res.json(db.getAlertas(veiculo_id || null));
}));

app.post('/api/alertas', route(async (req, res) => {
  await db.getDb();
  const { veiculo_id, tipo_servico_id, intervalo_km, intervalo_dias } = req.body;
  res.json(db.criarAlerta(veiculo_id, tipo_servico_id, intervalo_km, intervalo_dias));
}));

app.put('/api/alertas/:id', route(async (req, res) => {
  await db.getDb();
  const { intervalo_km, intervalo_dias, ultimo_km, ultima_data } = req.body;
  res.json(db.editarAlerta(req.params.id, intervalo_km, intervalo_dias, ultimo_km, ultima_data));
}));

app.delete('/api/alertas/:id', route(async (req, res) => {
  await db.getDb();
  res.json(db.deletarAlerta(req.params.id));
}));

app.post('/api/alertas/padrao/:veiculo_id', route(async (req, res) => {
  await db.getDb();
  db.criarAlertasPadrao(req.params.veiculo_id);
  db.save();
  res.json({ success: true });
}));

// ─── ABASTECIMENTOS ───────────────────────────────────────────────────────────
app.get('/api/abastecimentos', route(async (req, res) => {
  await db.getDb();
  const { veiculo_id, mes } = req.query;
  res.json(db.getAbastecimentos(veiculo_id || null, mes || null));
}));

app.post('/api/abastecimentos', route(async (req, res) => {
  await db.getDb();
  const { veiculo_id, data, km_no_momento, combustivel, litros, valor_total, posto, observacoes } = req.body;
  res.json(db.registrarAbastecimento(veiculo_id, data, km_no_momento, combustivel, litros, valor_total, posto, observacoes));
}));

app.put('/api/abastecimentos/:id', route(async (req, res) => {
  await db.getDb();
  const { data, km_no_momento, combustivel, litros, valor_total, posto, observacoes } = req.body;
  res.json(db.editarAbastecimento(req.params.id, data, km_no_momento, combustivel, litros, valor_total, posto, observacoes));
}));

app.delete('/api/abastecimentos/:id', route(async (req, res) => {
  await db.getDb();
  res.json(db.deletarAbastecimento(req.params.id));
}));

app.get('/api/abastecimentos/consumo/:veiculo_id', route(async (req, res) => {
  await db.getDb();
  res.json({ consumo: db.getConsumoMedio(req.params.veiculo_id) });
}));

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
app.get('/api/dashboard', route(async (req, res) => {
  await db.getDb();
  res.json(db.getDashboard());
}));

app.get('/api/financeiro', route(async (req, res) => {
  await db.getDb();
  const { veiculo_id, periodo } = req.query;
  res.json(db.getFinanceiro(veiculo_id || null, periodo || 'mes'));
}));

// ─── EXPORTAR EXCEL ───────────────────────────────────────────────────────────
app.get('/api/exportar', route(async (req, res) => {
  await db.getDb();
  const { veiculo_id } = req.query;
  const servicos = db.getServicos(veiculo_id || null, null);
  const abastecimentos = db.getAbastecimentos(veiculo_id || null, null);
  const veiculos = veiculo_id ? [db.getVeiculo(veiculo_id)] : db.getVeiculos();

  const wb = XLSX.utils.book_new();

  // Resumo
  const resumoRows = [['Car Manager — Relatório de Manutenção'], [], ['Veículo', 'Marca', 'Modelo', 'Ano', 'KM Atual', 'Total Manutenção', 'Total Combustível']];
  veiculos.forEach(v => {
    const totalMan = servicos.filter(s => s.veiculo_id === v.id).reduce((acc, s) => acc + s.valor_total, 0);
    const totalComb = abastecimentos.filter(a => a.veiculo_id === v.id).reduce((acc, a) => acc + a.valor_total, 0);
    resumoRows.push([v.apelido, v.marca, v.modelo, v.ano, v.km_atual, totalMan, totalComb]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumoRows), 'Resumo');

  // Serviços
  const servicosRows = [['Data', 'Veículo', 'Serviço', 'KM', 'Valor Total', 'Mão de Obra', 'Peças', 'Observações']];
  servicos.forEach(s => {
    const pecasStr = s.pecas?.map(p => `${p.nome} (${p.marca})`).join(', ') || '';
    servicosRows.push([s.data, s.veiculo_apelido, s.tipo_nome || s.tipo_servico_custom, s.km_no_momento, s.valor_total, s.valor_mao_obra, pecasStr, s.observacoes]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(servicosRows), 'Manutenções');

  // Abastecimentos
  const abastRows = [['Data', 'Veículo', 'Combustível', 'Litros', 'Valor Total', 'R$/L', 'KM', 'Posto']];
  abastecimentos.forEach(a => {
    abastRows.push([a.data, a.veiculo_apelido, a.combustivel, a.litros, a.valor_total, a.valor_por_litro, a.km_no_momento, a.posto]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(abastRows), 'Abastecimentos');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', `attachment; filename="car-manager-relatorio.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}));

// ─── BACKUP ───────────────────────────────────────────────────────────────────
app.get('/api/backup', route(async (req, res) => {
  const database = await db.getDb();
  const data = database.export();
  const filename = `frotafy-backup-${localDate()}.db`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(Buffer.from(data));
}));

// ─── GOOGLE DRIVE ROTAS ───────────────────────────────────────────────────────
app.get('/api/google-drive/auth-url', route(async (req, res) => {
  const auth = getGoogleAuth();
  if (!auth) return res.json({ ok: false, error: 'credentials.json não encontrado na pasta do projeto' });
  const url = auth.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent'
  });
  res.json({ ok: true, url });
}));

app.get('/api/google-drive/callback', route(async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.redirect('/?gdrive=erro');
  if (!code) return res.status(400).send('Código não fornecido');
  const auth = getGoogleAuth();
  if (!auth) return res.status(500).send('credentials.json não encontrado');
  const { tokens } = await auth.getToken(String(code));
  let email = null;
  if (tokens.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
      email = payload.email;
    } catch {}
  }
  writeFileSync(GOOGLE_TOKEN_PATH, JSON.stringify({ ...tokens, email }, null, 2));
  iniciarBackupAutomatico();
  res.redirect('/');
}));

app.get('/api/google-drive/status', route(async (req, res) => {
  if (!existsSync(GOOGLE_CRED_PATH)) return res.json({ conectado: false, semCredentials: true });
  if (!existsSync(GOOGLE_TOKEN_PATH)) return res.json({ conectado: false });
  try {
    const token = JSON.parse(readFileSync(GOOGLE_TOKEN_PATH, 'utf8'));
    if (!token.access_token && !token.refresh_token) return res.json({ conectado: false });
    res.json({ conectado: true, email: token.email || null, ultimoBackup: backupCfg.ultimoBackupDrive || null });
  } catch {
    res.json({ conectado: false });
  }
}));

app.get('/api/google-drive/config', (req, res) => {
  res.json({ intervaloHoras: backupCfg.intervaloHoras || 6 });
});

app.post('/api/google-drive/config', route(async (req, res) => {
  backupCfg.intervaloHoras = parseInt(req.body.intervaloHoras) || 6;
  salvarBackupCfg();
  iniciarBackupAutomatico();
  res.json({ ok: true });
}));

app.delete('/api/google-drive/desconectar', route(async (req, res) => {
  try { unlinkSync(GOOGLE_TOKEN_PATH); } catch {}
  backupCfg.ultimoBackupDrive = null;
  salvarBackupCfg();
  iniciarBackupAutomatico();
  res.json({ ok: true });
}));

app.get('/api/google-drive/backup-status', (req, res) => {
  res.json(_driveBackupStatus);
});

app.post('/api/google-drive/backup-agora', route(async (req, res) => {
  _driveBackupStatus = { running: true, erro: null };
  try {
    await fazerBackupDrive();
    _driveBackupStatus = { running: false, erro: null };
    res.json({ ok: true, ultimoBackup: backupCfg.ultimoBackupDrive });
  } catch (e) {
    _driveBackupStatus = { running: false, erro: e.message };
    throw e;
  }
}));

// ─── ATUALIZAR ────────────────────────────────────────────────────────────────
let _updateStatus = null;
let _hasUpdate    = false;

function runCmd(cmd) {
  return new Promise((resolve, reject) => {
    const proc = spawn('cmd', ['/c', cmd], { cwd: __dirname, shell: false });
    let out = '';
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.stderr.on('data', d => { out += d.toString(); });
    proc.on('close', code => code === 0 ? resolve(out) : reject(new Error(out || `Código ${code}`)));
  });
}

async function gitDisponivel() {
  try { await runCmd('git --version'); return true; } catch { return false; }
}

async function checkForUpdates() {
  try {
    await runCmd('git fetch origin main');
    const behind = (await runCmd('git rev-list HEAD..origin/main --count')).trim();
    _hasUpdate = parseInt(behind) > 0;
  } catch {}
}
checkForUpdates();
setInterval(checkForUpdates, 30 * 60 * 1000);

app.get('/api/atualizar/check', (req, res) => res.json({ hasUpdate: _hasUpdate }));

app.post('/api/atualizar', async (req, res) => {
  if (_updateStatus?.running) return res.json({ ok: false, error: 'Já em andamento' });
  if (!await gitDisponivel()) return res.json({ ok: false, error: 'Git não instalado. Acesse git-scm.com/download/win.' });
  _updateStatus = { running: true, etapa: 'Baixando...', log: [] };
  res.json({ ok: true });
  (async () => {
    const log = (msg) => { _updateStatus.log.push(msg); };
    try {
      log('Baixando atualizações...');
      _updateStatus.etapa = 'Baixando atualizações...';
      await runCmd('git fetch origin main');
      await runCmd('git reset --hard origin/main');
      log('Instalando dependências...');
      _updateStatus.etapa = 'Instalando dependências...';
      await runCmd('npm install');
      log('Compilando...');
      _updateStatus.etapa = 'Compilando...';
      await runCmd('npm run build');
      log('Concluído!');
      _updateStatus = { done: true, etapa: 'Reiniciando...', log: _updateStatus.log };
      const restartCjs = path.join(__dirname, '_restart.cjs');
      writeFileSync(restartCjs, [
        `const { spawn } = require('child_process');`,
        `const fs = require('fs');`,
        `try { fs.unlinkSync(__filename); } catch {}`,
        `setTimeout(() => {`,
        `  spawn(process.execPath, [${JSON.stringify(path.join(__dirname, 'server.js'))}], {`,
        `    detached: true, stdio: 'ignore', cwd: ${JSON.stringify(__dirname)}`,
        `  }).unref();`,
        `}, 3000);`,
      ].join('\n'));
      spawn(process.execPath, [restartCjs], { detached: true, stdio: 'ignore', cwd: __dirname }).unref();
      process.exit(0);
    } catch (e) {
      log('Erro: ' + e.message);
      _updateStatus = { error: e.message, etapa: 'Erro', log: _updateStatus.log };
    }
  })();
});

app.get('/api/atualizar/status', (req, res) => res.json(_updateStatus || { idle: true }));

// ─── SHUTDOWN ─────────────────────────────────────────────────────────────────
app.post('/api/shutdown', (req, res) => {
  res.json({ ok: true });
  const doExit = () => setTimeout(() => process.exit(0), 200);
  if (getAuthedClient()) {
    const t = setTimeout(doExit, 8000);
    fazerBackupDrive()
      .then(() => { clearTimeout(t); console.log('[shutdown] backup drive ok'); doExit(); })
      .catch(e => { clearTimeout(t); console.error('[shutdown] backup drive erro:', e.message); doExit(); });
  } else {
    doExit();
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚗 FrotaFy rodando em http://localhost:${PORT}\n`);
});
