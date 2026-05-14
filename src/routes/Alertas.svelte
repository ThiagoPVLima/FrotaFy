<script lang="ts">
  import { onMount } from 'svelte'
  import { get, post, put, del, showToast, showConfirm, formatKm, formatBRL, STATUS_ALERTA } from '../lib/stores/app'

  let alertas: any[] = []
  let veiculos: any[] = []
  let tipos: any[] = []
  let loading = true
  let filtroStatus = ''
  let modal = false
  let editando: any = null
  let form = { veiculo_id: '', tipo_servico_id: '', intervalo_km: '', intervalo_dias: '', ultimo_km: '', ultima_data: '' }
  let expandidos = new Set<number>()
  let inicializado = false

  // Modal de registro de serviço
  let modalServico = false
  let alertaRegistro: any = null
  let formServico = { data: '', km_no_momento: '', valor_total: '', valor_mao_obra: '', observacoes: '', oleo_tipo: '', oleo_viscosidade: '', oleo_marca: '', oleo_quantidade: '' }
  let mostrarOleo = false

  const hoje = () => new Date().toISOString().slice(0, 10)

  function abrirRegistro(a: any) {
    alertaRegistro = a
    const tipo = tipos.find((t: any) => t.id === a.tipo_servico_id)
    const nomeNorm = (tipo?.nome || '').toLowerCase()
    mostrarOleo = nomeNorm.includes('óleo') || nomeNorm.includes('oleo')
    formServico = { data: hoje(), km_no_momento: '', valor_total: '', valor_mao_obra: '', observacoes: '', oleo_tipo: '', oleo_viscosidade: '', oleo_marca: '', oleo_quantidade: '' }
    modalServico = true
  }

  async function salvarServico() {
    if (!formServico.km_no_momento) { showToast('Informe a quilometragem', 'error'); return }
    const a = alertaRegistro
    await post('/servicos', {
      veiculo_id: a.veiculo_id,
      tipo_servico_id: a.tipo_servico_id,
      data: formServico.data,
      km_no_momento: parseFloat(formServico.km_no_momento) || 0,
      valor_total: parseFloat(formServico.valor_total) || 0,
      valor_mao_obra: parseFloat(formServico.valor_mao_obra) || 0,
      observacoes: formServico.observacoes,
      oleo_tipo: formServico.oleo_tipo,
      oleo_viscosidade: formServico.oleo_viscosidade,
      oleo_marca: formServico.oleo_marca,
      oleo_quantidade: parseFloat(formServico.oleo_quantidade) || 0,
      pecas: []
    })
    // Atualiza o alerta com o km e data do serviço
    await put(`/alertas/${a.id}`, {
      veiculo_id: a.veiculo_id,
      tipo_servico_id: a.tipo_servico_id,
      intervalo_km: a.intervalo_km,
      intervalo_dias: a.intervalo_dias,
      ultimo_km: parseFloat(formServico.km_no_momento) || null,
      ultima_data: formServico.data,
    })
    showToast('Serviço registrado e alerta atualizado!')
    modalServico = false
    load()
  }

  async function load() {
    loading = true
    const [a, v, t] = await Promise.all([get('/alertas'), get('/veiculos'), get('/tipos-servico')])
    alertas = a || []
    veiculos = v || []
    tipos = t || []
    loading = false
  }

  onMount(load)

  const ordemStatus: Record<string, number> = { vencido: 0, atencao: 1, ok: 2 }

  $: alertasFiltrados = filtroStatus ? alertas.filter(a => a.status === filtroStatus) : alertas

  $: grupos = (() => {
    const map = new Map<number, any>()
    for (const a of alertasFiltrados) {
      if (!map.has(a.veiculo_id)) {
        const v = veiculos.find((v: any) => v.id === a.veiculo_id)
        map.set(a.veiculo_id, { id: a.veiculo_id, apelido: a.veiculo_apelido, placa: v?.placa || '', alertas: [] })
      }
      map.get(a.veiculo_id).alertas.push(a)
    }
    for (const g of map.values()) {
      g.alertas.sort((a: any, b: any) => ordemStatus[a.status] - ordemStatus[b.status])
      g.piorStatus = g.alertas[0]?.status || 'ok'
      g.vencidos = g.alertas.filter((a: any) => a.status === 'vencido').length
      g.atencao = g.alertas.filter((a: any) => a.status === 'atencao').length
      g.ok = g.alertas.filter((a: any) => a.status === 'ok').length
    }
    return [...map.values()].sort((a, b) => ordemStatus[a.piorStatus] - ordemStatus[b.piorStatus])
  })()

  $: if (!inicializado && grupos.length > 0) {
    expandidos = new Set(grupos.filter((g: any) => g.piorStatus !== 'ok').map((g: any) => g.id))
    inicializado = true
  }

  function toggleGrupo(id: number) {
    if (expandidos.has(id)) expandidos.delete(id)
    else expandidos.add(id)
    expandidos = expandidos
  }

  $: vencidos = alertas.filter(a => a.status === 'vencido').length
  $: emAtencao = alertas.filter(a => a.status === 'atencao').length
  $: okCount = alertas.filter(a => a.status === 'ok').length

  function abrirModal(a?: any) {
    editando = a || null
    form = a ? {
      veiculo_id: String(a.veiculo_id), tipo_servico_id: String(a.tipo_servico_id),
      intervalo_km: a.intervalo_km ? String(a.intervalo_km) : '',
      intervalo_dias: a.intervalo_dias ? String(a.intervalo_dias) : '',
      ultimo_km: a.ultimo_km ? String(a.ultimo_km) : '',
      ultima_data: a.ultima_data || ''
    } : { veiculo_id: '', tipo_servico_id: '', intervalo_km: '', intervalo_dias: '', ultimo_km: '', ultima_data: '' }
    modal = true
  }

  async function salvar() {
    if (!form.veiculo_id || !form.tipo_servico_id) { showToast('Selecione veículo e tipo', 'error'); return }
    const payload = {
      veiculo_id: Number(form.veiculo_id), tipo_servico_id: Number(form.tipo_servico_id),
      intervalo_km: form.intervalo_km ? Number(form.intervalo_km) : null,
      intervalo_dias: form.intervalo_dias ? Number(form.intervalo_dias) : null,
      ultimo_km: form.ultimo_km ? Number(form.ultimo_km) : null,
      ultima_data: form.ultima_data || null,
    }
    if (editando) {
      await put(`/alertas/${editando.id}`, payload)
      showToast('Alerta atualizado!')
    } else {
      const r = await post('/alertas', payload)
      if (r?.success === false) { showToast(r.error || 'Erro', 'error'); return }
      showToast('Alerta criado!')
    }
    modal = false; load()
  }

  async function deletar(id: number) {
    if (!await showConfirm('Remover este alerta preventivo?')) return
    await del(`/alertas/${id}`)
    showToast('Alerta removido', 'error')
    load()
  }
</script>

<div class="page">
  <div class="page-header">
    <div>
      <h1 class="page-title">Alertas preventivos</h1>
      <p class="page-subtitle">{vencidos} vencido{vencidos !== 1 ? 's' : ''} · {emAtencao} em atenção · {okCount} ok</p>
    </div>
    <button class="btn btn-primary" on:click={() => abrirModal()}>+ Novo alerta</button>
  </div>

  <!-- Resumo status -->
  <div class="status-cards">
    <button class="status-card" class:ativo={filtroStatus === 'vencido'} on:click={() => { filtroStatus = filtroStatus === 'vencido' ? '' : 'vencido'; inicializado = false }}>
      <div class="status-num" style="color:var(--red)">{vencidos}</div>
      <div class="status-label">Vencidos</div>
    </button>
    <button class="status-card" class:ativo={filtroStatus === 'atencao'} on:click={() => { filtroStatus = filtroStatus === 'atencao' ? '' : 'atencao'; inicializado = false }}>
      <div class="status-num" style="color:var(--amber)">{emAtencao}</div>
      <div class="status-label">Em atenção</div>
    </button>
    <button class="status-card" class:ativo={filtroStatus === 'ok'} on:click={() => { filtroStatus = filtroStatus === 'ok' ? '' : 'ok'; inicializado = false }}>
      <div class="status-num" style="color:var(--green)">{okCount}</div>
      <div class="status-label">Em dia</div>
    </button>
  </div>

  {#if loading}
    <div class="loading">Carregando...</div>
  {:else if grupos.length === 0}
    <div class="empty-state">
      <div class="icon">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px"><path d="M2.5 8.5l3.5 3.5 7-7"/></svg>'}</div>
      <p>Nenhum alerta encontrado</p>
    </div>
  {:else}
    <div class="grupos-lista">
      {#each grupos as grupo}
        <div class="grupo card" class:grupo-vencido={grupo.piorStatus === 'vencido'} class:grupo-atencao={grupo.piorStatus === 'atencao'}>

          <!-- Cabeçalho do grupo -->
          <button class="grupo-header" on:click={() => toggleGrupo(grupo.id)}>
            <div class="grupo-veiculo">
              <span class="grupo-nome">{grupo.apelido}</span>
              {#if grupo.placa}<span class="grupo-placa">{grupo.placa}</span>{/if}
            </div>
            <div class="grupo-badges">
              {#if grupo.vencidos > 0}<span class="cnt cnt-red">{grupo.vencidos} vencido{grupo.vencidos > 1 ? 's' : ''}</span>{/if}
              {#if grupo.atencao > 0}<span class="cnt cnt-amber">{grupo.atencao} atenção</span>{/if}
              {#if grupo.ok > 0}<span class="cnt cnt-green">{grupo.ok} ok</span>{/if}
            </div>
            <span class="chevron">{expandidos.has(grupo.id) ? '▾' : '▸'}</span>
          </button>

          <!-- Alertas do grupo -->
          {#if expandidos.has(grupo.id)}
            <div class="grupo-alertas">
              {#each grupo.alertas as a, i}
                {#if i > 0}<div class="row-divider" />{/if}
                <div class="alerta-row">
                  <div class="tipo-letra" style="background:{a.tipo_cor || '#6b7280'}18;color:{a.tipo_cor || '#6b7280'}">
                    {(a.tipo_nome || '?').charAt(0).toUpperCase()}
                  </div>

                  <div class="alerta-centro">
                    <div class="alerta-tipo-nome">{a.tipo_nome}</div>
                    <div class="alerta-detalhes">
                      {#if a.intervalo_km}
                        <div class="detalhe-km">
                          <div class="mini-progress">
                            <div class="mini-bar status-{a.status}" style="width:{Math.min(a.percentual ?? 0, 100)}%"></div>
                          </div>
                          {#if a.status === 'vencido' && a.km_vencido}
                            <span class="detalhe-txt red">{formatKm(a.km_vencido)} vencido</span>
                          {:else if a.km_faltando}
                            <span class="detalhe-txt">{formatKm(a.km_faltando)} restantes</span>
                          {:else}
                            <span class="detalhe-txt muted">a cada {formatKm(a.intervalo_km)}</span>
                          {/if}
                        </div>
                      {/if}
                      {#if a.intervalo_dias}
                        <div class="detalhe-dias">
                          {@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="width:11px;height:11px;flex-shrink:0"><rect x="2" y="3" width="12" height="11" rx="1"/><path d="M5 1v4M11 1v4M2 7h12"/></svg>'}
                          {#if a.status === 'vencido' && a.dias_vencido != null}
                            <span class="red">{a.dias_vencido}d vencido</span>
                          {:else if a.dias_faltando != null}
                            <span>{a.dias_faltando}d restantes</span>
                          {:else}
                            <span class="muted">a cada {a.intervalo_dias}d</span>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  </div>

                  <div class="alerta-direita">
                    <span class="badge badge-{a.status}" style="background:{STATUS_ALERTA[a.status]?.bg};color:{STATUS_ALERTA[a.status]?.cor}">
                      {STATUS_ALERTA[a.status]?.label}
                    </span>
                    <div class="alerta-acoes">
                      <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px" on:click={() => abrirRegistro(a)}>
                        Registrar
                      </button>
                      <button class="btn btn-ghost" style="padding:4px 7px" on:click={() => abrirModal(a)}>
                        <span class="btn-svg">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 2.5l1 1-8.5 8.5-2 .5.5-2 8.5-8.5z"/><path d="M11 4l1 1"/></svg>'}</span>
                      </button>
                      <button class="btn btn-ghost" style="padding:4px 7px;color:var(--red)" on:click={() => deletar(a.id)}>
                        <span class="btn-svg">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Modal registro de serviço -->
{#if modalServico && alertaRegistro}
  <div class="modal-overlay" on:click|self={() => modalServico = false}>
    <div class="modal" style="max-width:500px">
      <h2 class="modal-title">Registrar serviço</h2>

      <!-- Cabeçalho do alerta -->
      <div class="reg-contexto">
        <div class="tipo-letra" style="background:{alertaRegistro.tipo_cor || '#6b7280'}18;color:{alertaRegistro.tipo_cor || '#6b7280'};width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;font-family:var(--font-display);flex-shrink:0">
          {(alertaRegistro.tipo_nome || '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--text)">{alertaRegistro.tipo_nome}</div>
          <div style="font-size:12px;color:var(--text-3)">{alertaRegistro.veiculo_apelido}{alertaRegistro.veiculo_placa ? ' · ' + alertaRegistro.veiculo_placa : ''}</div>
        </div>
        <span class="badge badge-{alertaRegistro.status}" style="background:{STATUS_ALERTA[alertaRegistro.status]?.bg};color:{STATUS_ALERTA[alertaRegistro.status]?.cor};margin-left:auto">
          {STATUS_ALERTA[alertaRegistro.status]?.label}
        </span>
      </div>

      <div class="divider" />

      <div class="form-row">
        <div class="form-group">
          <label class="label">Data do serviço</label>
          <input class="input" type="date" bind:value={formServico.data} />
        </div>
        <div class="form-group">
          <label class="label">Quilometragem</label>
          <input class="input" placeholder="Ex: 85.400" bind:value={formServico.km_no_momento} inputmode="numeric" style="font-family:var(--font-mono)" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Valor total (R$)</label>
          <input class="input" placeholder="0,00" bind:value={formServico.valor_total} inputmode="decimal" />
        </div>
        <div class="form-group">
          <label class="label">Mão de obra (R$)</label>
          <input class="input" placeholder="0,00" bind:value={formServico.valor_mao_obra} inputmode="decimal" />
        </div>
      </div>

      <div class="form-group">
        <label class="label">Observações</label>
        <input class="input" placeholder="Opcional..." bind:value={formServico.observacoes} />
      </div>

      <!-- Óleo (aparece quando o tipo é troca de óleo) -->
      {#if mostrarOleo || alertaRegistro.tipo_nome?.toLowerCase().includes('leo')}
        <div class="toggle-section">
          <button class="toggle-btn" on:click={() => mostrarOleo = !mostrarOleo}>
            <span>{mostrarOleo ? '▾' : '▸'}</span> Dados do óleo
          </button>
          {#if mostrarOleo}
            <div class="form-row" style="margin-top:10px">
              <div class="form-group">
                <label class="label">Tipo</label>
                <input class="input" placeholder="Ex: Sintético" bind:value={formServico.oleo_tipo} />
              </div>
              <div class="form-group">
                <label class="label">Viscosidade</label>
                <input class="input" placeholder="Ex: 5W30" bind:value={formServico.oleo_viscosidade} />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="label">Marca</label>
                <input class="input" placeholder="Ex: Mobil" bind:value={formServico.oleo_marca} />
              </div>
              <div class="form-group">
                <label class="label">Qtd (litros)</label>
                <input class="input" placeholder="Ex: 4" bind:value={formServico.oleo_quantidade} inputmode="decimal" />
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <div class="reg-nota">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.5v.5"/></svg>
        O alerta será atualizado automaticamente com o KM e a data informados.
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" on:click={() => modalServico = false}>Cancelar</button>
        <button class="btn btn-primary" on:click={salvarServico}>Registrar serviço</button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal -->
{#if modal}
  <div class="modal-overlay" on:click|self={() => modal = false}>
    <div class="modal">
      <h2 class="modal-title">{editando ? 'Editar alerta' : 'Novo alerta preventivo'}</h2>

      <div class="form-group">
        <label class="label">Veículo</label>
        <select class="input" bind:value={form.veiculo_id}>
          <option value="">Selecionar...</option>
          {#each veiculos as v}<option value={String(v.id)}>{v.apelido}{v.placa ? ' · ' + v.placa : ''}</option>{/each}
        </select>
      </div>

      <div class="form-group">
        <label class="label">Tipo de serviço</label>
        <select class="input" bind:value={form.tipo_servico_id}>
          <option value="">Selecionar...</option>
          {#each tipos as t}<option value={String(t.id)}>{t.nome}</option>{/each}
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Intervalo (km)</label>
          <input class="input" placeholder="Ex: 10000" bind:value={form.intervalo_km} inputmode="numeric" />
        </div>
        <div class="form-group">
          <label class="label">Intervalo (dias)</label>
          <input class="input" placeholder="Ex: 365" bind:value={form.intervalo_dias} inputmode="numeric" />
        </div>
      </div>

      <div class="divider" />
      <p style="font-size:12px;color:var(--text-3);margin-bottom:12px">Último registro (opcional — para calcular o status atual)</p>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Último KM</label>
          <input class="input" placeholder="Ex: 80000" bind:value={form.ultimo_km} inputmode="numeric" />
        </div>
        <div class="form-group">
          <label class="label">Última data</label>
          <input class="input" type="date" bind:value={form.ultima_data} />
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" on:click={() => modal = false}>Cancelar</button>
        <button class="btn btn-primary" on:click={salvar}>{editando ? 'Salvar' : 'Criar alerta'}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .status-cards { display: flex; gap: 10px; margin-bottom: 20px; }

  .status-card {
    flex: 1; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 16px; text-align: center;
    cursor: pointer; transition: all 0.15s; font-family: var(--font);
  }

  .status-card:hover { border-color: var(--border-2); }
  .status-card.ativo { border-color: var(--accent-3); background: var(--accent); }
  .status-card.ativo .status-label { color: var(--accent-fg); }

  .status-num { font-size: 28px; font-weight: 700; font-family: var(--font-mono); line-height: 1; }
  .status-label { font-size: 11px; color: var(--text-3); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.04em; font-family: var(--font-display); }

  /* Grupos */
  .grupos-lista { display: flex; flex-direction: column; gap: 8px; }

  .grupo { overflow: hidden; }
  .grupo-vencido { border-color: rgba(239,68,68,.25); }
  .grupo-atencao { border-color: rgba(245,158,11,.25); }

  .grupo-header {
    width: 100%; display: flex; align-items: center; gap: 12px;
    padding: 14px 16px; background: none; border: none;
    cursor: pointer; font-family: var(--font); text-align: left;
    transition: background 0.1s;
  }

  .grupo-header:hover { background: var(--bg-hover); }

  .grupo-veiculo { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
  .grupo-nome { font-size: 14px; font-weight: 600; color: var(--text); }
  .grupo-placa {
    font-size: 11px; font-family: var(--font-mono);
    background: var(--bg-hover); color: var(--text-3);
    padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);
  }

  .grupo-badges { display: flex; gap: 6px; flex-shrink: 0; }

  .cnt {
    font-size: 11px; font-weight: 600; padding: 2px 8px;
    border-radius: 999px;
  }

  .cnt-red { background: rgba(239,68,68,.12); color: var(--red); }
  .cnt-amber { background: rgba(245,158,11,.12); color: var(--amber); }
  .cnt-green { background: rgba(34,197,94,.12); color: var(--green); }

  .chevron { font-size: 12px; color: var(--text-3); flex-shrink: 0; }

  /* Alertas dentro do grupo */
  .grupo-alertas { border-top: 1px solid var(--border); }

  .alerta-row {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px; transition: background 0.1s;
  }

  .alerta-row:hover { background: var(--bg-hover); }

  .tipo-letra {
    width: 32px; height: 32px; border-radius: 7px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; font-family: var(--font-display);
  }

  .alerta-centro { flex: 1; min-width: 0; }
  .alerta-tipo-nome { font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
  .alerta-detalhes { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

  .detalhe-km { display: flex; align-items: center; gap: 6px; }
  .detalhe-dias { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-2); }

  .mini-progress {
    width: 60px; height: 4px; background: var(--border);
    border-radius: 2px; overflow: hidden; flex-shrink: 0;
  }

  .mini-bar {
    height: 100%; border-radius: 2px; transition: width 0.3s;
  }

  .mini-bar.status-ok { background: var(--green); }
  .mini-bar.status-atencao { background: var(--amber); }
  .mini-bar.status-vencido { background: var(--red); }

  .detalhe-txt { font-size: 11px; color: var(--text-2); font-family: var(--font-mono); white-space: nowrap; }
  .detalhe-txt.red { color: var(--red); }
  .muted { color: var(--text-3) !important; }

  .alerta-direita { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .alerta-acoes { display: flex; gap: 2px; }

  .red { color: var(--red); }

  .btn-svg { width: 13px; height: 13px; display: inline-flex; align-items: center; }
  .btn-svg :global(svg) { width: 13px; height: 13px; }

  /* Modal registro */
  .reg-contexto {
    display: flex; align-items: center; gap: 12px;
    background: var(--bg-2); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 12px 14px; margin-bottom: 16px;
  }

  .reg-nota {
    display: flex; align-items: flex-start; gap: 8px;
    font-size: 11px; color: var(--text-3);
    background: var(--bg-2); border-radius: var(--radius-sm);
    padding: 10px 12px; margin-bottom: 16px;
  }

  .reg-nota svg { width: 13px; height: 13px; flex-shrink: 0; margin-top: 1px; }

  .toggle-section { margin-bottom: 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; }

  .toggle-btn {
    background: none; border: none; cursor: pointer; font-size: 12px;
    color: var(--text-2); display: flex; align-items: center; gap: 6px;
    font-family: var(--font); font-weight: 500; width: 100%; text-align: left;
  }

  .toggle-btn:hover { color: var(--text); }
</style>
