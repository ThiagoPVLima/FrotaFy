<script lang="ts">
  import { onMount } from 'svelte'
  import { get, post, put, patch, del, showToast, showConfirm, formatBRL, formatKm, formatData, diasAtras, initials, COMBUSTIVEIS, CORES_VEICULO } from '../lib/stores/app'

  let veiculos: any[] = []
  let loading = true
  let modal = false
  let modalKm = false
  let editando: any = null
  let kmVeiculo: any = null
  let form = { apelido: '', placa: '', marca: '', modelo: '', ano: '', cor: '#290a42', combustivel: 'flex', km_atual: '', observacoes: '' }
  let formKm = { km: '', data: new Date().toISOString().slice(0, 10) }
  let modalDetalhe = false
  let veiculoDetalhe: any = null
  let servicosDetalhe: any[] = []
  let alertasDetalhe: any[] = []

  async function load() {
    loading = true
    veiculos = await get('/veiculos?inativos=true') || []
    loading = false
  }

  onMount(load)

  $: ativos   = veiculos.filter(v => v.ativo)
  $: inativos = veiculos.filter(v => !v.ativo)

  function abrirModal(v?: any) {
    editando = v || null
    form = v ? {
      apelido: v.apelido, placa: v.placa || '', marca: v.marca, modelo: v.modelo,
      ano: v.ano ? String(v.ano) : '', cor: v.cor || '#290a42',
      combustivel: v.combustivel || 'flex', km_atual: '', observacoes: v.observacoes || ''
    } : { apelido: '', placa: '', marca: '', modelo: '', ano: '', cor: '#290a42', combustivel: 'flex', km_atual: '', observacoes: '' }
    modal = true
  }

  function fecharModal() { modal = false; editando = null }

  async function salvar() {
    if (!form.apelido.trim()) { showToast('Informe o nome/apelido do veículo', 'error'); return }
    if (!form.marca.trim() || !form.modelo.trim()) { showToast('Informe marca e modelo', 'error'); return }
    if (editando) {
      await put(`/veiculos/${editando.id}`, { ...form, ano: form.ano ? Number(form.ano) : null })
      showToast('Veículo atualizado!')
    } else {
      await post('/veiculos', { ...form, ano: form.ano ? Number(form.ano) : null, km_atual: form.km_atual ? Number(form.km_atual) : 0 })
      showToast('Veículo cadastrado!')
    }
    fecharModal(); load()
  }

  async function toggleAtivo(v: any) {
    if (!await showConfirm(`${v.ativo ? 'Desativar' : 'Reativar'} o veículo "${v.apelido}"?`)) return
    await patch(`/veiculos/${v.id}/toggle`)
    showToast(v.ativo ? 'Veículo desativado' : 'Veículo reativado')
    load()
  }

  function abrirKm(v: any) {
    kmVeiculo = v
    formKm = { km: String(v.km_atual || ''), data: new Date().toISOString().slice(0, 10) }
    modalKm = true
  }

  async function salvarKm() {
    const km = parseFloat(formKm.km)
    if (!km || km <= 0) { showToast('Informe a quilometragem', 'error'); return }
    await post(`/veiculos/${kmVeiculo.id}/km`, { km, data: formKm.data })
    showToast('Quilometragem atualizada!')
    modalKm = false; load()
  }

  async function abrirDetalhe(v: any) {
    veiculoDetalhe = v
    modalDetalhe = true
    const [servs, alerts] = await Promise.all([
      get(`/servicos?veiculo_id=${v.id}&limite=5`),
      get(`/alertas?veiculo_id=${v.id}`)
    ])
    servicosDetalhe = servs || []
    alertasDetalhe = alerts || []
  }

  function corStatus(v: any): string {
    const alerts = alertasDetalhe.filter(a => a.veiculo_id === v.id)
    const vencidos = alerts.filter(a => a.status === 'vencido').length
    const atencao = alerts.filter(a => a.status === 'atencao').length
    if (vencidos > 0) return 'var(--red)'
    if (atencao > 0) return 'var(--amber)'
    return 'var(--green)'
  }

  const marcas = ['Chevrolet', 'Fiat', 'Ford', 'Honda', 'Hyundai', 'Jeep', 'Nissan', 'Peugeot', 'Renault', 'Toyota', 'Volkswagen', 'Volvo', 'BMW', 'Mercedes-Benz', 'Audi', 'Outro']
</script>

<div class="page">
  <div class="page-header">
    <div>
      <h1 class="page-title">Veículos</h1>
      <p class="page-subtitle">{ativos.length} ativo{ativos.length !== 1 ? 's' : ''}{inativos.length > 0 ? ` · ${inativos.length} inativo${inativos.length !== 1 ? 's' : ''}` : ''}</p>
    </div>
    <button class="btn btn-primary" on:click={() => abrirModal()}>+ Novo veículo</button>
  </div>

  {#if loading}
    <div class="loading">Carregando...</div>
  {:else if ativos.length === 0 && !loading}
    <div class="empty-state">
      <div class="icon">🚗</div>
      <p>Nenhum veículo cadastrado ainda</p>
      <button class="btn btn-primary" style="margin-top:16px" on:click={() => abrirModal()}>Cadastrar primeiro veículo</button>
    </div>
  {:else}
    <div class="veiculos-grid">
      {#each ativos as v}
        <div class="veiculo-card card" role="button" tabindex="0" on:click={() => abrirDetalhe(v)} on:keydown={e => e.key === 'Enter' && abrirDetalhe(v)}>
          <div class="veiculo-cor" style="background:{v.cor || '#290a42'}"></div>
          <div class="veiculo-body">
            <div class="veiculo-top">
              <div class="veiculo-avatar" style="background:{v.cor || '#290a42'}22; color:{v.cor || '#290a42'}">
                {initials(v.apelido)}
              </div>
              <div class="veiculo-info">
                <div class="veiculo-nome">{v.apelido}</div>
                <div class="veiculo-sub">{v.marca} {v.modelo}{v.ano ? ` · ${v.ano}` : ''}</div>
              </div>
              <button class="btn btn-ghost" style="padding:4px 8px;font-size:13px" on:click|stopPropagation={() => abrirModal(v)}>✎</button>
            </div>
            <div class="veiculo-stats">
              <div class="stat">
                <div class="stat-val mono">{formatKm(v.km_atual)}</div>
                <div class="stat-label">quilometragem</div>
              </div>
              <div class="stat">
                <div class="stat-val mono">{formatBRL(v.total_gasto || 0)}</div>
                <div class="stat-label">total gasto</div>
              </div>
              <div class="stat">
                <div class="stat-val">{v.total_servicos || 0}</div>
                <div class="stat-label">serviços</div>
              </div>
            </div>
            <div class="veiculo-footer">
              {#if v.placa}
                <span class="placa">{v.placa}</span>
              {/if}
              <span class="combustivel-badge">{v.combustivel || 'flex'}</span>
              <button class="btn-km" on:click|stopPropagation={() => abrirKm(v)}>
                <svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1"/></svg>
                Atualizar km
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>

    {#if inativos.length > 0}
      <div class="inativos-titulo">Inativos ({inativos.length})</div>
      <div class="veiculos-grid">
        {#each inativos as v}
          <div class="veiculo-card card inativo">
            <div class="veiculo-cor" style="background:{v.cor || '#6b7280'}"></div>
            <div class="veiculo-body">
              <div class="veiculo-top">
                <div class="veiculo-avatar" style="background:var(--bg-hover);color:var(--text-3)">{initials(v.apelido)}</div>
                <div class="veiculo-info">
                  <div class="veiculo-nome">{v.apelido}</div>
                  <div class="veiculo-sub">{v.marca} {v.modelo}</div>
                </div>
                <button class="btn btn-ghost" style="font-size:12px" on:click={() => toggleAtivo(v)}>↺ Reativar</button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<!-- Modal detalhe -->
{#if modalDetalhe && veiculoDetalhe}
  <div class="modal-overlay" on:click|self={() => modalDetalhe = false}>
    <div class="modal" style="max-width:560px">
      <div class="detalhe-header">
        <div class="detalhe-avatar" style="background:{veiculoDetalhe.cor || '#290a42'}">
          {initials(veiculoDetalhe.apelido)}
        </div>
        <div class="detalhe-info">
          <div class="detalhe-nome">{veiculoDetalhe.apelido}</div>
          <div class="detalhe-sub">{veiculoDetalhe.marca} {veiculoDetalhe.modelo}{veiculoDetalhe.ano ? ` · ${veiculoDetalhe.ano}` : ''}</div>
          {#if veiculoDetalhe.placa}<span class="placa">{veiculoDetalhe.placa}</span>{/if}
        </div>
        <button class="btn btn-secondary" on:click={() => { modalDetalhe = false; abrirModal(veiculoDetalhe) }}>✎ Editar</button>
      </div>

      <div class="detalhe-stats">
        <div class="dstat"><div class="dstat-val mono">{formatKm(veiculoDetalhe.km_atual)}</div><div class="dstat-lbl">KM atual</div></div>
        <div class="dstat"><div class="dstat-val mono">{formatBRL(veiculoDetalhe.total_gasto || 0)}</div><div class="dstat-lbl">Total gasto</div></div>
        <div class="dstat"><div class="dstat-val">{veiculoDetalhe.total_servicos || 0}</div><div class="dstat-lbl">Serviços</div></div>
        <div class="dstat"><div class="dstat-val">{veiculoDetalhe.combustivel || '—'}</div><div class="dstat-lbl">Combustível</div></div>
      </div>

      {#if alertasDetalhe.filter(a => a.veiculo_id === veiculoDetalhe.id && (a.status === 'vencido' || a.status === 'atencao')).length > 0}
        <div class="detalhe-section-title">Alertas ativos</div>
        {#each alertasDetalhe.filter(a => a.veiculo_id === veiculoDetalhe.id && (a.status === 'vencido' || a.status === 'atencao')) as a}
          <div class="alerta-mini">
            <span>{a.tipo_icone}</span>
            <span class="alerta-mini-nome">{a.tipo_nome}</span>
            <span class="badge status-{a.status}" style="margin-left:auto">{a.status === 'vencido' ? 'Vencido' : 'Atenção'}</span>
          </div>
        {/each}
      {/if}

      {#if servicosDetalhe.length > 0}
        <div class="detalhe-section-title">Últimos serviços</div>
        {#each servicosDetalhe as s}
          <div class="servico-mini">
            <span class="s-icon">{s.tipo_icone || '🔧'}</span>
            <div class="s-info">
              <span>{s.tipo_nome || s.tipo_servico_custom}</span>
              <span class="s-meta">{formatKm(s.km_no_momento)} · {diasAtras(s.data)}</span>
            </div>
            <span class="mono" style="font-size:12px;color:var(--text-2)">{formatBRL(s.valor_total)}</span>
          </div>
        {/each}
      {/if}

      <div class="modal-actions">
        <button class="btn btn-danger" on:click={() => { modalDetalhe = false; toggleAtivo(veiculoDetalhe) }}>
          {veiculoDetalhe.ativo ? 'Desativar' : 'Reativar'}
        </button>
        <button class="btn btn-secondary" on:click={() => modalDetalhe = false}>Fechar</button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal novo/editar veículo -->
{#if modal}
  <div class="modal-overlay" on:click|self={fecharModal}>
    <div class="modal">
      <h2 class="modal-title">{editando ? 'Editar veículo' : 'Novo veículo'}</h2>

      <div class="form-row">
        <div class="form-group">
          <label class="label" for="apelido">Apelido / nome</label>
          <input id="apelido" class="input" placeholder="Ex: Gol Prata" bind:value={form.apelido} />
        </div>
        <div class="form-group">
          <label class="label" for="placa">Placa</label>
          <input id="placa" class="input" placeholder="ABC-1234" bind:value={form.placa} style="text-transform:uppercase" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label" for="marca">Marca</label>
          <select id="marca" class="input" bind:value={form.marca}>
            <option value="">Selecionar...</option>
            {#each marcas as m}<option value={m}>{m}</option>{/each}
          </select>
        </div>
        <div class="form-group">
          <label class="label" for="modelo">Modelo</label>
          <input id="modelo" class="input" placeholder="Ex: Gol 1.0" bind:value={form.modelo} />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label" for="ano">Ano</label>
          <input id="ano" class="input" placeholder="2020" bind:value={form.ano} inputmode="numeric" />
        </div>
        <div class="form-group">
          <label class="label" for="combustivel">Combustível</label>
          <select id="combustivel" class="input" bind:value={form.combustivel}>
            {#each COMBUSTIVEIS as c}<option value={c}>{c}</option>{/each}
          </select>
        </div>
      </div>

      {#if !editando}
        <div class="form-group">
          <label class="label" for="km_atual">Quilometragem atual</label>
          <input id="km_atual" class="input" placeholder="Ex: 85000" bind:value={form.km_atual} inputmode="numeric" />
        </div>
      {/if}

      <div class="form-group">
        <label class="label">Cor do veículo</label>
        <div class="cores-grid">
          {#each CORES_VEICULO as cor}
            <button class="cor-btn" class:selected={form.cor === cor}
              style="background:{cor}" on:click={() => form.cor = cor}>
              {#if form.cor === cor}<span style="color:white;font-size:12px">✓</span>{/if}
            </button>
          {/each}
        </div>
      </div>

      <div class="form-group">
        <label class="label" for="obs">Observações</label>
        <input id="obs" class="input" placeholder="Opcional..." bind:value={form.observacoes} />
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" on:click={fecharModal}>Cancelar</button>
        <button class="btn btn-primary" on:click={salvar}>{editando ? 'Salvar' : 'Cadastrar'}</button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal atualizar km -->
{#if modalKm && kmVeiculo}
  <div class="modal-overlay" on:click|self={() => modalKm = false}>
    <div class="modal" style="max-width:380px">
      <h2 class="modal-title">Atualizar quilometragem</h2>
      <div style="margin-bottom:16px;font-size:13px;color:var(--text-2)">{kmVeiculo.apelido} — atual: <span class="mono">{formatKm(kmVeiculo.km_atual)}</span></div>
      <div class="form-group">
        <label class="label" for="km-novo">Nova quilometragem</label>
        <input id="km-novo" class="input" placeholder="Ex: 87500" bind:value={formKm.km} inputmode="numeric" style="font-family:var(--font-mono);font-size:16px" />
      </div>
      <div class="form-group">
        <label class="label" for="km-data">Data da leitura</label>
        <input id="km-data" class="input" type="date" bind:value={formKm.data} />
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" on:click={() => modalKm = false}>Cancelar</button>
        <button class="btn btn-primary" on:click={salvarKm}>Atualizar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .veiculos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
  }

  .veiculo-card {
    cursor: pointer; overflow: hidden;
    transition: box-shadow 0.15s, transform 0.15s;
    display: flex; flex-direction: column;
  }

  .veiculo-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .veiculo-card.inativo { opacity: 0.45; }

  .veiculo-cor { height: 3px; flex-shrink: 0; }

  .veiculo-body { padding: 16px; flex: 1; display: flex; flex-direction: column; gap: 14px; }

  .veiculo-top { display: flex; align-items: center; gap: 10px; }

  .veiculo-avatar {
    width: 38px; height: 38px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; flex-shrink: 0;
    font-family: var(--font-display);
  }

  .veiculo-info { flex: 1; min-width: 0; }
  .veiculo-nome { font-size: 14px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .veiculo-sub { font-size: 11px; color: var(--text-3); margin-top: 1px; }

  .veiculo-stats { display: flex; gap: 0; }

  .stat { flex: 1; text-align: center; padding: 8px 0; border-right: 1px solid var(--border); }
  .stat:last-child { border-right: none; }
  .stat-val { font-size: 13px; font-weight: 600; color: var(--text); }
  .stat-label { font-size: 9px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 1px; }

  .veiculo-footer { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

  .placa {
    font-family: var(--font-mono); font-size: 11px; font-weight: 600;
    background: var(--bg-hover); color: var(--text-2);
    padding: 2px 7px; border-radius: 4px; border: 1px solid var(--border-2);
    text-transform: uppercase;
  }

  .combustivel-badge {
    font-size: 10px; font-weight: 500; color: var(--text-3);
    background: var(--bg-hover); padding: 2px 7px;
    border-radius: 4px; text-transform: capitalize;
  }

  .btn-km {
    margin-left: auto; display: flex; align-items: center; gap: 4px;
    font-size: 11px; color: var(--text-3); background: none; border: none;
    cursor: pointer; padding: 4px 8px; border-radius: var(--radius-xs);
    transition: all 0.1s; font-family: var(--font);
  }

  .btn-km:hover { background: var(--bg-hover); color: var(--text-2); }

  .btn-km svg { width: 11px; height: 11px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; }

  .inativos-titulo {
    font-size: 10px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-3); margin: 28px 0 10px;
    font-family: var(--font-display);
  }

  /* Detalhe modal */
  .detalhe-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .detalhe-avatar {
    width: 48px; height: 48px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 700; color: white;
    font-family: var(--font-display); flex-shrink: 0;
  }
  .detalhe-info { flex: 1; min-width: 0; }
  .detalhe-nome { font-size: 18px; font-weight: 700; font-family: var(--font-display); }
  .detalhe-sub { font-size: 12px; color: var(--text-3); margin-top: 2px; }

  .detalhe-stats {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px;
  }

  .dstat { background: var(--bg-2); border-radius: var(--radius-sm); padding: 12px; text-align: center; }
  .dstat-val { font-size: 14px; font-weight: 600; color: var(--text); font-family: var(--font-mono); }
  .dstat-lbl { font-size: 10px; color: var(--text-3); margin-top: 2px; }

  .detalhe-section-title {
    font-size: 10px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-3); margin: 16px 0 8px;
    font-family: var(--font-display);
  }

  .alerta-mini {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; border-radius: var(--radius-sm);
    background: var(--bg-2); margin-bottom: 4px; font-size: 13px;
  }

  .alerta-mini-nome { font-weight: 500; flex: 1; }

  .servico-mini {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px;
  }

  .s-icon { font-size: 16px; }
  .s-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
  .s-meta { font-size: 11px; color: var(--text-3); }

  /* Cores */
  .cores-grid { display: flex; gap: 8px; flex-wrap: wrap; }

  .cor-btn {
    width: 28px; height: 28px; border-radius: 6px;
    border: 2px solid transparent; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.1s;
  }

  .cor-btn:hover { transform: scale(1.15); }
  .cor-btn.selected { border-color: var(--text-2); transform: scale(1.1); }

  .mono { font-family: var(--font-mono); }
</style>
