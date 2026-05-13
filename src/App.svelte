<script lang="ts">
  import { onMount } from 'svelte'
  import { currentRoute, toast } from './lib/stores/app'
  import Sidebar from './components/layout/Sidebar.svelte'
  import Toast from './components/ui/Toast.svelte'
  import Confirm from './components/ui/Confirm.svelte'
  import AlertasCriticosToast from './components/ui/AlertasCriticosToast.svelte'
  import Dashboard from './routes/Dashboard.svelte'
  import Veiculos from './routes/Veiculos.svelte'
  import Servicos from './routes/Servicos.svelte'
  import Alertas from './routes/Alertas.svelte'
  import Abastecimento from './routes/Abastecimento.svelte'
  import Financeiro from './routes/Financeiro.svelte'
  import Configuracoes from './routes/Configuracoes.svelte'

  $: route = $currentRoute

  let scrollY = 0
  onMount(() => {
    const onScroll = () => { scrollY = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  })
</script>

<div class="app-shell">
  <Sidebar />
  <main class="main-content">
    {#if route === 'dashboard'}
      <Dashboard />
    {:else if route === 'veiculos'}
      <Veiculos />
    {:else if route === 'servicos'}
      <Servicos />
    {:else if route === 'alertas'}
      <Alertas />
    {:else if route === 'abastecimento'}
      <Abastecimento />
    {:else if route === 'financeiro'}
      <Financeiro />
    {:else if route === 'configuracoes'}
      <Configuracoes />
    {/if}
  </main>
</div>

{#if $toast}
  <Toast message={$toast.message} type={$toast.type} />
{/if}

<Confirm />
<AlertasCriticosToast />

{#if scrollY > 300}
  <button class="scroll-top" on:click={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="Voltar ao topo">
    <svg viewBox="0 0 16 16"><path d="M8 12V4M4 8l4-4 4 4"/></svg>
  </button>
{/if}

<style>

  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(:root) {
    /* Cores base */
    --bg:          #0d0d0d;
    --bg-2:        #141414;
    --bg-card:     #1a1a1a;
    --bg-hover:    #222222;
    --bg-active:   #2a2a2a;
    --border:      #2a2a2a;
    --border-2:    #333333;

    /* Texto */
    --text:        #f0f0f0;
    --text-2:      #a0a0a0;
    --text-3:      #606060;
    --text-4:      #404040;

    /* Accent azul FrotaFy */
    --accent:      #071845;
    --accent-2:    #0c2580;
    --accent-3:    #1a6aff;
    --accent-fg:   #c8dfff;
    --accent-glow: rgba(26, 106, 255, 0.35);

    /* Semânticas */
    --green:       #22c55e;
    --green-bg:    rgba(34, 197, 94, 0.08);
    --red:         #ef4444;
    --red-bg:      rgba(239, 68, 68, 0.08);
    --amber:       #f59e0b;
    --amber-bg:    rgba(245, 158, 11, 0.08);
    --blue:        #3b82f6;
    --blue-bg:     rgba(59, 130, 246, 0.08);

    /* Dimensões */
    --radius:      10px;
    --radius-sm:   6px;
    --radius-xs:   4px;
    --radius-lg:   14px;
    --radius-xl:   20px;
    --sidebar-w:   240px;

    /* Sombras */
    --shadow:      0 1px 3px rgba(0,0,0,.4), 0 1px 2px rgba(0,0,0,.3);
    --shadow-md:   0 4px 16px rgba(0,0,0,.5), 0 2px 4px rgba(0,0,0,.3);
    --shadow-lg:   0 12px 40px rgba(0,0,0,.6);

    /* Tipografia */
    --font:        'Inter', system-ui, sans-serif;
    --font-display:'Syne', system-ui, sans-serif;
    --font-mono:   'JetBrains Mono', monospace;
  }

  :global(body) {
    font-family: var(--font);
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :global(button) { font-family: var(--font); cursor: pointer; border: none; background: none; }
  :global(input, select, textarea) { font-family: var(--font); font-size: 14px; color: var(--text); }

  /* ── Botões ── */
  :global(.btn) {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: var(--radius-sm);
    font-size: 13px; font-weight: 500; transition: all 0.15s ease;
    cursor: pointer; border: none; white-space: nowrap;
    font-family: var(--font);
  }

  :global(.btn-primary) {
    background: var(--accent-3);
    color: var(--accent-fg);
    border: 1px solid var(--accent-2);
  }
  :global(.btn-primary:hover) {
    background: #2a7aff;
    box-shadow: 0 0 16px var(--accent-glow);
  }

  :global(.btn-secondary) {
    background: var(--bg-card);
    color: var(--text-2);
    border: 1px solid var(--border-2);
  }
  :global(.btn-secondary:hover) {
    background: var(--bg-hover);
    color: var(--text);
    border-color: var(--text-4);
  }

  :global(.btn-ghost) {
    background: transparent;
    color: var(--text-3);
    padding: 6px 10px;
  }
  :global(.btn-ghost:hover) {
    background: var(--bg-hover);
    color: var(--text-2);
  }

  :global(.btn-danger) {
    background: var(--red-bg);
    color: var(--red);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
  :global(.btn-danger:hover) { background: rgba(239, 68, 68, 0.15); }

  /* ── Card ── */
  :global(.card) {
    background: var(--bg-card);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
  }

  /* ── Input ── */
  :global(.input) {
    width: 100%;
    padding: 9px 12px;
    border: 1px solid var(--border-2);
    border-radius: var(--radius-sm);
    background: var(--bg-2);
    color: var(--text);
    font-size: 14px;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
  }
  :global(.input:focus) {
    border-color: var(--accent-3);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }
  :global(.input::placeholder) { color: var(--text-4); }
  :global(select.input option) { background: var(--bg-card); color: var(--text); }

  /* ── Label ── */
  :global(.label) {
    display: block; font-size: 11px; font-weight: 500;
    color: var(--text-3); margin-bottom: 5px;
    letter-spacing: 0.04em; text-transform: uppercase;
    font-family: var(--font-display);
  }

  /* ── Badge ── */
  :global(.badge) {
    display: inline-flex; align-items: center;
    padding: 2px 8px; border-radius: 999px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
  }

  /* ── Divider ── */
  :global(.divider) { height: 1px; background: var(--border); margin: 16px 0; }

  /* ── Page ── */
  :global(.page) { padding: 32px 40px; max-width: 1280px; }

  :global(.page-header) {
    display: flex; align-items: center;
    justify-content: space-between; margin-bottom: 28px;
  }

  :global(.page-title) {
    font-size: 22px; font-weight: 700;
    letter-spacing: -0.04em; color: var(--text);
    font-family: var(--font-display);
  }

  :global(.page-subtitle) {
    font-size: 12px; color: var(--text-3);
    margin-top: 2px; letter-spacing: 0.01em;
  }

  /* ── Empty state ── */
  :global(.empty-state) {
    text-align: center; padding: 64px 24px; color: var(--text-3);
  }
  :global(.empty-state .icon) { font-size: 36px; margin-bottom: 12px; opacity: 0.3; display: flex; align-items: center; justify-content: center; }
  :global(.empty-state p) { font-size: 14px; color: var(--text-3); }

  /* ── Modal ── */
  :global(.modal-overlay) {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.75);
    backdrop-filter: blur(6px);
    z-index: 100; display: flex;
    align-items: center; justify-content: center;
    animation: fadeIn 0.15s ease;
  }

  :global(.modal) {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    padding: 28px;
    width: 100%; max-width: 500px;
    border: 1px solid var(--border-2);
    box-shadow: var(--shadow-lg);
    animation: slideUp 0.2s ease;
    max-height: 90vh;
    overflow-y: auto;
  }

  :global(.modal-title) {
    font-size: 16px; font-weight: 700;
    margin-bottom: 20px; letter-spacing: -0.02em;
    font-family: var(--font-display);
    color: var(--text);
  }

  :global(.form-group) { margin-bottom: 16px; }

  :global(.form-row) {
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  }

  :global(.form-row-3) {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
  }

  :global(.modal-actions) {
    display: flex; gap: 8px; justify-content: flex-end; margin-top: 24px;
  }

  /* ── Avatar ── */
  :global(.avatar) {
    width: 36px; height: 36px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; flex-shrink: 0;
    font-family: var(--font-display);
  }

  /* ── Monospace numbers ── */
  :global(.mono) { font-family: var(--font-mono); }

  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px) }
    to   { opacity: 1; transform: translateY(0) }
  }

  .app-shell { display: flex; min-height: 100vh; }

  .main-content {
    margin-left: var(--sidebar-w);
    flex: 1; min-height: 100vh;
  }

  :global(.scroll-top) {
    position: fixed; bottom: 28px; right: 28px;
    width: 38px; height: 38px; border-radius: 50%;
    background: var(--bg-card); border: 1px solid var(--border-2);
    color: var(--text-2); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: var(--shadow-md);
    transition: all 0.15s; z-index: 200; opacity: 0.8;
  }

  :global(.scroll-top:hover) { transform: translateY(-2px); opacity: 1; border-color: var(--accent-3); }

  :global(.scroll-top svg) {
    width: 14px; height: 14px; fill: none; stroke: currentColor;
    stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
  }

  /* ── Status badges ── */
  :global(.status-vencido) { background: var(--red-bg); color: var(--red); border: 1px solid rgba(239,68,68,.2); }
  :global(.status-atencao) { background: var(--amber-bg); color: var(--amber); border: 1px solid rgba(245,158,11,.2); }
  :global(.status-ok)      { background: var(--green-bg); color: var(--green); border: 1px solid rgba(34,197,94,.2); }
  :global(.status-sem_dados) { background: var(--bg-hover); color: var(--text-3); border: 1px solid var(--border-2); }

  /* ── Progress bar ── */
  :global(.progress-wrap) {
    height: 4px; background: var(--border-2);
    border-radius: 99px; overflow: hidden;
  }
  :global(.progress-bar) { height: 100%; border-radius: 99px; transition: width 0.3s ease; }
  :global(.progress-ok)      { background: var(--green); }
  :global(.progress-atencao) { background: var(--amber); }
  :global(.progress-vencido) { background: var(--red); }

  /* ── Loading ── */
  :global(.loading) { color: var(--text-3); padding: 64px; text-align: center; font-size: 13px; }

  /* ── Row divider ── */
  :global(.row-divider) { height: 1px; background: var(--border); margin: 0 16px; }
</style>
