<script lang="ts">
  import { onMount } from 'svelte'
  import { get, post, put, del, showToast, showConfirm, formatBRL, formatKm, formatData, COMBUSTIVEIS } from '../lib/stores/app'

  let abastecimentos: any[] = []
  let veiculos: any[] = []
  let loading = true
  let filtroVeiculo = ''
  let modal = false
  let editando: any = null
  const hoje = () => new Date().toISOString().slice(0, 10)
  let form = { veiculo_id: '', data: hoje(), km_no_momento: '', combustivel: 'gasolina', litros: '', valor_total: '', posto: '', observacoes: '' }
  let consumos: Record<number, number | null> = {}

  async function load() {
    loading = true
    const [a, v] = await Promise.all([get('/abastecimentos'), get('/veiculos')])
    abastecimentos = a || []
    veiculos = v || []
    // Buscar consumo médio de cada veículo
    for (const veic of veiculos) {
      const r = await get(`/abastecimentos/consumo/${veic.id}`)
      consumos[veic.id] = r?.consumo || null
    }
    loading = false
  }

  onMount(load)

  $: filtrados = filtroVeiculo ? abastecimentos.filter(a => String(a.veiculo_id) === filtroVeiculo) : abastecimentos
  $: totalFiltrado = filtrados.reduce((acc, a) => acc + a.valor_total, 0)
  $: totalLitros = filtrados.reduce((acc, a) => acc + a.litros, 0)

  $: valorPorLitroEstimado = (() => {
    const v = parseFloat(form.valor_total)
    const l = parseFloat(form.litros)
    return l > 0 && v > 0 ? (v / l).toFixed(3) : null
  })()

  function abrirModal(a?: any) {
    editando = a || null
    form = a ? {
      veiculo_id: String(a.veiculo_id), data: a.data,
      km_no_momento: String(a.km_no_momento), combustivel: a.combustivel,
      litros: String(a.litros), valor_total: String(a.valor_total),
      posto: a.posto || '', observacoes: a.observacoes || ''
    } : { veiculo_id: veiculos.length === 1 ? String(veiculos[0].id) : '', data: hoje(), km_no_momento: '', combustivel: 'gasolina', litros: '', valor_total: '', posto: '', observacoes: '' }
    modal = true
  }

  async function salvar() {
    if (!form.veiculo_id) { showToast('Selecione o veículo', 'error'); return }
    if (!form.litros || !form.valor_total) { showToast('Informe litros e valor', 'error'); return }
    const payload = {
      ...form,
      veiculo_id: Number(form.veiculo_id),
      km_no_momento: parseFloat(form.km_no_momento) || 0,
      litros: parseFloat(form.litros) || 0,
      valor_total: parseFloat(form.valor_total) || 0,
    }
    if (editando) {
      await put(`/abastecimentos/${editando.id}`, payload)
      showToast('Abastecimento atualizado!')
    } else {
      await post('/abastecimentos', payload)
      showToast('Abastecimento registrado!')
    }
    modal = false; load()
  }

  async function deletar(id: number) {
    if (!await showConfirm('Remover este abastecimento?')) return
    await del(`/abastecimentos/${id}`)
    showToast('Removido', 'error')
    load()
  }

  function corCombustivel(c: string): string {
    const cores: Record<string, string> = { gasolina: '#f59e0b', etanol: '#10b981', flex: '#6366f1', diesel: '#64748b', gnv: '#0ea5e9', elétrico: '#22c55e' }
    return cores[c] || '#6b7280'
  }
</script>

<div class="page">
  <div class="page-header">
    <div>
      <h1 class="page-title">Combustível</h1>
      <p class="page-subtitle">{filtrados.length} abastecimento{filtrados.length !== 1 ? 's' : ''}</p>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <select class="input" style="width:auto" bind:value={filtroVeiculo}>
        <option value="">Todos os veículos</option>
        {#each veiculos as v}<option value={String(v.id)}>{v.apelido}</option>{/each}
      </select>
      <button class="btn btn-primary" on:click={() => abrirModal()}>+ Abastecer</button>
    </div>
  </div>

  <!-- Consumo médio por veículo -->
  {#if veiculos.length > 0}
    <div class="consumos-grid">
      {#each veiculos as v}
        {#if consumos[v.id] !== undefined}
          <div class="consumo-card card">
            <div class="consumo-veiculo">{v.apelido}</div>
            <div class="consumo-val mono">{consumos[v.id] ? `${consumos[v.id]} km/l` : '—'}</div>
            <div class="consumo-label">consumo médio</div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  {#if loading}
    <div class="loading">Carregando...</div>
  {:else if filtrados.length === 0}
    <div class="empty-state"><div class="icon">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px"><path d="M3 14V4a1 1 0 011-1h5a1 1 0 011 1v10M3 14h7M10 6h2a1 1 0 011 1v4a1 1 0 001 1"/><path d="M13 7l1.5-1.5"/></svg>'}</div><p>Nenhum abastecimento registrado</p>
      <button class="btn btn-primary" style="margin-top:16px" on:click={() => abrirModal()}>Registrar primeiro</button>
    </div>
  {:else}
    <!-- Totais -->
    <div class="totais-bar card">
      <div class="total-item"><div class="total-num mono">{formatBRL(totalFiltrado)}</div><div class="total-lbl">total gasto</div></div>
      <div class="total-sep"></div>
      <div class="total-item"><div class="total-num mono">{totalLitros.toFixed(1)} L</div><div class="total-lbl">litros</div></div>
      <div class="total-sep"></div>
      <div class="total-item"><div class="total-num mono">{totalLitros > 0 ? formatBRL(totalFiltrado / totalLitros) : '—'}/L</div><div class="total-lbl">preço médio</div></div>
    </div>

    <div class="abast-lista card">
      {#each filtrados as a, i}
        <div class="abast-row">
          <div class="comb-badge" style="background:{corCombustivel(a.combustivel)}22;color:{corCombustivel(a.combustivel)}">
            <span class="comb-icon">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14V4a1 1 0 011-1h5a1 1 0 011 1v10M3 14h7M10 6h2a1 1 0 011 1v4a1 1 0 001 1"/><path d="M13 7l1.5-1.5"/></svg>'}</span>
          </div>
          <div class="abast-info">
            <div class="abast-titulo">{a.veiculo_apelido}</div>
            <div class="abast-meta">
              <span class="comb-tag" style="color:{corCombustivel(a.combustivel)}">{a.combustivel}</span>
              <span>{a.litros.toFixed(1)} L</span>
              <span class="mono" style="font-size:10px">{formatBRL(a.valor_por_litro)}/L</span>
              {#if a.km_no_momento}<span>{formatKm(a.km_no_momento)}</span>{/if}
              <span>{formatData(a.data)}</span>
              {#if a.posto}<span><span style="display:inline-flex;align-items:center;width:12px;height:12px;vertical-align:middle">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14.5S3 10.5 3 6.5a5 5 0 1 1 10 0c0 4-5 8-5 8z"/><circle cx="8" cy="6.5" r="1.5"/></svg>'}</span> {a.posto}</span>{/if}
            </div>
          </div>
          <div class="abast-valor mono">{formatBRL(a.valor_total)}</div>
          <div class="abast-acoes">
            <button class="btn btn-ghost" style="padding:6px 8px" on:click={() => abrirModal(a)}><span class="btn-svg">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 2.5l1 1-8.5 8.5-2 .5.5-2 8.5-8.5z"/><path d="M11 4l1 1"/></svg>'}</span></button>
            <button class="btn btn-ghost" style="padding:6px 8px;color:var(--red)" on:click={() => deletar(a.id)}><span class="btn-svg">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>'}</span></button>
          </div>
        </div>
        {#if i < filtrados.length - 1}<div class="row-divider" />{/if}
      {/each}
    </div>
  {/if}
</div>

<!-- Modal -->
{#if modal}
  <div class="modal-overlay" on:click|self={() => modal = false}>
    <div class="modal">
      <h2 class="modal-title">{editando ? 'Editar abastecimento' : 'Novo abastecimento'}</h2>

      <div class="form-group">
        <label class="label">Veículo</label>
        <select class="input" bind:value={form.veiculo_id}>
          <option value="">Selecionar...</option>
          {#each veiculos as v}<option value={String(v.id)}>{v.apelido}</option>{/each}
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Data</label>
          <input class="input" type="date" bind:value={form.data} />
        </div>
        <div class="form-group">
          <label class="label">Quilometragem</label>
          <input class="input" placeholder="Ex: 85200" bind:value={form.km_no_momento} inputmode="numeric" style="font-family:var(--font-mono)" />
        </div>
      </div>

      <div class="form-group">
        <label class="label">Combustível</label>
        <div class="comb-grid">
          {#each COMBUSTIVEIS as c}
            <button class="comb-btn" class:selected={form.combustivel === c}
              style={form.combustivel === c ? `background:${corCombustivel(c)}22;border-color:${corCombustivel(c)};color:${corCombustivel(c)}` : ''}
              on:click={() => form.combustivel = c}>{c}
            </button>
          {/each}
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Litros abastecidos</label>
          <input class="input" placeholder="Ex: 40" bind:value={form.litros} inputmode="decimal" style="font-family:var(--font-mono)" />
        </div>
        <div class="form-group">
          <label class="label">Valor total (R$)</label>
          <input class="input" placeholder="0,00" bind:value={form.valor_total} inputmode="decimal" style="font-family:var(--font-mono)" />
        </div>
      </div>

      {#if valorPorLitroEstimado}
        <div class="preco-litro">
          <span>Preço estimado por litro</span>
          <span class="mono">{parseFloat(valorPorLitroEstimado) < 10 ? `R$ ${valorPorLitroEstimado}` : '—'}</span>
        </div>
      {/if}

      <div class="form-group">
        <label class="label">Posto (opcional)</label>
        <input class="input" placeholder="Nome do posto..." bind:value={form.posto} />
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" on:click={() => modal = false}>Cancelar</button>
        <button class="btn btn-primary" on:click={salvar}>{editando ? 'Salvar' : 'Registrar'}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .consumos-grid { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }

  .consumo-card { padding: 14px 18px; min-width: 140px; }
  .consumo-veiculo { font-size: 11px; color: var(--text-3); margin-bottom: 4px; }
  .consumo-val { font-size: 20px; font-weight: 700; color: var(--text); }
  .consumo-label { font-size: 10px; color: var(--text-3); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; }

  .totais-bar {
    display: flex; padding: 14px 20px; margin-bottom: 12px; gap: 20px;
  }

  .total-item { text-align: center; flex: 1; }
  .total-num { font-size: 18px; font-weight: 600; color: var(--text); }
  .total-lbl { font-size: 10px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
  .total-sep { width: 1px; background: var(--border); }

  .abast-lista { overflow: hidden; }

  .abast-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }

  .comb-badge {
    width: 36px; height: 36px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .comb-icon { display: inline-flex; align-items: center; width: 18px; height: 18px; }
  .comb-icon :global(svg) { width: 18px; height: 18px; }

  .btn-svg { width: 14px; height: 14px; display: inline-flex; align-items: center; }
  .btn-svg :global(svg) { width: 14px; height: 14px; }

  .abast-info { flex: 1; min-width: 0; }
  .abast-titulo { font-size: 13px; font-weight: 500; color: var(--text); }

  .abast-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; font-size: 11px; color: var(--text-3); }
  .comb-tag { font-weight: 600; text-transform: capitalize; }

  .abast-valor { font-size: 14px; font-weight: 600; font-family: var(--font-mono); color: var(--text); }

  .abast-acoes { display: flex; gap: 2px; }

  /* Modal combustível chips */
  .comb-grid { display: flex; flex-wrap: wrap; gap: 6px; }

  .comb-btn {
    padding: 6px 14px; border-radius: var(--radius-sm);
    border: 1px solid var(--border-2); background: var(--bg-2);
    color: var(--text-2); font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all 0.12s; text-transform: capitalize;
    font-family: var(--font);
  }

  .comb-btn:hover { border-color: var(--text-3); color: var(--text); }
  .comb-btn.selected { font-weight: 600; }

  .preco-litro {
    display: flex; justify-content: space-between; align-items: center;
    background: var(--bg-2); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 10px 14px;
    font-size: 13px; color: var(--text-2); margin-bottom: 14px;
  }

  .mono { font-family: var(--font-mono); }
</style>
