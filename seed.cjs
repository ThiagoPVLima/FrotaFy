// Popula o banco com dados de teste — execute com: node seed.cjs
const db = require('./src/lib/db/database.cjs');

async function seed() {
  const d = await db.getDb();

  // Limpa dados existentes de veículos (mantém tipos_servico)
  d.run('DELETE FROM abastecimentos');
  d.run('DELETE FROM pecas_servico');
  d.run('DELETE FROM servicos');
  d.run('DELETE FROM alertas_preventivos');
  d.run('DELETE FROM km_historico');
  d.run('DELETE FROM veiculos');
  db.save();
  console.log('Dados anteriores removidos.');

  // Mapeia tipos de serviço por nome
  const tipos = {};
  const res = d.exec('SELECT id, nome FROM tipos_servico WHERE ativo=1');
  if (res.length) res[0].values.forEach(([id, nome]) => { tipos[nome] = id; });

  // ── Veículos ────────────────────────────────────────────────────────────────
  const v1 = db.criarVeiculo('Civic',   'ABC-1D34', 'Honda',      'Civic',   2020, '#3b82f6', 'gasolina', 87500, '');
  const v2 = db.criarVeiculo('Gol',     'DEF-5E78', 'Volkswagen', 'Gol',     2018, '#ef4444', 'flex',     143200, 'Comprado com 80.000 km');
  const v3 = db.criarVeiculo('Corolla', 'GHI-9F12', 'Toyota',     'Corolla', 2022, '#f59e0b', 'gasolina', 52300,  'Seminovo, revisado na concessionária');
  const [id1, id2, id3] = [v1.id, v2.id, v3.id];
  console.log(`Veículos criados → Civic:${id1}  Gol:${id2}  Corolla:${id3}`);

  // ── Serviços — Civic ────────────────────────────────────────────────────────
  // Óleo em 78.000 → atual 87.500 → 9.500 km dos 10.000 → atenção (95%)
  db.registrarServico(id1, tipos['Troca de óleo'], '', '2025-11-10', 78000, 320, 80,
    'Sintético', '5W30', 'Mobil', 4, 'Revisão dos 78.000 km', [
      { nome: 'Óleo 5W30 Mobil 1L',  marca: 'Mobil', quantidade: 4, valor_unitario: 48 },
      { nome: 'Filtro de óleo Fram',  marca: 'Fram',  quantidade: 1, valor_unitario: 28 },
    ]);
  db.registrarServico(id1, tipos['Revisão geral'], '', '2025-12-15', 80000, 450, 200,
    '', '', '', 0, 'Revisão de 80.000 km', []);
  db.registrarServico(id1, tipos['Alinhamento'],    '', '2026-02-05', 83000, 90,  90, '', '', '', 0, '', []);
  db.registrarServico(id1, tipos['Balanceamento'],  '', '2026-02-05', 83000, 90,  90, '', '', '', 0, '', []);
  db.registrarServico(id1, tipos['Filtro de ar'],   '', '2026-03-20', 85000, 85,  40, '', '', '', 0, '', [
    { nome: 'Filtro de ar Mann', marca: 'Mann', quantidade: 1, valor_unitario: 45 },
  ]);
  db.registrarServico(id1, tipos['Filtro de combustível'], '', '2026-05-08', 87500, 75, 40,
    '', '', '', 0, '', [
      { nome: 'Filtro de combustível Wega', marca: 'Wega', quantidade: 1, valor_unitario: 35 },
    ]);

  // ── Serviços — Gol ──────────────────────────────────────────────────────────
  // Óleo em 130.000 → atual 143.200 → 13.200 km dos 10.000 → VENCIDO
  db.registrarServico(id2, tipos['Troca de óleo'], '', '2025-09-15', 130000, 280, 80,
    'Mineral', '10W40', 'Lubrax', 4, '', [
      { nome: 'Óleo 10W40 Lubrax 1L', marca: 'Lubrax', quantidade: 4, valor_unitario: 32 },
      { nome: 'Filtro de óleo Tecfil', marca: 'Tecfil', quantidade: 1, valor_unitario: 22 },
    ]);
  db.registrarServico(id2, tipos['Correia dentada'], '', '2025-11-05', 138000, 680, 300,
    '', '', '', 0, 'Preventiva — fabricante recomenda 60.000 km', [
      { nome: 'Kit correia Gates', marca: 'Gates', quantidade: 1, valor_unitario: 380 },
    ]);
  db.registrarServico(id2, tipos['Pastilha de freio'], '', '2025-12-20', 139500, 320, 120,
    '', '', '', 0, 'Dianteira e traseira', [
      { nome: 'Pastilha dianteira Cobreq', marca: 'Cobreq', quantidade: 1, valor_unitario: 120 },
      { nome: 'Pastilha traseira Cobreq',  marca: 'Cobreq', quantidade: 1, valor_unitario: 80  },
    ]);
  db.registrarServico(id2, tipos['Alinhamento'],   '', '2026-03-10', 142500, 120, 120, '', '', '', 0, '', []);
  db.registrarServico(id2, tipos['Revisão geral'], '', '2026-04-22', 143000, 520, 250,
    '', '', '', 0, 'Revisão completa antes das férias', []);

  // ── Serviços — Corolla ──────────────────────────────────────────────────────
  db.registrarServico(id3, tipos['Troca de óleo'], '', '2026-01-20', 48000, 380, 100,
    'Sintético', '0W20', 'Toyota', 4, 'Óleo original Toyota', [
      { nome: 'Óleo 0W20 Toyota 1L',        marca: 'Toyota', quantidade: 4, valor_unitario: 68 },
      { nome: 'Filtro de óleo original Toyota', marca: 'Toyota', quantidade: 1, valor_unitario: 52 },
    ]);
  db.registrarServico(id3, tipos['Filtro de cabine'], '', '2026-03-05', 50000, 120, 60,
    '', '', '', 0, '', [
      { nome: 'Filtro cabine carvão Toyota', marca: 'Toyota', quantidade: 1, valor_unitario: 60 },
    ]);
  db.registrarServico(id3, tipos['Revisão geral'], '', '2026-04-15', 51500, 680, 350,
    '', '', '', 0, 'Revisão 50.000 km na concessionária', []);

  // ── Alertas — ajuste manual para cenários variados ─────────────────────────
  // Bateria do Civic: última troca em nov/2023 (730+ dias) → VENCIDA
  if (tipos['Bateria']) {
    d.run('UPDATE alertas_preventivos SET ultima_data=? WHERE veiculo_id=? AND tipo_servico_id=?',
      ['2023-11-01', id1, tipos['Bateria']]);
  }
  // Fluido de freio do Corolla: última troca em abr/2024 (730+ dias) → VENCIDO
  if (tipos['Fluido de freio']) {
    d.run('UPDATE alertas_preventivos SET ultima_data=? WHERE veiculo_id=? AND tipo_servico_id=?',
      ['2024-04-01', id3, tipos['Fluido de freio']]);
  }
  // Filtro de cabine do Gol: 80% do intervalo de km → atenção
  if (tipos['Filtro de cabine']) {
    d.run('UPDATE alertas_preventivos SET ultimo_km=? WHERE veiculo_id=? AND tipo_servico_id=?',
      [131000, id2, tipos['Filtro de cabine']]);
  }
  db.save();

  // ── Abastecimentos — Civic (gasolina) ───────────────────────────────────────
  const abastCivic = [
    ['2025-11-03', 77800, 42, 230, 'Shell Ipiranga'],
    ['2025-11-25', 79100, 40, 218, 'Shell Ipiranga'],
    ['2025-12-10', 80200, 38, 210, 'Posto Bandeira'],
    ['2026-01-08', 81500, 41, 225, 'Shell Ipiranga'],
    ['2026-01-28', 82700, 39, 218, 'Shell Ipiranga'],
    ['2026-02-18', 83900, 40, 224, 'Posto Bandeira'],
    ['2026-03-12', 85100, 41, 232, 'Shell Ipiranga'],
    ['2026-04-03', 86300, 42, 240, 'Shell Ipiranga'],
    ['2026-04-25', 87200, 38, 218, 'Posto BR'],
    ['2026-05-10', 87500, 12,  70, 'Shell Ipiranga'],
  ];
  abastCivic.forEach(([data, km, litros, valor, posto]) =>
    db.registrarAbastecimento(id1, data, km, 'gasolina', litros, valor, posto, ''));

  // ── Abastecimentos — Gol (flex: gasolina + etanol) ──────────────────────────
  const abastGol = [
    ['2025-10-05', 131200, 45, 245, 'Posto Ipiranga', 'gasolina'],
    ['2025-10-28', 132500, 50, 150, 'Posto BR',       'etanol'],
    ['2025-11-20', 133900, 44, 242, 'Posto Ipiranga', 'gasolina'],
    ['2025-12-15', 135200, 52, 156, 'Posto BR',       'etanol'],
    ['2026-01-10', 136800, 46, 256, 'Posto Ipiranga', 'gasolina'],
    ['2026-02-05', 138100, 50, 152, 'Posto BR',       'etanol'],
    ['2026-03-01', 139400, 45, 254, 'Posto Ipiranga', 'gasolina'],
    ['2026-03-25', 140700, 51, 155, 'Posto BR',       'etanol'],
    ['2026-04-18', 142000, 46, 260, 'Shell',          'gasolina'],
    ['2026-05-08', 143100, 48, 148, 'Posto BR',       'etanol'],
  ];
  abastGol.forEach(([data, km, litros, valor, posto, comb]) =>
    db.registrarAbastecimento(id2, data, km, comb, litros, valor, posto, ''));

  // ── Abastecimentos — Corolla (gasolina) ─────────────────────────────────────
  const abastCorolla = [
    ['2026-01-05', 47500, 35, 196, 'Shell'],
    ['2026-01-28', 48800, 34, 192, 'Posto Ipiranga'],
    ['2026-02-20', 49900, 33, 188, 'Shell'],
    ['2026-03-15', 51000, 34, 194, 'Shell'],
    ['2026-04-10', 52000, 32, 186, 'Posto Ipiranga'],
    ['2026-05-05', 52300, 12,  70, 'Shell'],
  ];
  abastCorolla.forEach(([data, km, litros, valor, posto]) =>
    db.registrarAbastecimento(id3, data, km, 'gasolina', litros, valor, posto, ''));

  console.log('Seed concluído com sucesso!');
  console.log('  3 veículos  |  14 serviços  |  26 abastecimentos');
  console.log('  Alertas: Civic-óleo (atenção), Gol-óleo (vencido), Civic-bateria (vencida), Corolla-fluido freio (vencido)');
  console.log('Reinicie o servidor (iniciar.bat) para ver os dados.');
}

seed().catch(e => { console.error('Erro no seed:', e.message); process.exit(1); });
