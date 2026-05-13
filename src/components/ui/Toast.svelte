<script lang="ts">
  export let message: string
  export let type: 'success' | 'error' = 'success'
</script>

<div class="toast toast-{type}">
  <span class="icon">
    {#if type === 'success'}
      {@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8.5l3.5 3.5 7-7"/></svg>'}
    {:else}
      {@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>'}
    {/if}
  </span>
  {message}
</div>

<style>
  .toast {
    position: fixed; bottom: 28px; left: 50%;
    transform: translateX(-50%);
    padding: 11px 20px; border-radius: var(--radius-sm);
    font-size: 13px; font-weight: 500;
    display: flex; align-items: center; gap: 8px;
    z-index: 999; box-shadow: var(--shadow-lg);
    animation: toastIn 0.2s ease; white-space: nowrap;
    border: 1px solid transparent;
  }

  .toast-success {
    background: var(--bg-card); color: var(--text);
    border-color: var(--border-2);
  }

  .toast-error {
    background: var(--red-bg); color: var(--red);
    border-color: rgba(239,68,68,.3);
  }

  .icon { display: inline-flex; align-items: center; width: 14px; height: 14px; flex-shrink: 0; }

  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(8px) }
    to   { opacity: 1; transform: translateX(-50%) translateY(0) }
  }
</style>
