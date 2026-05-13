const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../../frotafy.db');

let db = null;

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  createTables();
  seedIfEmpty();
  return db;
}

function save() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS veiculos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apelido TEXT NOT NULL,
      placa TEXT,
      marca TEXT NOT NULL,
      modelo TEXT NOT NULL,
      ano INTEGER,
      cor TEXT,
      combustivel TEXT DEFAULT 'flex',
      km_atual REAL NOT NULL DEFAULT 0,
      km_inicial REAL NOT NULL DEFAULT 0,
      observacoes TEXT DEFAULT '',
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS km_historico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      veiculo_id INTEGER NOT NULL,
      km REAL NOT NULL,
      data TEXT NOT NULL DEFAULT (date('now')),
      fonte TEXT NOT NULL DEFAULT 'manual',
      FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)
    );

    CREATE INDEX IF NOT EXISTS idx_km_historico_veiculo ON km_historico(veiculo_id, data DESC);

    CREATE TABLE IF NOT EXISTS tipos_servico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      icone TEXT DEFAULT '🔧',
      cor TEXT DEFAULT '#6b7280',
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS servicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      veiculo_id INTEGER NOT NULL,
      tipo_servico_id INTEGER,
      tipo_servico_custom TEXT,
      data TEXT NOT NULL DEFAULT (date('now')),
      km_no_momento REAL NOT NULL DEFAULT 0,
      valor_total REAL NOT NULL DEFAULT 0,
      valor_mao_obra REAL DEFAULT 0,
      oleo_tipo TEXT DEFAULT '',
      oleo_viscosidade TEXT DEFAULT '',
      oleo_marca TEXT DEFAULT '',
      oleo_quantidade REAL DEFAULT 0,
      observacoes TEXT DEFAULT '',
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (veiculo_id) REFERENCES veiculos(id),
      FOREIGN KEY (tipo_servico_id) REFERENCES tipos_servico(id)
    );

    CREATE INDEX IF NOT EXISTS idx_servicos_veiculo ON servicos(veiculo_id, data DESC);

    CREATE TABLE IF NOT EXISTS pecas_servico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      servico_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      marca TEXT DEFAULT '',
      quantidade REAL NOT NULL DEFAULT 1,
      valor_unitario REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (servico_id) REFERENCES servicos(id)
    );

    CREATE TABLE IF NOT EXISTS alertas_preventivos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      veiculo_id INTEGER NOT NULL,
      tipo_servico_id INTEGER NOT NULL,
      intervalo_km REAL,
      intervalo_dias INTEGER,
      ultimo_km REAL DEFAULT 0,
      ultima_data TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (veiculo_id) REFERENCES veiculos(id),
      FOREIGN KEY (tipo_servico_id) REFERENCES tipos_servico(id)
    );

    CREATE TABLE IF NOT EXISTS abastecimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      veiculo_id INTEGER NOT NULL,
      data TEXT NOT NULL DEFAULT (date('now')),
      km_no_momento REAL NOT NULL DEFAULT 0,
      combustivel TEXT NOT NULL DEFAULT 'gasolina',
      litros REAL NOT NULL DEFAULT 0,
      valor_total REAL NOT NULL DEFAULT 0,
      valor_por_litro REAL DEFAULT 0,
      posto TEXT DEFAULT '',
      observacoes TEXT DEFAULT '',
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)
    );

    CREATE INDEX IF NOT EXISTS idx_abastecimentos_veiculo ON abastecimentos(veiculo_id, data DESC);

    CREATE TABLE IF NOT EXISTS fotos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entidade TEXT NOT NULL,
      entidade_id INTEGER NOT NULL,
      caminho TEXT NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const migrations = [
    ['ALTER TABLE veiculos ADD COLUMN cor TEXT DEFAULT \'\'', null],
    ['ALTER TABLE servicos ADD COLUMN oleo_tipo TEXT DEFAULT \'\'', null],
    ['ALTER TABLE servicos ADD COLUMN oleo_viscosidade TEXT DEFAULT \'\'', null],
    ['ALTER TABLE servicos ADD COLUMN oleo_marca TEXT DEFAULT \'\'', null],
    ['ALTER TABLE servicos ADD COLUMN oleo_quantidade REAL DEFAULT 0', null],
    ['ALTER TABLE abastecimentos ADD COLUMN posto TEXT DEFAULT \'\'', null],
    ['ALTER TABLE abastecimentos ADD COLUMN observacoes TEXT DEFAULT \'\'', null],
  ];

  migrations.forEach(([alter, followUp]) => {
    try {
      db.run(alter);
    } catch (e) {
      if (!e.message.includes('duplicate column')) {
        console.error('[DB migration ERRO]', e.message);
      }
    }
    if (followUp) { try { db.run(followUp); } catch (e) {} }
  });

  save();
}

function seedIfEmpty() {
  const count = db.exec('SELECT COUNT(*) as c FROM tipos_servico')[0];
  if (count && count.values[0][0] > 0) return;

  const tipos = [
    { nome: 'Troca de óleo', icone: '🛢️', cor: '#f59e0b' },
    { nome: 'Filtro de ar', icone: '💨', cor: '#3b82f6' },
    { nome: 'Filtro de combustível', icone: '⛽', cor: '#6366f1' },
    { nome: 'Filtro de cabine', icone: '🌬️', cor: '#8b5cf6' },
    { nome: 'Alinhamento', icone: '🎯', cor: '#10b981' },
    { nome: 'Balanceamento', icone: '⚖️', cor: '#14b8a6' },
    { nome: 'Rodízio de pneus', icone: '🔄', cor: '#6b7280' },
    { nome: 'Revisão geral', icone: '🔍', cor: '#290a42' },
    { nome: 'Freios', icone: '🛑', cor: '#ef4444' },
    { nome: 'Pastilha de freio', icone: '🔩', cor: '#dc2626' },
    { nome: 'Fluido de freio', icone: '💧', cor: '#2563eb' },
    { nome: 'Velas', icone: '⚡', cor: '#f97316' },
    { nome: 'Correia dentada', icone: '⚙️', cor: '#64748b' },
    { nome: 'Correia auxiliar', icone: '🔗', cor: '#78716c' },
    { nome: 'Amortecedor', icone: '🏎️', cor: '#7c3aed' },
    { nome: 'Bateria', icone: '🔋', cor: '#16a34a' },
    { nome: 'Ar condicionado', icone: '❄️', cor: '#0ea5e9' },
    { nome: 'Pneu', icone: '🛞', cor: '#1c1917' },
    { nome: 'Embreagem', icone: '🔧', cor: '#854d0e' },
    { nome: 'Serviço livre', icone: '📋', cor: '#94a3b8' },
  ];

  tipos.forEach(t => {
    db.run('INSERT INTO tipos_servico (nome, icone, cor) VALUES (?, ?, ?)', [t.nome, t.icone, t.cor]);
  });

  save();
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function toObjects(res) {
  if (!res || !res.length) return [];
  const { columns, values } = res[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── VEÍCULOS ────────────────────────────────────────────────────────────────
function getVeiculos(incluirInativos = false) {
  const filtro = incluirInativos ? '' : 'WHERE v.ativo = 1';
  const res = db.exec(`
    SELECT v.*,
      (SELECT km FROM km_historico WHERE veiculo_id = v.id ORDER BY data DESC, id DESC LIMIT 1) as km_ultimo_registro,
      (SELECT data FROM km_historico WHERE veiculo_id = v.id ORDER BY data DESC, id DESC LIMIT 1) as km_ultima_data,
      (SELECT COUNT(*) FROM servicos WHERE veiculo_id = v.id) as total_servicos,
      (SELECT COALESCE(SUM(valor_total), 0) FROM servicos WHERE veiculo_id = v.id) as total_gasto
    FROM veiculos v
    ${filtro}
    ORDER BY v.apelido
  `);
  return toObjects(res);
}

function getVeiculo(id) {
  const res = db.exec(`
    SELECT v.*,
      (SELECT km FROM km_historico WHERE veiculo_id = v.id ORDER BY data DESC, id DESC LIMIT 1) as km_ultimo_registro,
      (SELECT data FROM km_historico WHERE veiculo_id = v.id ORDER BY data DESC, id DESC LIMIT 1) as km_ultima_data,
      (SELECT COUNT(*) FROM servicos WHERE veiculo_id = v.id) as total_servicos,
      (SELECT COALESCE(SUM(valor_total), 0) FROM servicos WHERE veiculo_id = v.id) as total_gasto
    FROM veiculos v
    WHERE v.id = ?
  `, [id]);
  return toObjects(res)[0] || null;
}

function criarVeiculo(apelido, placa, marca, modelo, ano, cor, combustivel, km_atual, observacoes) {
  const km = km_atual || 0;
  db.run(
    'INSERT INTO veiculos (apelido, placa, marca, modelo, ano, cor, combustivel, km_atual, km_inicial, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [apelido, placa || '', marca, modelo, ano || null, cor || '', combustivel || 'flex', km, km, observacoes || '']
  );
  const res = db.exec('SELECT last_insert_rowid() as id');
  const id = res[0].values[0][0];
  if (km > 0) {
    db.run('INSERT INTO km_historico (veiculo_id, km, data, fonte) VALUES (?, ?, ?, ?)', [id, km, hoje(), 'manual']);
  }
  // Criar alertas padrão para o veículo
  criarAlertasPadrao(id);
  save();
  return { success: true, id };
}

function editarVeiculo(id, apelido, placa, marca, modelo, ano, cor, combustivel, observacoes) {
  db.run(
    'UPDATE veiculos SET apelido=?, placa=?, marca=?, modelo=?, ano=?, cor=?, combustivel=?, observacoes=? WHERE id=?',
    [apelido, placa || '', marca, modelo, ano || null, cor || '', combustivel || 'flex', observacoes || '', id]
  );
  save();
  return { success: true };
}

function toggleVeiculo(id) {
  db.run('UPDATE veiculos SET ativo = CASE WHEN ativo=1 THEN 0 ELSE 1 END WHERE id=?', [id]);
  save();
  return { success: true };
}

function atualizarKm(veiculo_id, km, data) {
  const veic = db.exec('SELECT km_atual FROM veiculos WHERE id=?', [veiculo_id]);
  const kmAtual = veic[0]?.values[0][0] || 0;
  if (km > kmAtual) {
    db.run('UPDATE veiculos SET km_atual=? WHERE id=?', [km, veiculo_id]);
  }
  db.run('INSERT INTO km_historico (veiculo_id, km, data, fonte) VALUES (?, ?, ?, ?)',
    [veiculo_id, km, data || hoje(), 'manual']);
  recalcularAlertas(veiculo_id);
  save();
  return { success: true };
}

function getKmHistorico(veiculo_id) {
  const res = db.exec(`
    SELECT * FROM km_historico WHERE veiculo_id = ? ORDER BY data DESC, id DESC LIMIT 50
  `, [veiculo_id]);
  return toObjects(res);
}

// ─── TIPOS DE SERVIÇO ─────────────────────────────────────────────────────────
function getTiposServico() {
  const res = db.exec('SELECT * FROM tipos_servico WHERE ativo = 1 ORDER BY nome');
  return toObjects(res);
}

function criarTipoServico(nome, icone, cor) {
  db.run('INSERT INTO tipos_servico (nome, icone, cor) VALUES (?, ?, ?)', [nome, icone || '🔧', cor || '#6b7280']);
  save();
  return { success: true };
}

function editarTipoServico(id, nome, icone, cor) {
  db.run('UPDATE tipos_servico SET nome=?, icone=?, cor=? WHERE id=?', [nome, icone || '🔧', cor || '#6b7280', id]);
  save();
  return { success: true };
}

function deletarTipoServico(id) {
  db.run('UPDATE tipos_servico SET ativo=0 WHERE id=?', [id]);
  save();
  return { success: true };
}

// ─── SERVIÇOS ─────────────────────────────────────────────────────────────────
function getServicos(veiculo_id, limite) {
  const filtroVeiculo = veiculo_id ? `AND s.veiculo_id = ${veiculo_id}` : '';
  const limiteSql = limite ? `LIMIT ${limite}` : '';
  const res = db.exec(`
    SELECT s.*, v.apelido as veiculo_apelido, v.marca as veiculo_marca, v.modelo as veiculo_modelo,
           t.nome as tipo_nome, t.icone as tipo_icone, t.cor as tipo_cor
    FROM servicos s
    JOIN veiculos v ON v.id = s.veiculo_id
    LEFT JOIN tipos_servico t ON t.id = s.tipo_servico_id
    WHERE 1=1 ${filtroVeiculo}
    ORDER BY s.data DESC, s.id DESC
    ${limiteSql}
  `);
  const servicos = toObjects(res);
  return servicos.map(s => ({ ...s, pecas: getPecasServico(s.id) }));
}

function getServico(id) {
  const res = db.exec(`
    SELECT s.*, v.apelido as veiculo_apelido, t.nome as tipo_nome, t.icone as tipo_icone, t.cor as tipo_cor
    FROM servicos s
    JOIN veiculos v ON v.id = s.veiculo_id
    LEFT JOIN tipos_servico t ON t.id = s.tipo_servico_id
    WHERE s.id = ?
  `, [id]);
  const s = toObjects(res)[0];
  if (!s) return null;
  return { ...s, pecas: getPecasServico(id) };
}

function getPecasServico(servico_id) {
  const res = db.exec('SELECT * FROM pecas_servico WHERE servico_id = ?', [servico_id]);
  return toObjects(res);
}

function registrarServico(veiculo_id, tipo_servico_id, tipo_servico_custom, data, km_no_momento, valor_total, valor_mao_obra, oleo_tipo, oleo_viscosidade, oleo_marca, oleo_quantidade, observacoes, pecas) {
  const km = km_no_momento || 0;
  db.run(`
    INSERT INTO servicos (veiculo_id, tipo_servico_id, tipo_servico_custom, data, km_no_momento, valor_total, valor_mao_obra, oleo_tipo, oleo_viscosidade, oleo_marca, oleo_quantidade, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [veiculo_id, tipo_servico_id || null, tipo_servico_custom || '', data, km, valor_total || 0, valor_mao_obra || 0, oleo_tipo || '', oleo_viscosidade || '', oleo_marca || '', oleo_quantidade || 0, observacoes || '']);

  const res = db.exec('SELECT last_insert_rowid() as id');
  const servicoId = res[0].values[0][0];

  if (pecas && pecas.length) {
    pecas.forEach(p => {
      db.run('INSERT INTO pecas_servico (servico_id, nome, marca, quantidade, valor_unitario) VALUES (?, ?, ?, ?, ?)',
        [servicoId, p.nome, p.marca || '', p.quantidade || 1, p.valor_unitario || 0]);
    });
  }

  // Atualizar km do veículo se for maior que o atual
  const veic = db.exec('SELECT km_atual FROM veiculos WHERE id=?', [veiculo_id]);
  const kmAtual = veic[0]?.values[0][0] || 0;
  if (km > kmAtual) {
    db.run('UPDATE veiculos SET km_atual=? WHERE id=?', [km, veiculo_id]);
    db.run('INSERT INTO km_historico (veiculo_id, km, data, fonte) VALUES (?, ?, ?, ?)', [veiculo_id, km, data, 'servico']);
  }

  // Atualizar alerta preventivo correspondente
  if (tipo_servico_id) {
    db.run(`
      UPDATE alertas_preventivos
      SET ultimo_km = ?, ultima_data = ?
      WHERE veiculo_id = ? AND tipo_servico_id = ?
    `, [km, data, veiculo_id, tipo_servico_id]);
  }

  recalcularAlertas(veiculo_id);
  save();
  return { success: true, id: servicoId };
}

function editarServico(id, tipo_servico_id, tipo_servico_custom, data, km_no_momento, valor_total, valor_mao_obra, oleo_tipo, oleo_viscosidade, oleo_marca, oleo_quantidade, observacoes, pecas) {
  db.run(`
    UPDATE servicos SET tipo_servico_id=?, tipo_servico_custom=?, data=?, km_no_momento=?, valor_total=?, valor_mao_obra=?, oleo_tipo=?, oleo_viscosidade=?, oleo_marca=?, oleo_quantidade=?, observacoes=?
    WHERE id=?
  `, [tipo_servico_id || null, tipo_servico_custom || '', data, km_no_momento || 0, valor_total || 0, valor_mao_obra || 0, oleo_tipo || '', oleo_viscosidade || '', oleo_marca || '', oleo_quantidade || 0, observacoes || '', id]);

  db.run('DELETE FROM pecas_servico WHERE servico_id=?', [id]);
  if (pecas && pecas.length) {
    pecas.forEach(p => {
      db.run('INSERT INTO pecas_servico (servico_id, nome, marca, quantidade, valor_unitario) VALUES (?, ?, ?, ?, ?)',
        [id, p.nome, p.marca || '', p.quantidade || 1, p.valor_unitario || 0]);
    });
  }

  const s = db.exec('SELECT veiculo_id FROM servicos WHERE id=?', [id]);
  const veiculo_id = s[0]?.values[0][0];
  if (veiculo_id) recalcularAlertas(veiculo_id);
  save();
  return { success: true };
}

function deletarServico(id) {
  const s = db.exec('SELECT veiculo_id FROM servicos WHERE id=?', [id]);
  const veiculo_id = s[0]?.values[0][0];
  db.run('DELETE FROM pecas_servico WHERE servico_id=?', [id]);
  db.run('DELETE FROM servicos WHERE id=?', [id]);
  if (veiculo_id) recalcularAlertas(veiculo_id);
  save();
  return { success: true };
}

// ─── ALERTAS PREVENTIVOS ──────────────────────────────────────────────────────
function criarAlertasPadrao(veiculo_id) {
  const alertasPadrao = [
    { tipo_nome: 'Troca de óleo', intervalo_km: 10000, intervalo_dias: 365 },
    { tipo_nome: 'Filtro de ar', intervalo_km: 15000, intervalo_dias: null },
    { tipo_nome: 'Filtro de combustível', intervalo_km: 20000, intervalo_dias: null },
    { tipo_nome: 'Alinhamento', intervalo_km: 10000, intervalo_dias: null },
    { tipo_nome: 'Balanceamento', intervalo_km: 10000, intervalo_dias: null },
    { tipo_nome: 'Revisão geral', intervalo_km: 10000, intervalo_dias: 365 },
    { tipo_nome: 'Correia dentada', intervalo_km: 60000, intervalo_dias: 1460 },
    { tipo_nome: 'Fluido de freio', intervalo_km: null, intervalo_dias: 730 },
    { tipo_nome: 'Bateria', intervalo_km: null, intervalo_dias: 1095 },
  ];

  alertasPadrao.forEach(a => {
    const tipoRes = db.exec('SELECT id FROM tipos_servico WHERE nome = ? AND ativo = 1', [a.tipo_nome]);
    if (tipoRes.length && tipoRes[0].values.length) {
      const tipoId = tipoRes[0].values[0][0];
      const jaExiste = db.exec('SELECT id FROM alertas_preventivos WHERE veiculo_id=? AND tipo_servico_id=?', [veiculo_id, tipoId]);
      if (!jaExiste.length || !jaExiste[0].values.length) {
        db.run('INSERT INTO alertas_preventivos (veiculo_id, tipo_servico_id, intervalo_km, intervalo_dias) VALUES (?, ?, ?, ?)',
          [veiculo_id, tipoId, a.intervalo_km || null, a.intervalo_dias || null]);
      }
    }
  });
}

function recalcularAlertas(veiculo_id) {
  // Apenas marca o timestamp de recálculo - o cálculo real é feito na query de leitura
  // para garantir que sempre usa os dados mais recentes
}

function getAlertas(veiculo_id) {
  const filtro = veiculo_id ? `AND a.veiculo_id = ${veiculo_id}` : '';
  const res = db.exec(`
    SELECT a.*, t.nome as tipo_nome, t.icone as tipo_icone, t.cor as tipo_cor,
           v.apelido as veiculo_apelido, v.km_atual as veiculo_km_atual
    FROM alertas_preventivos a
    JOIN tipos_servico t ON t.id = a.tipo_servico_id
    JOIN veiculos v ON v.id = a.veiculo_id
    WHERE a.ativo = 1 AND v.ativo = 1
    ${filtro}
    ORDER BY v.apelido, t.nome
  `);
  const alertas = toObjects(res);

  return alertas.map(a => {
    const kmAtual = a.veiculo_km_atual || 0;
    let status = 'ok';
    let km_faltando = null;
    let km_vencido = null;
    let dias_faltando = null;
    let dias_vencido = null;
    let percentual = 0;

    if (a.intervalo_km && a.ultimo_km) {
      const kmProximo = a.ultimo_km + a.intervalo_km;
      const kmPercorrido = kmAtual - a.ultimo_km;
      percentual = Math.min(100, Math.round((kmPercorrido / a.intervalo_km) * 100));
      if (kmAtual >= kmProximo) {
        status = 'vencido';
        km_vencido = Math.round(kmAtual - kmProximo);
      } else if (percentual >= 80) {
        status = 'atencao';
        km_faltando = Math.round(kmProximo - kmAtual);
      } else {
        km_faltando = Math.round(kmProximo - kmAtual);
      }
    }

    if (a.intervalo_dias && a.ultima_data) {
      const ultima = new Date(a.ultima_data);
      const hoje_d = new Date();
      const diasPassados = Math.floor((hoje_d - ultima) / (1000 * 60 * 60 * 24));
      const percentualDias = Math.min(100, Math.round((diasPassados / a.intervalo_dias) * 100));
      if (diasPassados >= a.intervalo_dias) {
        if (status !== 'vencido') status = 'vencido';
        dias_vencido = diasPassados - a.intervalo_dias;
      } else if (percentualDias >= 80) {
        if (status === 'ok') status = 'atencao';
        dias_faltando = a.intervalo_dias - diasPassados;
      } else {
        dias_faltando = a.intervalo_dias - diasPassados;
        if (status === 'ok') percentual = Math.max(percentual, percentualDias);
      }
    }

    if (!a.intervalo_km && !a.ultimo_km && !a.ultima_data) {
      status = 'sem_dados';
    }

    return { ...a, status, km_faltando, km_vencido, dias_faltando, dias_vencido, percentual };
  }).sort((a, b) => {
    const ordem = { vencido: 0, atencao: 1, ok: 2, sem_dados: 3 };
    return (ordem[a.status] || 3) - (ordem[b.status] || 3);
  });
}

function criarAlerta(veiculo_id, tipo_servico_id, intervalo_km, intervalo_dias) {
  const jaExiste = db.exec('SELECT id FROM alertas_preventivos WHERE veiculo_id=? AND tipo_servico_id=? AND ativo=1', [veiculo_id, tipo_servico_id]);
  if (jaExiste.length && jaExiste[0].values.length) return { success: false, error: 'Alerta já existe para esse tipo nesse veículo' };
  db.run('INSERT INTO alertas_preventivos (veiculo_id, tipo_servico_id, intervalo_km, intervalo_dias) VALUES (?, ?, ?, ?)',
    [veiculo_id, tipo_servico_id, intervalo_km || null, intervalo_dias || null]);
  save();
  return { success: true };
}

function editarAlerta(id, intervalo_km, intervalo_dias, ultimo_km, ultima_data) {
  db.run('UPDATE alertas_preventivos SET intervalo_km=?, intervalo_dias=?, ultimo_km=?, ultima_data=? WHERE id=?',
    [intervalo_km || null, intervalo_dias || null, ultimo_km || null, ultima_data || null, id]);
  save();
  return { success: true };
}

function deletarAlerta(id) {
  db.run('UPDATE alertas_preventivos SET ativo=0 WHERE id=?', [id]);
  save();
  return { success: true };
}

// ─── ABASTECIMENTOS ───────────────────────────────────────────────────────────
function getAbastecimentos(veiculo_id, mes) {
  const filtroVeiculo = veiculo_id ? `AND a.veiculo_id = ${veiculo_id}` : '';
  const filtroMes = mes ? `AND strftime('%Y-%m', a.data) = '${mes}'` : '';
  const res = db.exec(`
    SELECT a.*, v.apelido as veiculo_apelido
    FROM abastecimentos a
    JOIN veiculos v ON v.id = a.veiculo_id
    WHERE 1=1 ${filtroVeiculo} ${filtroMes}
    ORDER BY a.data DESC, a.id DESC
  `);
  return toObjects(res);
}

function registrarAbastecimento(veiculo_id, data, km_no_momento, combustivel, litros, valor_total, posto, observacoes) {
  const valorPorLitro = litros > 0 ? valor_total / litros : 0;
  db.run(`
    INSERT INTO abastecimentos (veiculo_id, data, km_no_momento, combustivel, litros, valor_total, valor_por_litro, posto, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [veiculo_id, data, km_no_momento || 0, combustivel, litros || 0, valor_total || 0, valorPorLitro, posto || '', observacoes || '']);

  // Atualizar km se maior
  const veic = db.exec('SELECT km_atual FROM veiculos WHERE id=?', [veiculo_id]);
  const kmAtual = veic[0]?.values[0][0] || 0;
  if (km_no_momento > kmAtual) {
    db.run('UPDATE veiculos SET km_atual=? WHERE id=?', [km_no_momento, veiculo_id]);
    db.run('INSERT INTO km_historico (veiculo_id, km, data, fonte) VALUES (?, ?, ?, ?)', [veiculo_id, km_no_momento, data, 'abastecimento']);
  }
  save();
  return { success: true };
}

function editarAbastecimento(id, data, km_no_momento, combustivel, litros, valor_total, posto, observacoes) {
  const valorPorLitro = litros > 0 ? valor_total / litros : 0;
  db.run(`
    UPDATE abastecimentos SET data=?, km_no_momento=?, combustivel=?, litros=?, valor_total=?, valor_por_litro=?, posto=?, observacoes=?
    WHERE id=?
  `, [data, km_no_momento || 0, combustivel, litros || 0, valor_total || 0, valorPorLitro, posto || '', observacoes || '', id]);
  save();
  return { success: true };
}

function deletarAbastecimento(id) {
  db.run('DELETE FROM abastecimentos WHERE id=?', [id]);
  save();
  return { success: true };
}

function getConsumoMedio(veiculo_id) {
  const res = db.exec(`
    SELECT km_no_momento, litros FROM abastecimentos
    WHERE veiculo_id = ? AND litros > 0
    ORDER BY km_no_momento ASC
  `, [veiculo_id]);
  const dados = toObjects(res);
  if (dados.length < 2) return null;
  let totalKm = 0, totalLitros = 0;
  for (let i = 1; i < dados.length; i++) {
    const kmDiff = dados[i].km_no_momento - dados[i-1].km_no_momento;
    if (kmDiff > 0) {
      totalKm += kmDiff;
      totalLitros += dados[i].litros;
    }
  }
  if (totalLitros === 0) return null;
  return Math.round((totalKm / totalLitros) * 10) / 10;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function getDashboard() {
  const totalVeiculos = db.exec('SELECT COUNT(*) as c FROM veiculos WHERE ativo=1')[0]?.values[0][0] || 0;

  const mesAtual = new Date().toISOString().slice(0, 7);
  const gastosMes = db.exec(`
    SELECT COALESCE(SUM(valor_total), 0) as t FROM servicos s
    JOIN veiculos v ON v.id = s.veiculo_id
    WHERE strftime('%Y-%m', s.data) = ? AND v.ativo = 1
  `, [mesAtual])[0]?.values[0][0] || 0;

  const gastosAbastMes = db.exec(`
    SELECT COALESCE(SUM(valor_total), 0) as t FROM abastecimentos a
    JOIN veiculos v ON v.id = a.veiculo_id
    WHERE strftime('%Y-%m', a.data) = ? AND v.ativo = 1
  `, [mesAtual])[0]?.values[0][0] || 0;

  // Últimos 6 meses gastos
  const gastosMeses = db.exec(`
    SELECT strftime('%Y-%m', data) as mes, COALESCE(SUM(valor_total),0) as total
    FROM servicos WHERE data >= date('now', '-6 months')
    GROUP BY mes ORDER BY mes ASC
  `);

  const abastMeses = db.exec(`
    SELECT strftime('%Y-%m', data) as mes, COALESCE(SUM(valor_total),0) as total
    FROM abastecimentos WHERE data >= date('now', '-6 months')
    GROUP BY mes ORDER BY mes ASC
  `);

  // Últimos serviços
  const ultimosServicos = getServicos(null, 8);

  // Alertas críticos
  const alertas = getAlertas(null);
  const alertasVencidos = alertas.filter(a => a.status === 'vencido');
  const alertasAtencao = alertas.filter(a => a.status === 'atencao');

  // Gastos por veículo
  const gastosPorVeiculo = db.exec(`
    SELECT v.apelido, v.marca, v.modelo,
      COALESCE(SUM(s.valor_total), 0) as total_manutencao,
      COALESCE((SELECT SUM(valor_total) FROM abastecimentos WHERE veiculo_id = v.id), 0) as total_combustivel
    FROM veiculos v
    LEFT JOIN servicos s ON s.veiculo_id = v.id
    WHERE v.ativo = 1
    GROUP BY v.id
    ORDER BY total_manutencao DESC
  `);

  return {
    totalVeiculos,
    gastosMes: gastosMes + gastosAbastMes,
    gastosMesManutencao: gastosMes,
    gastosMesCombustivel: gastosAbastMes,
    alertasVencidos: alertasVencidos.length,
    alertasAtencao: alertasAtencao.length,
    alertasCriticos: alertasVencidos.slice(0, 5),
    alertasEmAtencao: alertasAtencao.slice(0, 5),
    ultimosServicos,
    gastosMeses: toObjects(gastosMeses),
    abastMeses: toObjects(abastMeses),
    gastosPorVeiculo: toObjects(gastosPorVeiculo),
  };
}

function getFinanceiro(veiculo_id, periodo) {
  const filtroVeiculo = veiculo_id ? `AND s.veiculo_id = ${veiculo_id}` : '';
  const filtroAbastVeiculo = veiculo_id ? `AND a.veiculo_id = ${veiculo_id}` : '';
  let filtroData = '';
  let filtroAbastData = '';
  if (periodo === 'mes') {
    filtroData = `AND strftime('%Y-%m', s.data) = strftime('%Y-%m', 'now')`;
    filtroAbastData = `AND strftime('%Y-%m', a.data) = strftime('%Y-%m', 'now')`;
  } else if (periodo === 'trimestre') {
    filtroData = `AND s.data >= date('now', '-3 months')`;
    filtroAbastData = `AND a.data >= date('now', '-3 months')`;
  } else if (periodo === 'ano') {
    filtroData = `AND strftime('%Y', s.data) = strftime('%Y', 'now')`;
    filtroAbastData = `AND strftime('%Y', a.data) = strftime('%Y', 'now')`;
  }

  const totalManutencao = db.exec(`
    SELECT COALESCE(SUM(s.valor_total), 0) as t FROM servicos s
    JOIN veiculos v ON v.id = s.veiculo_id
    WHERE v.ativo = 1 ${filtroVeiculo} ${filtroData}
  `)[0]?.values[0][0] || 0;

  const totalCombustivel = db.exec(`
    SELECT COALESCE(SUM(a.valor_total), 0) as t FROM abastecimentos a
    JOIN veiculos v ON v.id = a.veiculo_id
    WHERE v.ativo = 1 ${filtroAbastVeiculo} ${filtroAbastData}
  `)[0]?.values[0][0] || 0;

  const porTipo = db.exec(`
    SELECT t.nome as categoria, t.icone, t.cor, COALESCE(SUM(s.valor_total), 0) as total, COUNT(*) as quantidade
    FROM servicos s
    JOIN veiculos v ON v.id = s.veiculo_id
    LEFT JOIN tipos_servico t ON t.id = s.tipo_servico_id
    WHERE v.ativo = 1 ${filtroVeiculo} ${filtroData}
    GROUP BY t.id, t.nome
    ORDER BY total DESC
  `);

  const porMes = db.exec(`
    SELECT strftime('%Y-%m', s.data) as mes, COALESCE(SUM(s.valor_total), 0) as manutencao
    FROM servicos s
    JOIN veiculos v ON v.id = s.veiculo_id
    WHERE v.ativo = 1 ${filtroVeiculo}
    GROUP BY mes ORDER BY mes DESC LIMIT 12
  `);

  return {
    totalManutencao,
    totalCombustivel,
    totalGeral: totalManutencao + totalCombustivel,
    porTipo: toObjects(porTipo),
    porMes: toObjects(porMes).reverse(),
  };
}

module.exports = {
  getDb, save,
  getVeiculos, getVeiculo, criarVeiculo, editarVeiculo, toggleVeiculo,
  atualizarKm, getKmHistorico,
  getTiposServico, criarTipoServico, editarTipoServico, deletarTipoServico,
  getServicos, getServico, registrarServico, editarServico, deletarServico, getPecasServico,
  getAlertas, criarAlerta, editarAlerta, deletarAlerta, criarAlertasPadrao,
  getAbastecimentos, registrarAbastecimento, editarAbastecimento, deletarAbastecimento, getConsumoMedio,
  getDashboard, getFinanceiro,
};
