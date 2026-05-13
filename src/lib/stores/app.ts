import { writable } from 'svelte/store'

export type Route = 'dashboard' | 'veiculos' | 'servicos' | 'alertas' | 'abastecimento' | 'financeiro' | 'configuracoes'

export const currentRoute    = writable<Route>('dashboard')
export const toast           = writable<{ message: string; type: 'success' | 'error' } | null>(null)
export const confirmDialog   = writable<{ message: string; resolve: (v: boolean) => void } | null>(null)
export const veiculoAtivo    = writable<number | null>(null)

export function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.set({ message, type })
  setTimeout(() => toast.set(null), 3200)
}

export function showConfirm(message: string): Promise<boolean> {
  return new Promise(resolve => confirmDialog.set({ message, resolve }))
}

// ─── API HELPERS ─────────────────────────────────────────────────────────────
export async function api(method: string, path: string, body?: any) {
  try {
    const res = await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      showToast(data.error || `Erro ${res.status}`, 'error')
      return null
    }
    return await res.json()
  } catch {
    showToast('Servidor não está respondendo', 'error')
    return null
  }
}

export const get   = (path: string)            => api('GET',    path)
export const post  = (path: string, body: any) => api('POST',   path, body)
export const put   = (path: string, body: any) => api('PUT',    path, body)
export const patch = (path: string)            => api('PATCH',  path)
export const del   = (path: string)            => api('DELETE', path)

// ─── FORMATTERS ──────────────────────────────────────────────────────────────
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

export function formatKm(value: number): string {
  if (!value && value !== 0) return '—'
  return new Intl.NumberFormat('pt-BR').format(Math.round(value)) + ' km'
}

export function formatData(data: string): string {
  if (!data) return '—'
  return new Date(data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDataCurta(data: string): string {
  if (!data) return '—'
  return new Date(data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function formatMes(mes: string): string {
  if (!mes) return ''
  const [year, month] = mes.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function initials(nome: string): string {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export function diasAtras(data: string): string {
  if (!data) return ''
  const diff = Math.floor((Date.now() - new Date(data + 'T12:00').getTime()) / 86400000)
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'ontem'
  if (diff < 30) return `${diff}d atrás`
  if (diff < 365) return `${Math.floor(diff/30)}m atrás`
  return `${Math.floor(diff/365)}a atrás`
}

export const COMBUSTIVEIS = ['gasolina', 'etanol', 'flex', 'diesel', 'gnv', 'elétrico']

export const CORES_VEICULO = [
  '#1c1917', '#374151', '#6b7280', '#f9fafb',
  '#dc2626', '#2563eb', '#16a34a', '#d97706',
  '#1a6aff', '#0e7490', '#7c3aed', '#db2777',
]

export const STATUS_ALERTA: Record<string, { label: string; cor: string; bg: string }> = {
  vencido:   { label: 'Vencido',  cor: '#dc2626', bg: '#fef2f2' },
  atencao:   { label: 'Atenção',  cor: '#d97706', bg: '#fffbeb' },
  ok:        { label: 'OK',       cor: '#16a34a', bg: '#f0fdf4' },
  sem_dados: { label: 'Sem dados',cor: '#6b7280', bg: '#f9fafb' },
}
