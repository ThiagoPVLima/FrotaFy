<script lang="ts">
  import { onMount } from 'svelte'
  import { get, post, put, del, showToast, showConfirm } from '../lib/stores/app'

  let tipos: any[] = []
  let gdriveStatus: any = {}
  let gdriveBackupando = false
  let gdriveDesconectando = false
  let intervaloHoras = 6
  let salvandoIntervalo = false

  let modalTipo = false
  let editandoTipo: any = null
  let formTipo = { nome: '', icone: '🔧', cor: '#6b7280' }

  async function load() {
    const [t, cfg] = await Promise.all([get('/tipos-servico'), get('/google-drive/config')])
    tipos = t || []
    if (cfg) intervaloHoras = cfg.intervaloHoras || 6
  }

  async function loadDrive() {
    gdriveStatus = await get('/google-drive/status') || {}
  }

  async function gdriveConectar() {
    const r = await get('/google-drive/auth-url')
    if (!r?.ok) { showToast(r?.error || 'Erro ao gerar URL', 'error'); return }
    window.open(r.url, '_blank')
  }

  async function gdriveBackupAgora() {
    gdriveBackupando = true
    try {
      const r = await post('/google-drive/backup-agora', {})
      if (r?.ok) { showToast('Backup no Google Drive realizado!'); await loadDrive() }
      else showToast(r?.error || 'Erro ao fazer backup', 'error')
    } catch (e: any) {
      showToast(e?.message || 'Erro ao fazer backup', 'error')
    } finally { gdriveBackupando = false }
  }

  async function gdriveDesconectar() {
    gdriveDesconectando = true
    try {
      await del('/google-drive/desconectar')
      showToast('Google Drive desconectado')
      await loadDrive()
    } finally { gdriveDesconectando = false }
  }

  onMount(() => { load(); loadDrive() })

  async function salvarIntervalo() {
    salvandoIntervalo = true
    await post('/google-drive/config', { intervaloHoras })
    showToast('Frequência de backup salva!')
    salvandoIntervalo = false
  }

  async function baixarDb() {
    window.location.href = '/api/backup'
  }

  function abrirModalTipo(t?: any) {
    editandoTipo = t || null
    formTipo = t ? { nome: t.nome, cor: t.cor || '#6b7280' } : { nome: '', cor: '#6b7280' }
    modalTipo = true
  }

  async function salvarTipo() {
    if (!formTipo.nome.trim()) { showToast('Informe o nome', 'error'); return }
    if (editandoTipo) {
      await put(`/tipos-servico/${editandoTipo.id}`, formTipo)
      showToast('Tipo atualizado!')
    } else {
      await post('/tipos-servico', formTipo)
      showToast('Tipo criado!')
    }
    modalTipo = false; load()
  }

  async function deletarTipo(id: number) {
    if (!await showConfirm('Remover este tipo de serviço? Serviços vinculados não serão afetados.')) return
    await del(`/tipos-servico/${id}`)
    showToast('Tipo removido', 'error')
    load()
  }

  function formatData(d: string): string {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
</script>

<div class="page">
  <div class="page-header">
    <div>
      <h1 class="page-title">Configurações</h1>
      <p class="page-subtitle">Backup, tipos de serviço e preferências</p>
    </div>
  </div>

  <!-- Backup -->
  <div class="card secao">
    <h2 class="secao-titulo">
      <svg viewBox="0 0 16 16" style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round"><path d="M6 2L2 9h4l2 5 2-5h4L10 2H6z"/></svg>
      Backup automático — Google Drive
    </h2>
    <p class="secao-desc">O banco de dados é enviado automaticamente para o Google Drive no intervalo configurado.</p>

    {#if gdriveStatus.semCredentials}
      <div class="gdrive-sem-cred">
        <div style="font-size:14px;font-weight:600;margin-bottom:6px">credentials.json não encontrado</div>
        <p style="font-size:13px;color:var(--text-2);margin:0">
          Para usar o backup no Google Drive, crie o arquivo <code>credentials.json</code> na pasta do projeto.
          Veja as instruções detalhadas no arquivo <strong>LEIA-ME.md</strong>.
        </p>
      </div>
    {:else if gdriveStatus.conectado}
      <div class="gdrive-conectado">
        <span class="backup-ok">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8.5l3.5 3.5 7-7"/></svg>'}</span>
        Conectado como <strong>{gdriveStatus.email || 'conta Google'}</strong>
      </div>
      <div class="backup-row">
        <div class="ultimo-backup">
          {#if gdriveStatus.ultimoBackup}
            <span class="backup-ok">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8.5l3.5 3.5 7-7"/></svg>'}</span> Último: {new Date(gdriveStatus.ultimoBackup).toLocaleString('pt-BR')}
          {:else}
            Nenhum backup realizado ainda
          {/if}
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <button class="btn btn-secondary" on:click={gdriveBackupAgora} disabled={gdriveBackupando}>
            {#if gdriveBackupando}Enviando...{:else}<span class="btn-icon-wrap">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10V2M5 5l3-3 3 3M2 13h12"/></svg>'}</span> Backup agora{/if}
          </button>
          <button class="btn btn-ghost" on:click={gdriveDesconectar} disabled={gdriveDesconectando}>
            {gdriveDesconectando ? '...' : 'Desconectar'}
          </button>
        </div>
      </div>
    {:else}
      <div class="ultimo-backup" style="padding-bottom:0">Não conectado ao Google Drive</div>
      <div style="margin-top:12px">
        <button class="btn btn-secondary" on:click={gdriveConectar}>
          Conectar Google Drive
        </button>
      </div>
    {/if}

    <div class="divider"></div>

    <div class="backup-frequencia">
      <div style="flex:1;max-width:200px">
        <div class="label">Frequência do backup</div>
        <select class="input" bind:value={intervaloHoras}>
          {#each [1,2,4,6,12,24] as h}<option value={h}>{h}h</option>{/each}
        </select>
      </div>
      <button class="btn btn-primary" on:click={salvarIntervalo} disabled={salvandoIntervalo} style="align-self:flex-end">
        {salvandoIntervalo ? 'Salvando...' : 'Salvar frequência'}
      </button>
    </div>

    <div class="divider"></div>

    <button class="btn btn-secondary" on:click={baixarDb}>
      <span class="btn-icon-wrap">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v8M5 7l3 3 3-3M2 13h12"/></svg>'}</span>
      Baixar banco de dados (.db)
    </button>
  </div>

  <!-- Tipos de serviço -->
  <div class="card secao" style="margin-top:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h2 class="secao-titulo" style="margin:0">
        <svg viewBox="0 0 16 16" style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round"><path d="M12.5 2.5l1 1-8.5 8.5-2 .5.5-2 8.5-8.5z"/></svg>
        Tipos de serviço
      </h2>
      <button class="btn btn-primary" on:click={() => abrirModalTipo()}>+ Novo tipo</button>
    </div>

    <div class="tipos-grid">
      {#each tipos as t}
        <div class="tipo-item">
          <div class="tipo-icon" style="background:{t.cor}22;color:{t.cor}">{t.nome.charAt(0).toUpperCase()}</div>
          <div class="tipo-nome">{t.nome}</div>
          <div class="tipo-acoes">
            <button class="btn btn-ghost" style="padding:4px 8px" on:click={() => abrirModalTipo(t)}><span class="btn-svg">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 2.5l1 1-8.5 8.5-2 .5.5-2 8.5-8.5z"/><path d="M11 4l1 1"/></svg>'}</span></button>
            <button class="btn btn-ghost" style="color:var(--red);padding:4px 8px" on:click={() => deletarTipo(t.id)}><span class="btn-svg">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>'}</span></button>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Sobre -->
  <div class="card secao" style="margin-top:16px">
    <h2 class="secao-titulo">
      <svg viewBox="0 0 16 16" style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round"><circle cx="8" cy="8" r="6"/><path d="M8 7v5M8 5v.5"/></svg>
      Sobre
    </h2>
    <div class="sobre-info">
      <div class="sobre-row"><span>Versão</span><span class="mono">1.0.0</span></div>
      <div class="sobre-row"><span>Banco de dados</span><span>SQLite (sql.js)</span></div>
      <div class="sobre-row"><span>Stack</span><span>Svelte 4 + Node.js + Express</span></div>
    </div>
  </div>
</div>

<!-- Modal tipo -->
{#if modalTipo}
  <div class="modal-overlay" on:click|self={() => modalTipo = false}>
    <div class="modal">
      <h2 class="modal-title">{editandoTipo ? 'Editar tipo' : 'Novo tipo de serviço'}</h2>

      <div class="form-group">
        <label class="label">Nome</label>
        <input class="input" placeholder="Ex: Troca de correias" bind:value={formTipo.nome} />
      </div>

      <div class="form-group">
        <label class="label">Cor</label>
        <div class="cores-row">
          {#each ['#f59e0b','#3b82f6','#6366f1','#8b5cf6','#10b981','#14b8a6','#6b7280','#1a6aff','#ef4444','#f97316','#64748b','#16a34a'] as cor}
            <button class="cor-btn-sm" class:selected={formTipo.cor === cor} style="background:{cor}" on:click={() => formTipo.cor = cor}>
              {#if formTipo.cor === cor}<span style="color:white;display:inline-flex;align-items:center;width:9px;height:9px">{@html '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8.5l3.5 3.5 7-7"/></svg>'}</span>{/if}
            </button>
          {/each}
        </div>
      </div>

      {#if formTipo.nome}
        <div class="preview-tipo">
          <div class="tipo-icon-preview" style="background:{formTipo.cor}22;color:{formTipo.cor}">{formTipo.nome.charAt(0).toUpperCase()}</div>
          <span style="font-size:13px;font-weight:500">{formTipo.nome || 'Novo tipo'}</span>
        </div>
      {/if}

      <div class="modal-actions">
        <button class="btn btn-secondary" on:click={() => modalTipo = false}>Cancelar</button>
        <button class="btn btn-primary" on:click={salvarTipo}>{editandoTipo ? 'Salvar' : 'Criar'}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .secao { padding: 24px; }

  .secao-titulo {
    font-size: 14px; font-weight: 700; font-family: var(--font-display);
    display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: var(--text);
  }

  .secao-desc { font-size: 12px; color: var(--text-3); margin-bottom: 20px; }

  .backup-frequencia { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; }

  .ultimo-backup { font-size: 11px; color: var(--text-3); margin-top: 12px; font-family: var(--font-mono); flex: 1; padding-bottom: 8px; }

  .backup-row { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border); }

  .backup-ok { color: var(--green); font-weight: 600; }

  .gdrive-sem-cred { padding: 4px 0; }

  .gdrive-sem-cred code {
    font-family: var(--font-mono, monospace);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 5px;
    font-size: 12px;
  }

  .gdrive-conectado { font-size: 14px; color: var(--text); margin-bottom: 12px; }

  .tipos-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;
  }

  .tipo-item {
    display: flex; align-items: center; gap: 8px;
    background: var(--bg-2); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 10px 12px;
  }

  .tipo-icon { width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
  .tipo-nome { flex: 1; font-size: 13px; color: var(--text-2); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tipo-acoes { display: flex; gap: 2px; flex-shrink: 0; }

  .sobre-info { display: flex; flex-direction: column; gap: 8px; }

  .sobre-row {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 13px; padding: 8px 12px; background: var(--bg-2);
    border-radius: var(--radius-sm); color: var(--text-2);
  }

  /* Modal tipo */

  .cores-row { display: flex; flex-wrap: wrap; gap: 6px; }

  .cor-btn-sm {
    width: 24px; height: 24px; border-radius: 5px;
    border: 2px solid transparent; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.1s;
  }

  .cor-btn-sm:hover { transform: scale(1.15); }
  .cor-btn-sm.selected { border-color: var(--text); }

  .preview-tipo {
    display: flex; align-items: center; gap: 10px;
    background: var(--bg-2); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 4px;
  }

  .tipo-icon-preview { width: 32px; height: 32px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 16px; }

  .mono { font-family: var(--font-mono); }

  .btn-icon-wrap { display: inline-flex; align-items: center; width: 14px; height: 14px; }
  .btn-icon-wrap :global(svg) { width: 14px; height: 14px; }

  .btn-svg { width: 14px; height: 14px; display: inline-flex; align-items: center; }
  .btn-svg :global(svg) { width: 14px; height: 14px; }

  .backup-ok { display: inline-flex; align-items: center; color: var(--green); width: 14px; height: 14px; }
  .backup-ok :global(svg) { width: 14px; height: 14px; }
</style>
