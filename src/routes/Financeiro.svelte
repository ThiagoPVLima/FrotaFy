<script lang="ts">
  import { onMount } from 'svelte'
  import { get, formatBRL, formatMes } from '../lib/stores/app'

  let dados: any = null
  let loading = true
  let veiculos: any[] = []
  let filtroVeiculo = ''
  let periodo = 'mes'

  async function load() {
    loading = true
    const params = new URLSearchParams({ periodo })
    if (filtroVeiculo) params.set('veiculo_id', filtroVeiculo)
    const [d, v] = await Promise.all([get(`/financeiro?${params}`), veiculos.length ? Promise.resolve(veiculos) : get('/veiculos')])
    dados = d
    if (!veiculos.length) veiculos = v || []
    loading = false
  }

  onMount(load)

  $: { filtroVeiculo; periodo; load() }

  function pct(val: number, total: number): number {
    if (!total) return 0
    return Math.round((val / total) * 100)
  }

  function maxMes(meses: any[]): number {
    return Math.max(...meses.map(m => m.manutencao || 0), 1)
  }

  $: maxG = dados?.porMes?.length ? maxMes(dados.porMes) : 1

  function nomeMes(mes: string): string {
    if (!mes) return ''
    const [y, m] = mes.split('-').map(Number)
    return new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  }

  async function exportar() {
    const params = new URLSearchParams()
    if (filtroVeiculo) params.set('veiculo_id', filtroVeiculo)
    window.location.href = `/api/exportar?${params}`
  }
</script>

<div class="page">
  <div class="page-header">
    <div>
      <h1 class="page-title">Financeiro</h1>
      <p class="page-subtitle">Análise de gastos por período</p>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <button class="btn btn-secondary" on:click={exportar}>
        <svg viewBox="0 0 16 16" style="width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round"><path d="M8 2v8M5 7l3 3 3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1"/></svg>
        Exportar Excel
      </button>
    </div>
  </div>

  <!-- Filtros -->
  <div class="filtros">
    <div class="periodo-tabs">
      {#each [['mes','Este mês'],['trimestre','Trimestre'],['ano','Este ano'],['todos','Tudo']] as [val, lbl]}
        <button class="tab" class:ativo={periodo === val} on:click={() => periodo = val}>{lbl}</button>
      {/each}
    </div>
    <select class="input" style="width:auto" bind:value={filtroVeiculo} on:change={load}>
      <option value="">Todos os veículos</option>
      {#each veiculos as v}<option value={String(v.id)}>{v.apelido}{v.placa ? ' · ' + v.placa : ''}</option>{/each}
    </select>
  </div>

  {#if loading}
    <div class="loading">Carregando...</div>
  {:else if dados}
    <!-- KPIs -->
    <div class="kpis">
      <div class="kpi card">
        <div class="kpi-label">Total geral</div>
        <div class="kpi-val mono">{formatBRL(dados.totalGeral)}</div>
      </div>
      <div class="kpi card">
        <div class="kpi-label">Manutenções</div>
        <div class="kpi-val mono">{formatBRL(dados.totalManutencao)}</div>
        <div class="kpi-pct">{pct(dados.totalManutencao, dados.totalGeral)}% do total</div>
      </div>
      <div class="kpi card">
        <div class="kpi-label">Combustível</div>
        <div class="kpi-val mono">{formatBRL(dados.totalCombustivel)}</div>
        <div class="kpi-pct">{pct(dados.totalCombustivel, dados.totalGeral)}% do total</div>
      </div>
    </div>

    <!-- Split manutenção vs combustível -->
    {#if dados.totalGeral > 0}
      <div class="card split-bar-wrap">
        <div class="split-labels">
          <span><span class="dot man"></span> Manutenção {pct(dados.totalManutencao, dados.totalGeral)}%</span>
          <span><span class="dot comb"></span> Combustível {pct(dados.totalCombustivel, dados.totalGeral)}%</span>
        </div>
        <div class="split-bar">
          <div class="split-seg man" style="width:{pct(dados.totalManutencao, dados.totalGeral)}%"></div>
          <div class="split-seg comb" style="width:{pct(dados.totalCombustivel, dados.totalGeral)}%"></div>
        </div>
      </div>
    {/if}

    <div class="grid-2" style="margin-top:16px">
      <!-- Por tipo -->
      <div class="card secao">
        <h2 class="secao-titulo">Por tipo de serviço</h2>
        {#if dados.porTipo.length === 0}
          <div class="empty-state" style="padding:24px"><div class="icon">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="width:32px;height:32px"><path d="M2 13h12"/><rect x="2.5" y="8" width="3" height="5" rx=".5" fill="currentColor" stroke="none"/><rect x="6.5" y="5" width="3" height="8" rx=".5" fill="currentColor" stroke="none"/><rect x="10.5" y="2" width="3" height="11" rx=".5" fill="currentColor" stroke="none"/></svg>'}</div><p>Sem dados</p></div>
        {:else}
          {@const maxTipo = Math.max(...dados.porTipo.map((t) => t.total), 1)}
          <div class="tipos-lista">
            {#each dados.porTipo as t}
              <div class="tipo-row">
                <span class="tipo-icone">{(t.categoria || '?').charAt(0).toUpperCase()}</span>
                <div class="tipo-info">
                  <div class="tipo-nome">{t.categoria || 'Sem categoria'}</div>
                  <div class="progress-wrap" style="margin-top:4px">
                    <div class="progress-bar" style="width:{pct(t.total, maxTipo)}%;background:{t.cor || 'var(--accent-3)'}"></div>
                  </div>
                </div>
                <div class="tipo-right">
                  <div class="tipo-val mono">{formatBRL(t.total)}</div>
                  <div class="tipo-qtd">{t.quantidade}x</div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Histórico mensal -->
      <div class="card secao">
        <h2 class="secao-titulo">Histórico mensal</h2>
        {#if dados.porMes.length === 0}
          <div class="empty-state" style="padding:24px"><div class="icon">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px"><rect x="2" y="3.5" width="12" height="11" rx="1.5"/><path d="M2 7.5h12M5.5 3.5V1.5M10.5 3.5V1.5"/></svg>'}</div><p>Sem dados</p></div>
        {:else}
          <div class="grafico-barras">
            {#each dados.porMes as m}
              {@const p = Math.round(((m.manutencao || 0) / maxG) * 100)}
              <div class="barra-mes">
                <div class="barra-wrap">
                  <div class="barra" style="height:{Math.max(p, 4)}%"></div>
                </div>
                <div class="barra-label">{nomeMes(m.mes)}</div>
                <div class="barra-valor mono">{formatBRL(m.manutencao)}</div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .filtros { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }

  .periodo-tabs { display: flex; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }

  .tab {
    padding: 7px 16px; font-size: 12px; font-weight: 500; background: none;
    border: none; cursor: pointer; color: var(--text-3); transition: all 0.12s;
    font-family: var(--font); border-right: 1px solid var(--border);
  }
  .tab:last-child { border-right: none; }
  .tab.ativo { background: var(--accent); color: var(--accent-fg); }
  .tab:hover:not(.ativo) { background: var(--bg-hover); color: var(--text-2); }

  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }

  .kpi { padding: 18px 20px; }
  .kpi-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-3); margin-bottom: 8px; font-family: var(--font-display); }
  .kpi-val { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
  .kpi-pct { font-size: 11px; color: var(--text-3); margin-top: 4px; }

  .split-bar-wrap { padding: 16px 20px; }
  .split-labels { display: flex; gap: 20px; font-size: 12px; color: var(--text-2); margin-bottom: 10px; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
  .dot.man { background: var(--accent-3); }
  .dot.comb { background: var(--amber); }
  .split-bar { height: 8px; background: var(--border-2); border-radius: 999px; overflow: hidden; display: flex; }
  .split-seg { height: 100%; }
  .split-seg.man { background: var(--accent-3); }
  .split-seg.comb { background: var(--amber); }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  .secao { padding: 20px; }
  .secao-titulo { font-size: 13px; font-weight: 600; font-family: var(--font-display); margin-bottom: 16px; }

  .tipos-lista { display: flex; flex-direction: column; gap: 10px; }

  .tipo-row { display: flex; align-items: center; gap: 10px; }
  .tipo-icone { font-size: 18px; flex-shrink: 0; }
  .tipo-info { flex: 1; min-width: 0; }
  .tipo-nome { font-size: 12px; font-weight: 500; color: var(--text-2); }
  .tipo-right { text-align: right; flex-shrink: 0; }
  .tipo-val { font-size: 13px; font-weight: 600; color: var(--text); }
  .tipo-qtd { font-size: 10px; color: var(--text-3); }

  .grafico-barras { display: flex; align-items: flex-end; gap: 6px; height: 160px; padding: 0 4px; }
  .barra-mes { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }
  .barra-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
  .barra { width: 100%; background: var(--accent-3); border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.3s ease; opacity: 0.85; }
  .barra-label { font-size: 9px; color: var(--text-3); text-transform: capitalize; }
  .barra-valor { font-size: 8px; color: var(--text-3); font-family: var(--font-mono); }

  .mono { font-family: var(--font-mono); }
</style>
