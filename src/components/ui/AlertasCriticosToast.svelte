<script lang="ts">
  import { onMount } from 'svelte'
  import { get, currentRoute } from '../../lib/stores/app'

  let criticos: any[] = []
  let visivel = false
  const _d = new Date()
  const hoje = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`
  const chave = `alertas_criticos_visto_${hoje}`

  function fechar() { localStorage.setItem(chave, '1'); visivel = false }
  function verAlertas() { currentRoute.set('alertas'); fechar() }

  onMount(async () => {
    if (localStorage.getItem(chave)) return
    const lista = await get('/alertas') || []
    criticos = lista.filter((a: any) => a.status === 'vencido')
    if (criticos.length > 0) visivel = true
  })
</script>

{#if visivel}
  <div class="toast-alertas">
    <div class="alerta-icon">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2L2 13h12L8 2z"/><path d="M8 6v4M8 11.5v.5"/></svg>'}</div>
    <div class="alerta-corpo">
      <div class="alerta-titulo">{criticos.length} alerta{criticos.length !== 1 ? 's' : ''} vencido{criticos.length !== 1 ? 's' : ''}</div>
      <div class="alerta-lista">
        {#each criticos.slice(0, 4) as a}
          <div class="alerta-row">
            <span class="alerta-icone">{a.tipo_icone}</span>
            <span class="alerta-nome">{a.veiculo_apelido}</span>
            <span class="alerta-tipo">{a.tipo_nome}</span>
          </div>
        {/each}
        {#if criticos.length > 4}
          <div class="alerta-mais">+{criticos.length - 4} outros</div>
        {/if}
      </div>
      <button class="alerta-btn" on:click={verAlertas}>Ver todos os alertas <span class="alerta-arrow">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>'}</span></button>
    </div>
    <button class="alerta-fechar" on:click={fechar}>{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>'}</button>
  </div>
{/if}

<style>
  .toast-alertas {
    position: fixed; bottom: 24px; right: 24px;
    display: flex; align-items: flex-start; gap: 12px;
    background: var(--bg-card); border: 1px solid rgba(239,68,68,.3);
    border-radius: var(--radius); padding: 14px 16px;
    box-shadow: var(--shadow-lg); min-width: 280px; max-width: 320px;
    z-index: 500; animation: slideIn 0.22s ease;
  }
  @keyframes slideIn { from { opacity: 0; transform: translateX(16px) } to { opacity: 1; transform: translateX(0) } }
  .alerta-icon { width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; color: var(--red); display: flex; align-items: center; }
  .alerta-icon :global(svg) { width: 18px; height: 18px; }
  .alerta-corpo { flex: 1; min-width: 0; }
  .alerta-titulo { font-size: 13px; font-weight: 700; color: var(--red); margin-bottom: 8px; }
  .alerta-lista { display: flex; flex-direction: column; gap: 3px; margin-bottom: 10px; }
  .alerta-row { display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .alerta-icone { font-size: 12px; }
  .alerta-nome { font-weight: 600; color: var(--text-2); }
  .alerta-tipo { color: var(--text-3); }
  .alerta-mais { font-size: 11px; color: var(--text-3); }
  .alerta-btn { font-size: 12px; font-weight: 600; color: var(--red); background: none; border: none; cursor: pointer; padding: 0; text-decoration: underline; text-underline-offset: 2px; font-family: var(--font); }
  .alerta-fechar { width: 20px; height: 20px; border-radius: 50%; background: none; border: none; cursor: pointer; color: var(--text-3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.1s; }
  .alerta-fechar :global(svg) { width: 12px; height: 12px; }
  .alerta-btn { display: inline-flex; align-items: center; gap: 4px; }
  .alerta-arrow { display: inline-flex; align-items: center; width: 12px; height: 12px; }
  .alerta-arrow :global(svg) { width: 12px; height: 12px; }
  .alerta-fechar:hover { background: var(--red-bg); color: var(--red); }
</style>
