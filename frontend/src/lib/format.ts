export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function statusLabel(status: number | null): { label: string; tone: 'default' | 'success' | 'destructive' | 'muted' } {
  if (status === 1) return { label: 'Active', tone: 'success' }
  if (status === 0) return { label: 'Inactive', tone: 'muted' }
  if (status === -1) return { label: 'Suspended', tone: 'destructive' }
  return { label: status == null ? 'Unknown' : String(status), tone: 'default' }
}

export function formatNumber(n: number): string {
  return n.toLocaleString(undefined)
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`
}

export function formatMs(n: number): string {
  if (n < 1000) return `${Math.round(n)}ms`
  return `${(n / 1000).toFixed(2)}s`
}

export function formatCurrency(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `IDR ${(n / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `IDR ${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `IDR ${(n / 1_000).toFixed(1)}K`
  return `IDR ${n.toFixed(0)}`
}

export function formatCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
