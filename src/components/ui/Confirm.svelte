<script lang="ts">
  import { confirmDialog } from '../../lib/stores/app'
  function responder(valor: boolean) {
    if ($confirmDialog) { $confirmDialog.resolve(valor); confirmDialog.set(null) }
  }
</script>

{#if $confirmDialog}
  <div class="overlay" on:click|self={() => responder(false)}>
    <div class="dialog">
      <p class="mensagem">{$confirmDialog.message}</p>
      <div class="acoes">
        <button class="btn btn-secondary" on:click={() => responder(false)}>Cancelar</button>
        <button class="btn btn-danger" on:click={() => responder(true)}>Confirmar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.65);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; animation: fadeIn .15s ease;
  }
  .dialog {
    background: var(--bg-card); border: 1px solid var(--border-2);
    border-radius: var(--radius); padding: 24px; width: 100%; max-width: 360px;
    box-shadow: var(--shadow-lg); animation: slideUp .15s ease;
  }
  .mensagem { font-size: 14px; color: var(--text); line-height: 1.5; margin-bottom: 20px; }
  .acoes { display: flex; gap: 8px; justify-content: flex-end; }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
</style>
