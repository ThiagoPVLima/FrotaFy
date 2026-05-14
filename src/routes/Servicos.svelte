<script lang="ts">
  import { onMount } from 'svelte'
  import { get, post, put, del, showToast, showConfirm, formatBRL, formatKm, formatData, diasAtras } from '../lib/stores/app'

  let servicos: any[] = []
  let veiculos: any[] = []
  let tipos: any[] = []
  let loading = true
  let filtroVeiculo = ''
  let modal = false
  let editando: any = null

  const hoje = () => new Date().toISOString().slice(0, 10)

  let form: any = {
    veiculo_id: '', tipo_servico_id: '', tipo_servico_custom: '', data: hoje(),
    km_no_momento: '', valor_total: '', valor_mao_obra: '',
    oleo_tipo: '', oleo_viscosidade: '', oleo_marca: '', oleo_quantidade: '',
    observacoes: '', pecas: []
  }

  let mostrarOleo = false
  let mostrarPecas = false

  function novaPeca() { return { nome: '', marca: '', quantidade: '1', valor_unitario: '' } }

  async function load() {
    loading = true
    const [s, v, t] = await Promise.all([get('/servicos'), get('/veiculos'), get('/tipos-servico')])
    servicos = s || []
    veiculos = v || []
    tipos = t || []
    loading = false
  }

  onMount(load)

  $: servicosFiltrados = filtroVeiculo
    ? servicos.filter(s => String(s.veiculo_id) === filtroVeiculo)
    : servicos

  $: tipoSelecionado = tipos.find(t => String(t.id) === String(form.tipo_servico_id))
  $: isOleo = tipoSelecionado?.nome?.toLowerCase().includes('óleo') || tipoSelecionado?.nome?.toLowerCase().includes('oleo')
  $: totalPecas = form.pecas.reduce((acc: number, p: any) => acc + ((parseFloat(p.valor_unitario) || 0) * (parseFloat(p.quantidade) || 1)), 0)
  $: maoObraCalc = (parseFloat(form.valor_total) || 0) - totalPecas

  function abrirModal(s?: any) {
    editando = s || null
    if (s) {
      form = {
        veiculo_id: String(s.veiculo_id), tipo_servico_id: String(s.tipo_servico_id || ''),
        tipo_servico_custom: s.tipo_servico_custom || '', data: s.data,
        km_no_momento: String(s.km_no_momento), valor_total: String(s.valor_total),
        valor_mao_obra: String(s.valor_mao_obra || ''),
        oleo_tipo: s.oleo_tipo || '', oleo_viscosidade: s.oleo_viscosidade || '',
        oleo_marca: s.oleo_marca || '', oleo_quantidade: s.oleo_quantidade ? String(s.oleo_quantidade) : '',
        observacoes: s.observacoes || '',
        pecas: (s.pecas || []).map((p: any) => ({ ...p, quantidade: String(p.quantidade), valor_unitario: String(p.valor_unitario) }))
      }
      mostrarOleo = !!(s.oleo_tipo || s.oleo_viscosidade)
      mostrarPecas = s.pecas?.length > 0
    } else {
      form = { veiculo_id: veiculos.length === 1 ? String(veiculos[0].id) : '', tipo_servico_id: '', tipo_servico_custom: '', data: hoje(), km_no_momento: '', valor_total: '', valor_mao_obra: '', oleo_tipo: '', oleo_viscosidade: '', oleo_marca: '', oleo_quantidade: '', observacoes: '', pecas: [] }
      mostrarOleo = false
      mostrarPecas = false
    }
    modal = true
  }

  async function salvar() {
    if (!form.veiculo_id) { showToast('Selecione o veículo', 'error'); return }
    if (!form.tipo_servico_id && !form.tipo_servico_custom.trim()) { showToast('Selecione ou descreva o tipo de serviço', 'error'); return }
    if (!form.km_no_momento) { showToast('Informe a quilometragem', 'error'); return }

    const payload = {
      ...form,
      veiculo_id: Number(form.veiculo_id),
      tipo_servico_id: form.tipo_servico_id ? Number(form.tipo_servico_id) : null,
      km_no_momento: parseFloat(form.km_no_momento) || 0,
      valor_total: parseFloat(form.valor_total) || 0,
      valor_mao_obra: parseFloat(form.valor_mao_obra) || 0,
      oleo_quantidade: parseFloat(form.oleo_quantidade) || 0,
      pecas: form.pecas.filter((p: any) => p.nome.trim()).map((p: any) => ({
        nome: p.nome, marca: p.marca,
        quantidade: parseFloat(p.quantidade) || 1,
        valor_unitario: parseFloat(p.valor_unitario) || 0
      }))
    }

    if (editando) {
      await put(`/servicos/${editando.id}`, payload)
      showToast('Serviço atualizado!')
    } else {
      await post('/servicos', payload)
      showToast('Serviço registrado!')
    }
    modal = false; load()
  }

  async function deletar(id: number) {
    if (!await showConfirm('Remover este serviço?')) return
    await del(`/servicos/${id}`)
    showToast('Serviço removido', 'error')
    load()
  }

  $: totalMostrado = servicosFiltrados.reduce((acc, s) => acc + s.valor_total, 0)
</script>

<div class="page">
  <div class="page-header">
    <div>
      <h1 class="page-title">Serviços</h1>
      <p class="page-subtitle">{servicosFiltrados.length} registro{servicosFiltrados.length !== 1 ? 's' : ''}</p>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <select class="input" style="width:auto" bind:value={filtroVeiculo}>
        <option value="">Todos os veículos</option>
        {#each veiculos as v}<option value={String(v.id)}>{v.apelido}{v.placa ? ' · ' + v.placa : ''}</option>{/each}
      </select>
      <button class="btn btn-primary" on:click={() => abrirModal()}>+ Novo serviço</button>
    </div>
  </div>

  {#if loading}
    <div class="loading">Carregando...</div>
  {:else if servicosFiltrados.length === 0}
    <div class="empty-state">
      <div class="icon">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px"><path d="M10 2a4 4 0 0 1 .92 4.42L14.5 11 13 12.5 8.58 8.92A4 4 0 0 1 4.5 4.5a4 4 0 0 1 .5-2l2.5 2.5L9 3.5 6.5 1A4 4 0 0 1 10 2z"/></svg>'}</div>
      <p>Nenhum serviço registrado</p>
      <button class="btn btn-primary" style="margin-top:16px" on:click={() => abrirModal()}>Registrar primeiro serviço</button>
    </div>
  {:else}
    {#if totalMostrado > 0}
      <div class="total-bar card">
        <span class="total-label">Total filtrado</span>
        <span class="total-val mono">{formatBRL(totalMostrado)}</span>
      </div>
    {/if}
    <div class="servicos-lista card">
      {#each servicosFiltrados as s, i}
        <div class="servico-row">
          <div class="tipo-icon" style="background:{s.tipo_cor || '#1a6aff'}22;color:{s.tipo_cor || '#1a6aff'}">{(s.tipo_nome || s.tipo_servico_custom || 'S').charAt(0).toUpperCase()}</div>
          <div class="servico-info">
            <div class="servico-titulo">{s.tipo_nome || s.tipo_servico_custom || 'Serviço livre'}</div>
            <div class="servico-meta">
              <span class="veiculo-tag">{s.veiculo_apelido}</span>
              <span>{formatKm(s.km_no_momento)}</span>
              <span>{formatData(s.data)}</span>
              {#if s.pecas?.length > 0}<span>{s.pecas.length} peça{s.pecas.length !== 1 ? 's' : ''}</span>{/if}
              {#if s.oleo_viscosidade}<span><span style="display:inline-flex;align-items:center;width:13px;height:13px;vertical-align:middle">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="8" cy="10" rx="5" ry="4"/><path d="M6 10c0-1 .9-2 2-2s2 .9 2 2"/><path d="M8 2v4"/><path d="M6 4l2-2 2 2"/></svg>'}</span> {s.oleo_viscosidade}</span>{/if}
            </div>
            {#if s.observacoes}
              <div class="servico-obs">{s.observacoes}</div>
            {/if}
          </div>
          <div class="servico-valores">
            <div class="servico-valor mono">{formatBRL(s.valor_total)}</div>
            {#if s.valor_mao_obra > 0}
              <div class="servico-valor-sub">MO: {formatBRL(s.valor_mao_obra)}</div>
            {/if}
          </div>
          <div class="servico-acoes">
            <button class="btn btn-ghost" style="padding:6px 8px" on:click={() => abrirModal(s)}><span class="btn-svg">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 2.5l1 1-8.5 8.5-2 .5.5-2 8.5-8.5z"/><path d="M11 4l1 1"/></svg>'}</span></button>
            <button class="btn btn-ghost" style="padding:6px 8px;color:var(--red)" on:click={() => deletar(s.id)}><span class="btn-svg">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>'}</span></button>
          </div>
        </div>
        {#if i < servicosFiltrados.length - 1}<div class="row-divider" />{/if}
      {/each}
    </div>
  {/if}
</div>

<!-- Modal -->
{#if modal}
  <div class="modal-overlay" on:click|self={() => modal = false}>
    <div class="modal" style="max-width:560px">
      <h2 class="modal-title">{editando ? 'Editar serviço' : 'Novo serviço'}</h2>

      <div class="form-group">
        <label class="label">Veículo</label>
        <select class="input" bind:value={form.veiculo_id}>
          <option value="">Selecionar...</option>
          {#each veiculos as v}<option value={String(v.id)}>{v.apelido}{v.placa ? ' · ' + v.placa : ''} — {v.marca} {v.modelo}</option>{/each}
        </select>
      </div>

      <div class="form-group">
        <label class="label">Tipo de serviço</label>
        <select class="input" bind:value={form.tipo_servico_id} on:change={() => { if (form.tipo_servico_id) form.tipo_servico_custom = ''; mostrarOleo = isOleo }}>
          <option value="">Selecionar ou descrever abaixo...</option>
          {#each tipos as t}<option value={String(t.id)}>{t.nome}</option>{/each}
        </select>
        {#if !form.tipo_servico_id}
          <input class="input" style="margin-top:6px" placeholder="Descreva o serviço..." bind:value={form.tipo_servico_custom} />
        {/if}
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Data</label>
          <input class="input" type="date" bind:value={form.data} />
        </div>
        <div class="form-group">
          <label class="label">Quilometragem</label>
          <input class="input" placeholder="Ex: 85400" bind:value={form.km_no_momento} inputmode="numeric" style="font-family:var(--font-mono)" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Valor total (R$)</label>
          <input class="input" placeholder="0,00" bind:value={form.valor_total} inputmode="decimal" />
        </div>
        <div class="form-group">
          <label class="label">Mão de obra (R$)</label>
          <input class="input" placeholder="0,00" bind:value={form.valor_mao_obra} inputmode="decimal" />
        </div>
      </div>

      <!-- Óleo -->
      <div class="toggle-section">
        <button class="toggle-btn" on:click={() => mostrarOleo = !mostrarOleo}>
          <span>{mostrarOleo ? '▾' : '▸'}</span> Dados do óleo
        </button>
        {#if mostrarOleo}
          <div class="form-row" style="margin-top:12px">
            <div class="form-group">
              <label class="label">Tipo</label>
              <input class="input" placeholder="Ex: Sintético" bind:value={form.oleo_tipo} />
            </div>
            <div class="form-group">
              <label class="label">Viscosidade</label>
              <input class="input" placeholder="Ex: 5W30" bind:value={form.oleo_viscosidade} />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="label">Marca</label>
              <input class="input" placeholder="Ex: Mobil" bind:value={form.oleo_marca} />
            </div>
            <div class="form-group">
              <label class="label">Quantidade (litros)</label>
              <input class="input" placeholder="Ex: 4" bind:value={form.oleo_quantidade} inputmode="decimal" />
            </div>
          </div>
        {/if}
      </div>

      <!-- Peças -->
      <div class="toggle-section">
        <button class="toggle-btn" on:click={() => mostrarPecas = !mostrarPecas}>
          <span>{mostrarPecas ? '▾' : '▸'}</span> Peças utilizadas {#if form.pecas.length > 0}<span class="pecas-count">{form.pecas.length}</span>{/if}
        </button>
        {#if mostrarPecas}
          <div style="margin-top:12px">
            {#each form.pecas as peca, idx}
              <div class="peca-row">
                <input class="input" placeholder="Nome da peça" bind:value={peca.nome} style="flex:2" />
                <input class="input" placeholder="Marca" bind:value={peca.marca} style="flex:1" />
                <input class="input" placeholder="Qtd" bind:value={peca.quantidade} inputmode="numeric" style="flex:0.5;font-family:var(--font-mono)" />
                <input class="input" placeholder="R$" bind:value={peca.valor_unitario} inputmode="decimal" style="flex:1;font-family:var(--font-mono)" />
                <button class="btn btn-ghost" style="color:var(--red);padding:6px" on:click={() => form.pecas = form.pecas.filter((_, i) => i !== idx)}><span class="btn-svg">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>'}</span></button>
              </div>
            {/each}
            <button class="btn btn-secondary" style="width:100%;margin-top:6px;justify-content:center" on:click={() => form.pecas = [...form.pecas, novaPeca()]}>
              + Adicionar peça
            </button>
            {#if form.pecas.length > 0 && totalPecas > 0}
              <div class="pecas-total">Total peças: <span class="mono">{formatBRL(totalPecas)}</span></div>
            {/if}
          </div>
        {/if}
      </div>

      <div class="form-group">
        <label class="label">Observações</label>
        <input class="input" placeholder="Opcional..." bind:value={form.observacoes} />
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" on:click={() => modal = false}>Cancelar</button>
        <button class="btn btn-primary" on:click={salvar}>{editando ? 'Salvar' : 'Registrar'}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .total-bar {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 16px; margin-bottom: 12px;
    font-size: 13px; color: var(--text-2);
  }
  .total-val { font-size: 16px; font-weight: 600; color: var(--text); }

  .servicos-lista { overflow: hidden; }

  .servico-row { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; }

  .tipo-icon {
    width: 36px; height: 36px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; font-family: var(--font-display); flex-shrink: 0;
  }

  .servico-info { flex: 1; min-width: 0; }

  .servico-titulo { font-size: 14px; font-weight: 500; color: var(--text); }

  .servico-meta {
    display: flex; flex-wrap: wrap; gap: 6px; margin-top: 3px;
    font-size: 11px; color: var(--text-3);
  }

  .veiculo-tag {
    background: var(--bg-hover); color: var(--text-2);
    padding: 1px 6px; border-radius: 3px; font-weight: 500;
  }

  .servico-obs { font-size: 11px; color: var(--text-3); margin-top: 4px; font-style: italic; }

  .servico-valores { text-align: right; flex-shrink: 0; }
  .servico-valor { font-size: 14px; font-weight: 600; font-family: var(--font-mono); color: var(--text); }
  .servico-valor-sub { font-size: 10px; color: var(--text-3); font-family: var(--font-mono); }

  .servico-acoes { display: flex; gap: 2px; flex-shrink: 0; }

  /* Seções toggleáveis */
  .toggle-section { margin-bottom: 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; }

  .toggle-btn {
    background: none; border: none; cursor: pointer; font-size: 12px;
    color: var(--text-2); display: flex; align-items: center; gap: 6px;
    font-family: var(--font); font-weight: 500; width: 100%; text-align: left;
  }

  .toggle-btn:hover { color: var(--text); }

  .pecas-count {
    background: var(--accent); color: var(--accent-fg);
    font-size: 10px; padding: 1px 6px; border-radius: 999px;
  }

  .peca-row { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }

  .pecas-total { font-size: 12px; color: var(--text-2); text-align: right; margin-top: 8px; }

  .mono { font-family: var(--font-mono); }

  .btn-svg { width: 14px; height: 14px; display: inline-flex; align-items: center; }
  .btn-svg :global(svg) { width: 14px; height: 14px; }
</style>
