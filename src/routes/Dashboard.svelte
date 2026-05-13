<script lang="ts">
  import { onMount } from 'svelte'
  import { get, currentRoute, formatBRL, formatKm, formatData, diasAtras, STATUS_ALERTA } from '../lib/stores/app'

  let data: any = null
  let loading = true

  onMount(async () => {
    data = await get('/dashboard')
    loading = false
  })

  function nomeMes(mes: string): string {
    if (!mes) return ''
    const [y, m] = mes.split('-').map(Number)
    return new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  }

  function maxGastos(meses: any[]): number {
    return Math.max(...meses.map(m => (m.manutencao || 0)), 1)
  }

  $: maxG = data?.gastosMeses?.length ? maxGastos(data.gastosMeses) : 1
</script>

<div class="page">
  <div class="page-header">
    <div>
      <h1 class="page-title">Dashboard</h1>
      <p class="page-subtitle">Visão geral da frota</p>
    </div>
    <div class="header-actions">
      <button class="btn btn-secondary" on:click={() => currentRoute.set('servicos')}>+ Novo serviço</button>
    </div>
  </div>

  {#if loading}
    <div class="loading">Carregando...</div>
  {:else if data}
    <!-- KPIs -->
    <div class="kpis">
      <div class="kpi">
        <div class="kpi-label">Veículos</div>
        <div class="kpi-value mono">{data.totalVeiculos}</div>
        <div class="kpi-sub">ativos no sistema</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Gastos do mês</div>
        <div class="kpi-value mono">{formatBRL(data.gastosMes)}</div>
        <div class="kpi-sub">manutenção + combustível</div>
      </div>
      <div class="kpi kpi-alert" class:has-alert={data.alertasVencidos > 0}>
        <div class="kpi-label">Alertas vencidos</div>
        <div class="kpi-value mono" class:red={data.alertasVencidos > 0}>{data.alertasVencidos}</div>
        <div class="kpi-sub">{data.alertasAtencao} em atenção</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Custo manutenção</div>
        <div class="kpi-value mono">{formatBRL(data.gastosMesManutencao)}</div>
        <div class="kpi-sub">{formatBRL(data.gastosMesCombustivel)} em combustível</div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Alertas críticos -->
      <div class="card section">
        <div class="section-header">
          <h2 class="section-title">Alertas críticos</h2>
          <button class="btn btn-ghost" style="font-size:12px" on:click={() => currentRoute.set('alertas')}><span style="display:inline-flex;align-items:center;gap:4px">Ver todos {@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><path d="M3 8h10M9 4l4 4-4 4"/></svg>'}</span></button>
        </div>
        {#if data.alertasCriticos.length === 0 && data.alertasEmAtencao.length === 0}
          <div class="empty-state" style="padding:32px">
            <div class="icon">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px"><path d="M2.5 8.5l3.5 3.5 7-7"/></svg>'}</div>
            <p>Tudo em dia!</p>
          </div>
        {:else}
          <div class="alertas-lista">
            {#each [...data.alertasCriticos, ...data.alertasEmAtencao] as a}
              <div class="alerta-item">
                <span class="alerta-emoji">{a.tipo_icone}</span>
                <div class="alerta-info">
                  <div class="alerta-nome">{a.veiculo_apelido}</div>
                  <div class="alerta-tipo">{a.tipo_nome}</div>
                </div>
                <div class="alerta-right">
                  <span class="badge badge-{a.status}" style="background:{STATUS_ALERTA[a.status]?.bg};color:{STATUS_ALERTA[a.status]?.cor}">
                    {STATUS_ALERTA[a.status]?.label}
                  </span>
                  {#if a.km_vencido}
                    <div class="alerta-detalhe">{formatKm(a.km_vencido)} vencido</div>
                  {:else if a.km_faltando}
                    <div class="alerta-detalhe">{formatKm(a.km_faltando)} restantes</div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Gastos por veículo -->
      <div class="card section">
        <div class="section-header">
          <h2 class="section-title">Gastos por veículo</h2>
          <button class="btn btn-ghost" style="font-size:12px" on:click={() => currentRoute.set('financeiro')}><span style="display:inline-flex;align-items:center;gap:4px">Financeiro {@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><path d="M3 8h10M9 4l4 4-4 4"/></svg>'}</span></button>
        </div>
        {#if data.gastosPorVeiculo.length === 0}
          <div class="empty-state" style="padding:32px"><div class="icon">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="width:32px;height:32px"><path d="M2 13h12"/><rect x="2.5" y="8" width="3" height="5" rx=".5" fill="currentColor" stroke="none"/><rect x="6.5" y="5" width="3" height="8" rx=".5" fill="currentColor" stroke="none"/><rect x="10.5" y="2" width="3" height="11" rx=".5" fill="currentColor" stroke="none"/></svg>'}</div><p>Sem dados</p></div>
        {:else}
          {@const maxVal = Math.max(...data.gastosPorVeiculo.map((v) => v.total_manutencao + v.total_combustivel), 1)}
          <div class="veiculos-gastos">
            {#each data.gastosPorVeiculo as v}
              {@const total = v.total_manutencao + v.total_combustivel}
              {@const pct = Math.round((total / maxVal) * 100)}
              <div class="veiculo-gasto-row">
                <div class="veiculo-gasto-info">
                  <span class="veiculo-gasto-nome">{v.apelido}</span>
                  <span class="veiculo-gasto-sub">{v.marca} {v.modelo}</span>
                </div>
                <div class="veiculo-gasto-bar-wrap">
                  <div class="progress-wrap">
                    <div class="progress-bar" style="width:{pct}%; background: var(--accent-3)"></div>
                  </div>
                </div>
                <span class="veiculo-gasto-valor mono">{formatBRL(total)}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Gráfico de gastos mensais -->
    {#if data.gastosMeses.length > 0}
      <div class="card section" style="margin-top:16px">
        <div class="section-header">
          <h2 class="section-title">Gastos mensais — manutenção</h2>
        </div>
        <div class="grafico-barras">
          {#each data.gastosMeses as m}
            {@const pct = Math.round(((m.manutencao || 0) / maxG) * 100)}
            <div class="barra-mes">
              <div class="barra-wrap">
                <div class="barra" style="height:{Math.max(pct, 4)}%"></div>
              </div>
              <div class="barra-label">{nomeMes(m.mes)}</div>
              <div class="barra-valor mono">{formatBRL(m.manutencao)}</div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Atividade recente -->
    <div class="card section" style="margin-top:16px">
      <div class="section-header">
        <h2 class="section-title">Serviços recentes</h2>
        <button class="btn btn-ghost" style="font-size:12px" on:click={() => currentRoute.set('servicos')}><span style="display:inline-flex;align-items:center;gap:4px">Ver todos {@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><path d="M3 8h10M9 4l4 4-4 4"/></svg>'}</span></button>
      </div>
      {#if data.ultimosServicos.length === 0}
        <div class="empty-state" style="padding:32px"><div class="icon">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px"><path d="M10 2a4 4 0 0 1 .92 4.42L14.5 11 13 12.5 8.58 8.92A4 4 0 0 1 4.5 4.5a4 4 0 0 1 .5-2l2.5 2.5L9 3.5 6.5 1A4 4 0 0 1 10 2z"/></svg>'}</div><p>Nenhum serviço registrado</p></div>
      {:else}
        <div class="servicos-lista">
          {#each data.ultimosServicos as s, i}
            <div class="servico-row">
              <div class="servico-icon" style="background:{s.tipo_cor}22; color:{s.tipo_cor}">{s.tipo_icone || '🔧'}</div>
              <div class="servico-info">
                <div class="servico-tipo">{s.tipo_nome || s.tipo_servico_custom || 'Serviço'}</div>
                <div class="servico-meta">{s.veiculo_apelido} · {formatKm(s.km_no_momento)} · {diasAtras(s.data)}</div>
              </div>
              <div class="servico-valor mono">{formatBRL(s.valor_total)}</div>
            </div>
            {#if i < data.ultimosServicos.length - 1}<div class="row-divider" />{/if}
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .header-actions { display: flex; gap: 8px; }

  .kpis {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 12px; margin-bottom: 20px;
  }

  .kpi {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 18px 20px;
  }

  .kpi-alert.has-alert { border-color: rgba(239,68,68,.3); background: var(--red-bg); }

  .kpi-label {
    font-size: 10px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-3); margin-bottom: 8px;
    font-family: var(--font-display);
  }

  .kpi-value {
    font-size: 24px; font-weight: 600; letter-spacing: -0.03em;
    line-height: 1; margin-bottom: 6px; color: var(--text);
  }

  .kpi-sub { font-size: 11px; color: var(--text-3); }
  .red { color: var(--red) !important; }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  .section { padding: 20px; }

  .section-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px;
  }

  .section-title { font-size: 13px; font-weight: 600; font-family: var(--font-display); color: var(--text); }

  /* Alertas */
  .alertas-lista { display: flex; flex-direction: column; gap: 2px; }

  .alerta-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 8px; border-radius: var(--radius-sm);
    transition: background 0.1s;
  }

  .alerta-item:hover { background: var(--bg-hover); }
  .alerta-emoji { font-size: 18px; flex-shrink: 0; }
  .alerta-info { flex: 1; min-width: 0; }
  .alerta-nome { font-size: 13px; font-weight: 500; color: var(--text); }
  .alerta-tipo { font-size: 11px; color: var(--text-3); }
  .alerta-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .alerta-detalhe { font-size: 10px; color: var(--text-3); font-family: var(--font-mono); }

  /* Gastos por veículo */
  .veiculos-gastos { display: flex; flex-direction: column; gap: 12px; }

  .veiculo-gasto-row { display: flex; align-items: center; gap: 10px; }

  .veiculo-gasto-info { min-width: 100px; }
  .veiculo-gasto-nome { font-size: 13px; font-weight: 500; display: block; color: var(--text); }
  .veiculo-gasto-sub { font-size: 10px; color: var(--text-3); }

  .veiculo-gasto-bar-wrap { flex: 1; }

  .veiculo-gasto-valor { font-size: 13px; color: var(--text-2); min-width: 80px; text-align: right; font-size: 12px; }

  /* Gráfico */
  .grafico-barras {
    display: flex; align-items: flex-end; gap: 8px;
    height: 140px; padding: 0 4px;
  }

  .barra-mes { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }

  .barra-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }

  .barra {
    width: 100%; background: var(--accent-3);
    border-radius: 4px 4px 0 0;
    min-height: 4px;
    transition: height 0.3s ease;
    opacity: 0.85;
  }

  .barra-label { font-size: 10px; color: var(--text-3); text-transform: capitalize; }
  .barra-valor { font-size: 9px; color: var(--text-3); font-family: var(--font-mono); }

  /* Serviços */
  .servicos-lista { display: flex; flex-direction: column; }

  .servico-row {
    display: flex; align-items: center; gap: 12px; padding: 12px 8px;
    transition: background 0.1s; border-radius: var(--radius-sm);
  }

  .servico-row:hover { background: var(--bg-hover); }

  .servico-icon {
    width: 34px; height: 34px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }

  .servico-info { flex: 1; min-width: 0; }
  .servico-tipo { font-size: 13px; font-weight: 500; color: var(--text); }
  .servico-meta { font-size: 11px; color: var(--text-3); margin-top: 1px; }
  .servico-valor { font-size: 13px; color: var(--text-2); }

  .mono { font-family: var(--font-mono); }
</style>
