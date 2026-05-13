<script lang="ts">
  import { onMount } from 'svelte'
  import { get, post, put, del, showToast, showConfirm, formatKm, STATUS_ALERTA, currentRoute } from '../lib/stores/app'

  let alertas: any[] = []
  let veiculos: any[] = []
  let tipos: any[] = []
  let loading = true
  let filtroVeiculo = ''
  let filtroStatus = ''
  let modal = false
  let editando: any = null
  let form = { veiculo_id: '', tipo_servico_id: '', intervalo_km: '', intervalo_dias: '', ultimo_km: '', ultima_data: '' }

  async function load() {
    loading = true
    const [a, v, t] = await Promise.all([get('/alertas'), get('/veiculos'), get('/tipos-servico')])
    alertas = a || []
    veiculos = v || []
    tipos = t || []
    loading = false
  }

  onMount(load)

  $: alertasFiltrados = alertas.filter(a => {
    if (filtroVeiculo && String(a.veiculo_id) !== filtroVeiculo) return false
    if (filtroStatus && a.status !== filtroStatus) return false
    return true
  })

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

  async function registrarServico(a: any) {
    currentRoute.set('servicos')
  }

  function barClass(status: string): string {
    if (status === 'vencido') return 'progress-vencido'
    if (status === 'atencao') return 'progress-atencao'
    return 'progress-ok'
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
    <button class="status-card" class:ativo={filtroStatus === 'vencido'} on:click={() => filtroStatus = filtroStatus === 'vencido' ? '' : 'vencido'}>
      <div class="status-num" style="color:var(--red)">{vencidos}</div>
      <div class="status-label">Vencidos</div>
    </button>
    <button class="status-card" class:ativo={filtroStatus === 'atencao'} on:click={() => filtroStatus = filtroStatus === 'atencao' ? '' : 'atencao'}>
      <div class="status-num" style="color:var(--amber)">{emAtencao}</div>
      <div class="status-label">Em atenção</div>
    </button>
    <button class="status-card" class:ativo={filtroStatus === 'ok'} on:click={() => filtroStatus = filtroStatus === 'ok' ? '' : 'ok'}>
      <div class="status-num" style="color:var(--green)">{okCount}</div>
      <div class="status-label">Em dia</div>
    </button>
  </div>

  <!-- Filtro veículo -->
  <div style="display:flex;gap:8px;margin-bottom:20px">
    <select class="input" style="max-width:220px" bind:value={filtroVeiculo}>
      <option value="">Todos os veículos</option>
      {#each veiculos as v}<option value={String(v.id)}>{v.apelido}</option>{/each}
    </select>
  </div>

  {#if loading}
    <div class="loading">Carregando...</div>
  {:else if alertasFiltrados.length === 0}
    <div class="empty-state"><div class="icon">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px"><path d="M2.5 8.5l3.5 3.5 7-7"/></svg>'}</div><p>Nenhum alerta encontrado</p></div>
  {:else}
    <div class="alertas-grid">
      {#each alertasFiltrados as a}
        <div class="alerta-card card" class:vencido={a.status === 'vencido'} class:atencao={a.status === 'atencao'}>
          <div class="alerta-header">
            <span class="alerta-emoji">{a.tipo_icone}</span>
            <div class="alerta-titles">
              <div class="alerta-tipo">{a.tipo_nome}</div>
              <div class="alerta-veiculo">{a.veiculo_apelido}</div>
            </div>
            <span class="badge status-{a.status}">
              {STATUS_ALERTA[a.status]?.label || a.status}
            </span>
          </div>

          {#if a.intervalo_km}
            <div class="alerta-progress">
              <div class="progress-info">
                <span class="progress-label">KM</span>
                {#if a.status === 'vencido' && a.km_vencido}
                  <span class="progress-detail red">{formatKm(a.km_vencido)} vencido</span>
                {:else if a.km_faltando}
                  <span class="progress-detail">{formatKm(a.km_faltando)} restantes</span>
                {/if}
              </div>
              <div class="progress-wrap">
                <div class="progress-bar {barClass(a.status)}" style="width:{Math.min(a.percentual, 100)}%"></div>
              </div>
              <div class="progress-sub">
                {#if a.ultimo_km}
                  Último: {formatKm(a.ultimo_km)} · Intervalo: {formatKm(a.intervalo_km)}
                {:else}
                  Intervalo: {formatKm(a.intervalo_km)} · Sem registro
                {/if}
              </div>
            </div>
          {/if}

          {#if a.intervalo_dias}
            <div class="alerta-dias">
              <svg viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="11" rx="1"/><path d="M5 1v4M11 1v4M2 7h12"/></svg>
              {#if a.status === 'vencido' && a.dias_vencido != null}
                <span class="red">{a.dias_vencido} dia{a.dias_vencido !== 1 ? 's' : ''} vencido</span>
              {:else if a.dias_faltando != null}
                <span>{a.dias_faltando} dia{a.dias_faltando !== 1 ? 's' : ''} restantes</span>
              {:else}
                <span style="color:var(--text-3)">A cada {a.intervalo_dias} dias</span>
              {/if}
            </div>
          {/if}

          <div class="alerta-footer">
            <button class="btn btn-primary" style="font-size:11px;padding:5px 12px" on:click={() => currentRoute.set('servicos')}>
              Registrar serviço
            </button>
            <button class="btn btn-ghost" style="font-size:11px;padding:5px 8px" on:click={() => abrirModal(a)}><span class="btn-svg">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 2.5l1 1-8.5 8.5-2 .5.5-2 8.5-8.5z"/><path d="M11 4l1 1"/></svg>'}</span> Editar</button>
            <button class="btn btn-ghost" style="font-size:11px;padding:5px 8px;color:var(--red)" on:click={() => deletar(a.id)}>Remover</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Modal -->
{#if modal}
  <div class="modal-overlay" on:click|self={() => modal = false}>
    <div class="modal">
      <h2 class="modal-title">{editando ? 'Editar alerta' : 'Novo alerta preventivo'}</h2>

      <div class="form-group">
        <label class="label">Veículo</label>
        <select class="input" bind:value={form.veiculo_id}>
          <option value="">Selecionar...</option>
          {#each veiculos as v}<option value={String(v.id)}>{v.apelido}</option>{/each}
        </select>
      </div>

      <div class="form-group">
        <label class="label">Tipo de serviço</label>
        <select class="input" bind:value={form.tipo_servico_id}>
          <option value="">Selecionar...</option>
          {#each tipos as t}<option value={String(t.id)}>{t.icone} {t.nome}</option>{/each}
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

  .alertas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }

  .alerta-card { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .alerta-card.vencido { border-color: rgba(239,68,68,.3); }
  .alerta-card.atencao { border-color: rgba(245,158,11,.3); }

  .alerta-header { display: flex; align-items: center; gap: 10px; }
  .alerta-emoji { font-size: 22px; flex-shrink: 0; }
  .alerta-titles { flex: 1; min-width: 0; }
  .alerta-tipo { font-size: 13px; font-weight: 600; color: var(--text); }
  .alerta-veiculo { font-size: 11px; color: var(--text-3); margin-top: 1px; }

  .alerta-progress { display: flex; flex-direction: column; gap: 4px; }

  .progress-info { display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
  .progress-label { color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
  .progress-detail { color: var(--text-2); font-family: var(--font-mono); }
  .progress-sub { font-size: 10px; color: var(--text-3); font-family: var(--font-mono); }

  .alerta-dias {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--text-2);
    background: var(--bg-2); padding: 8px 10px; border-radius: var(--radius-sm);
  }

  .alerta-dias svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; flex-shrink: 0; }

  .alerta-footer { display: flex; gap: 4px; padding-top: 4px; border-top: 1px solid var(--border); }

  .red { color: var(--red) !important; }

  .btn-svg { width: 13px; height: 13px; display: inline-flex; align-items: center; }
  .btn-svg :global(svg) { width: 13px; height: 13px; }
</style>
