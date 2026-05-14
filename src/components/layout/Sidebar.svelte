<script lang="ts">
  import { onMount } from 'svelte'
  import { currentRoute, post, showConfirm, type Route } from '../../lib/stores/app'

  const nav: { id: Route; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: `<svg viewBox="0 0 16 16"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>` },
    { id: 'veiculos',    label: 'Veículos',    icon: `<svg viewBox="0 0 16 16"><path d="M1.5 10.5h13M3 10.5l1.5-5h7l1.5 5"/><circle cx="4.5" cy="12.5" r="1.5"/><circle cx="11.5" cy="12.5" r="1.5"/><path d="M5.5 5.5L6 3h4l.5 2.5"/></svg>` },
    { id: 'servicos',    label: 'Serviços',    icon: `<svg viewBox="0 0 16 16"><path d="M12.5 2.5l1 1-8.5 8.5-2 .5.5-2 8.5-8.5z"/><path d="M11 4l1 1"/></svg>` },
    { id: 'alertas',     label: 'Alertas',     icon: `<svg viewBox="0 0 16 16"><path d="M8 2L2 13h12L8 2z"/><path d="M8 6v4M8 11.5v.5"/></svg>` },
    { id: 'abastecimento', label: 'Combustível', icon: `<svg viewBox="0 0 16 16"><path d="M3 14V4a1 1 0 011-1h5a1 1 0 011 1v10"/><path d="M3 14h7M10 6h2a1 1 0 011 1v4a1 1 0 001 1"/><path d="M13 7l1.5-1.5"/></svg>` },
    { id: 'financeiro',  label: 'Financeiro',  icon: `<svg viewBox="0 0 16 16"><path d="M1.5 12L5 8l3 2.5 4-5 2.5 2"/><path d="M1.5 4h13"/></svg>` },
    { id: 'configuracoes', label: 'Configurações', icon: `<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="2"/><path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7"/></svg>` },
  ]

  let temAtualizacao = false

  onMount(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/atualizar/check').then(r => r.json())
        temAtualizacao = r.hasUpdate || false
      } catch {}
    }
    check()
    const retry = setTimeout(check, 8000)
    const t = setInterval(check, 30 * 60 * 1000)
    return () => { clearInterval(t); clearTimeout(retry) }
  })

  let atualizando = false
  let etapa = ''
  let erro = ''
  let logLines: string[] = []

  async function iniciarAtualizacao() {
    if (!await showConfirm('Atualizar o FrotaFy? O sistema será reiniciado automaticamente.')) return
    atualizando = true; etapa = 'Iniciando...'; erro = ''
    const res = await fetch('/api/atualizar', { method: 'POST' })
    const json = await res.json()
    if (!json.ok) { erro = json.error || 'Erro ao iniciar'; atualizando = false; return }
    const poll = setInterval(async () => {
      try {
        const s = await fetch('/api/atualizar/status').then(r => r.json())
        if (s.etapa) etapa = s.etapa
        if (s.log) logLines = s.log
        if (s.error) { erro = s.error; clearInterval(poll); return }
        if (s.done) { etapa = 'Reiniciando...'; clearInterval(poll); setTimeout(() => aguardarServidor(), 3000) }
      } catch { etapa = 'Reiniciando...'; clearInterval(poll); setTimeout(() => aguardarServidor(), 2000) }
    }, 1500)
  }

  async function aguardarServidor() {
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1500))
      try { const r = await fetch('/api/veiculos'); if (r.ok) { window.location.reload(); return } } catch {}
    }
    window.location.reload()
  }
</script>

<aside class="sidebar">
  <div class="brand">
    <img src="/FrotaFyLogo.png" alt="FrotaFy" class="brand-logo" />
    <div class="brand-text">
      <div class="brand-name">FrotaFy</div>
      <div class="brand-sub">Manutenção automotiva</div>
    </div>
  </div>

  <nav class="nav">
    {#each nav as item}
      <button
        class="nav-item"
        class:active={$currentRoute === item.id}
        on:click={() => currentRoute.set(item.id)}
      >
        <span class="nav-icon">{@html item.icon}</span>
        <span class="nav-label">{item.label}</span>
      </button>
    {/each}
  </nav>

  <div class="sidebar-footer">
    <button class="btn-atualizar" class:tem-update={temAtualizacao} on:click={iniciarAtualizacao}>
      <svg viewBox="0 0 16 16" class="update-icon"><path d="M13.5 8a5.5 5.5 0 1 1-1.1-3.3"/><path d="M13.5 2v3h-3"/></svg>
      Atualizar sistema
      {#if temAtualizacao}<span class="update-dot"></span>{/if}
    </button>
    <button class="btn-fechar" on:click={async () => {
      if (!await showConfirm('Encerrar o FrotaFy?')) return
      await post('/shutdown', {})
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0d0d0d;font-family:sans-serif;color:#606060;flex-direction:column;gap:12px"><p style="font-size:18px;font-weight:600;color:#f0f0f0">FrotaFy encerrado</p><p>Pode fechar esta aba.</p></div>'
    }}>
      <svg viewBox="0 0 16 16" class="close-icon"><path d="M3 3l10 10M13 3L3 13"/></svg>
      Fechar sistema
    </button>
    <div class="version">v1.0.0</div>
  </div>
</aside>

{#if atualizando}
  <div class="update-overlay">
    <div class="update-box">
      <div class="update-title">Atualizando FrotaFy</div>
      {#if erro}
        <div class="update-erro">{erro}</div>
        {#if logLines.length > 0}
          <pre class="update-log">{logLines.join('\n')}</pre>
        {/if}
        <button class="btn btn-secondary" on:click={() => atualizando = false}>Fechar</button>
      {:else}
        <div class="update-spinner"></div>
        <div class="update-etapa">{etapa}</div>
        <div class="update-aviso">Não feche esta janela.</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .sidebar {
    position: fixed; left: 0; top: 0; height: 100vh;
    width: var(--sidebar-w);
    background: var(--bg-2);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column; z-index: 50;
  }

  .brand {
    display: flex; align-items: center; gap: 11px;
    padding: 20px 18px 16px;
    border-bottom: 1px solid var(--border);
  }

  .brand-logo {
    height: 36px; width: auto; object-fit: contain; flex-shrink: 0;
  }

  .brand-name {
    font-size: 14px; font-weight: 700; color: var(--text);
    font-family: var(--font-display); letter-spacing: -0.02em;
  }

  .brand-sub {
    font-size: 10px; color: var(--text-3);
    letter-spacing: 0.02em; margin-top: 1px;
  }

  .nav { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 1px; }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: var(--radius-sm);
    font-size: 13px; font-weight: 400;
    color: var(--text-3);
    transition: all 0.12s ease; text-align: left;
    width: 100%; cursor: pointer; background: none; border: none;
    position: relative;
  }

  .nav-item:hover { background: var(--bg-hover); color: var(--text-2); }

  .nav-item.active {
    background: var(--accent);
    color: var(--accent-fg);
    font-weight: 500;
    border: 1px solid var(--accent-2);
  }

  .nav-icon {
    width: 18px; height: 18px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }

  .nav-icon :global(svg) {
    width: 15px; height: 15px; fill: none; stroke: currentColor;
    stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round;
  }

  .nav-label { font-size: 13px; }

  .sidebar-footer {
    padding: 10px 10px 14px;
    border-top: 1px solid var(--border);
    display: flex; flex-direction: column; gap: 2px;
  }

  .btn-atualizar, .btn-fechar {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; border-radius: var(--radius-sm);
    font-size: 12px; color: var(--text-3);
    background: none; border: none; cursor: pointer;
    width: 100%; transition: all 0.12s;
    font-family: var(--font);
  }

  .btn-atualizar:hover { background: var(--bg-hover); color: var(--text-2); }
  .btn-atualizar.tem-update { color: var(--amber); }
  .btn-atualizar.tem-update:hover { background: var(--amber-bg); }

  .update-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--amber); margin-left: auto;
  }

  .btn-fechar:hover { background: var(--red-bg); color: var(--red); }

  .update-icon, .close-icon {
    width: 13px; height: 13px; fill: none; stroke: currentColor;
    stroke-width: 1.5; stroke-linecap: round; flex-shrink: 0;
  }

  .version {
    font-size: 10px; color: var(--text-4);
    font-family: var(--font-mono); padding: 0 10px; margin-top: 4px;
  }

  .update-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.8);
    display: flex; align-items: center; justify-content: center; z-index: 999;
  }

  .update-box {
    background: var(--bg-card); border: 1px solid var(--border-2);
    border-radius: var(--radius-lg); padding: 40px 48px;
    text-align: center; min-width: 320px;
    display: flex; flex-direction: column; align-items: center; gap: 16px;
  }

  .update-title { font-size: 16px; font-weight: 700; color: var(--text); font-family: var(--font-display); }

  .update-spinner {
    width: 32px; height: 32px;
    border: 2px solid var(--border-2);
    border-top-color: var(--accent-3);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .update-etapa { font-size: 13px; color: var(--text-2); }
  .update-aviso { font-size: 11px; color: var(--text-3); }

  .update-erro {
    font-size: 12px; color: var(--red);
    background: var(--red-bg); border: 1px solid rgba(239,68,68,.2);
    border-radius: var(--radius-sm); padding: 10px 16px;
  }

  .update-log {
    font-size: 10px; font-family: var(--font-mono); color: var(--text-3);
    background: var(--bg-2); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 10px 12px;
    white-space: pre-wrap; max-height: 120px; overflow-y: auto;
    text-align: left; width: 100%;
  }
</style>
