<script lang="ts">
  export let message: string
  export let type: 'success' | 'error' = 'success'
</script>

<div class="toast toast-{type}">
  <span class="icon">{type === 'success' ? '✓' : '✕'}</span>
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

  .icon { font-weight: 700; font-size: 12px; }

  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(8px) }
    to   { opacity: 1; transform: translateX(-50%) translateY(0) }
  }
</style>
