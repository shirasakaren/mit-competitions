import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { AppLottie } from '@/components/app/AppLottie'
import { ANIM } from '@/lib/animations'
import { useHealth, useApiHealth } from '@/lib/api/hooks'
import * as api from '@/lib/api/client'
import { ApiError } from '@/lib/api/client'
import type { SearchType } from '@/lib/api/types'
import { formatDateTime, formatMs, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

type StatusTone = 'green' | 'amber' | 'red'

function StatusDot({ tone }: { tone: StatusTone }) {
  return (
    <span
      className={cn(
        'size-2 shrink-0 rounded-full',
        tone === 'green' && 'bg-emerald-500',
        tone === 'amber' && 'bg-amber-500 animate-pulse',
        tone === 'red' && 'bg-red-500',
      )}
    />
  )
}

type EndpointKey =
  | 'health'
  | 'apiHealth'
  | 'search'
  | 'quality'
  | 'metrics'
  | 'duplicatesGet'
  | 'duplicatesPost'

const ENDPOINTS: { key: EndpointKey; label: string }[] = [
  { key: 'health', label: 'GET /health' },
  { key: 'apiHealth', label: 'GET /api/health' },
  { key: 'search', label: 'GET /api/search' },
  { key: 'quality', label: 'GET /api/quality' },
  { key: 'metrics', label: 'GET /api/metrics' },
  { key: 'duplicatesGet', label: 'GET /api/duplicates/:id' },
  { key: 'duplicatesPost', label: 'POST /api/duplicates' },
]

type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; ms: number; body: unknown }
  | { status: 'error'; ms: number; message: string; code?: string; httpStatus?: number }

export default function System() {
  const health = useHealth()
  const apiHealth = useApiHealth()

  const [endpoint, setEndpoint] = useState<EndpointKey>('health')

  // /api/search form state
  const [q, setQ] = useState('')
  const [type, setType] = useState<SearchType>('name')
  const [limit, setLimit] = useState('')
  const [offset, setOffset] = useState('')

  // /api/duplicates/:id form state
  const [dupId, setDupId] = useState('')
  const [dupThreshold, setDupThreshold] = useState('')
  const [dupLimit, setDupLimit] = useState('')

  const [result, setResult] = useState<RequestState>({ status: 'idle' })

  const dupIdNum = Number(dupId)
  const dupIdValid = dupId.trim() !== '' && Number.isFinite(dupIdNum)
  const canSend = endpoint !== 'duplicatesGet' || dupIdValid

  async function handleSend() {
    if (!canSend) return
    setResult({ status: 'loading' })
    const start = performance.now()
    try {
      let body: unknown
      switch (endpoint) {
        case 'health':
          body = await api.getHealth()
          break
        case 'apiHealth':
          body = await api.getApiHealth()
          break
        case 'search':
          body = await api.search({
            q,
            type,
            limit: limit.trim() ? Number(limit) : undefined,
            offset: offset.trim() ? Number(offset) : undefined,
          })
          break
        case 'quality':
          body = await api.getQuality()
          break
        case 'metrics':
          body = await api.getMetrics()
          break
        case 'duplicatesGet':
          body = await api.getDuplicates(dupIdNum, {
            threshold: dupThreshold.trim() ? Number(dupThreshold) : undefined,
            limit: dupLimit.trim() ? Number(dupLimit) : undefined,
          })
          break
        case 'duplicatesPost':
          body = await api.postDuplicatesSample()
          break
      }
      setResult({ status: 'success', ms: performance.now() - start, body })
    } catch (err) {
      const ms = performance.now() - start
      if (err instanceof ApiError) {
        setResult({ status: 'error', ms, message: err.message, code: err.code, httpStatus: err.status })
      } else {
        setResult({ status: 'error', ms, message: err instanceof Error ? err.message : 'Request failed' })
      }
    }
  }

  const apiTone: StatusTone = apiHealth.isError
    ? 'red'
    : !apiHealth.data
      ? 'amber'
      : apiHealth.data.ok
        ? 'green'
        : 'red'

  const dbTone: StatusTone = health.isError
    ? 'red'
    : !health.data
      ? 'amber'
      : health.data.database === 'connected'
        ? 'green'
        : 'red'

  const allOk = apiTone === 'green' && dbTone === 'green'

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">System</h2>
          <p className="text-sm text-muted-foreground">API health, database connectivity, and documentation.</p>
        </div>
        <AppLottie src={ANIM.rocket} size={64} className="ml-auto hidden shrink-0 sm:block" />
      </div>

      {allOk && (
        <div className="-mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <AppLottie src={ANIM.sparkle} size={16} />
          All systems operational
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="flex flex-col gap-1 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">API</div>
            <StatusDot tone={apiTone} />
          </div>
          {apiHealth.isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-semibold tracking-tight">
              {apiHealth.isError
                ? 'Down'
                : !apiHealth.data
                  ? 'Connecting…'
                  : apiHealth.data.ok
                    ? 'Operational'
                    : 'Degraded'}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {apiHealth.data ? `status: ${apiHealth.data.status}` : 'Reported by /api/health'}
          </div>
        </Card>

        <Card className="flex flex-col gap-1 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Database</div>
            <StatusDot tone={dbTone} />
          </div>
          {health.isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-semibold tracking-tight capitalize">
              {health.data?.database ?? 'Unknown'}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {health.data
              ? `${health.data.status} · ${formatNumber(health.data.total_records)} records`
              : 'Reported by /health'}
          </div>
        </Card>

        <Card className="flex flex-col gap-1 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last checked</div>
          {health.isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <div className="text-2xl font-semibold tracking-tight">
              {health.data ? formatDateTime(health.data.timestamp) : '—'}
            </div>
          )}
          <div className="text-xs text-muted-foreground">Reported by /health</div>
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold tracking-tight">API Explorer</h3>
            <p className="text-xs text-muted-foreground">
              Send a live request to any endpoint and inspect the raw response.
            </p>
          </div>
          {result.status === 'loading' && <AppLottie src={ANIM.boxCubeLoader} size={36} className="shrink-0" />}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Endpoint</label>
              <Select
                value={endpoint}
                disabled={result.status === 'loading'}
                onValueChange={(v) => {
                  setEndpoint(v as EndpointKey)
                  setResult({ status: 'idle' })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENDPOINTS.map((e) => (
                    <SelectItem key={e.key} value={e.key}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSend} disabled={!canSend || result.status === 'loading'} className="sm:w-28">
              {result.status === 'loading' ? 'Sending…' : 'Send'}
            </Button>
          </div>

          {endpoint === 'search' && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Input placeholder="q (query)" value={q} onChange={(e) => setQ(e.target.value)} />
              <Select value={type} onValueChange={(v) => setType(v as SearchType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">name</SelectItem>
                  <SelectItem value="email">email</SelectItem>
                  <SelectItem value="phone">phone</SelectItem>
                  <SelectItem value="user_id">user_id</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="limit (10)"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                inputMode="numeric"
              />
              <Input
                placeholder="offset (0)"
                value={offset}
                onChange={(e) => setOffset(e.target.value)}
                inputMode="numeric"
              />
            </div>
          )}

          {endpoint === 'duplicatesGet' && (
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="user id (required)"
                value={dupId}
                onChange={(e) => setDupId(e.target.value)}
                inputMode="numeric"
                aria-invalid={dupId.trim() !== '' && !dupIdValid}
              />
              <Input
                placeholder="threshold (optional)"
                value={dupThreshold}
                onChange={(e) => setDupThreshold(e.target.value)}
                inputMode="decimal"
              />
              <Input
                placeholder="limit (optional)"
                value={dupLimit}
                onChange={(e) => setDupLimit(e.target.value)}
                inputMode="numeric"
              />
            </div>
          )}

          <Separator />

          {result.status === 'idle' && (
            <p className="text-sm text-muted-foreground">Choose an endpoint and press Send to see the live response.</p>
          )}

          {result.status === 'loading' && <Skeleton className="h-24 w-full" />}

          {(result.status === 'success' || result.status === 'error') && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5">
                  {result.status === 'success' ? (
                    <AppLottie src={ANIM.done} size={14} />
                  ) : (
                    <StatusDot tone="red" />
                  )}
                  {result.status === 'success'
                    ? 'Success'
                    : `Error${result.status === 'error' && result.httpStatus ? ` ${result.httpStatus}` : ''}`}
                </span>
                <Separator orientation="vertical" className="h-3" />
                <span className="text-muted-foreground">{formatMs(result.ms)}</span>
                {result.status === 'error' && result.code && (
                  <>
                    <Separator orientation="vertical" className="h-3" />
                    <Badge variant="outline" className="font-mono">
                      {result.code}
                    </Badge>
                  </>
                )}
              </div>
              <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs">
                {result.status === 'success'
                  ? JSON.stringify(result.body, null, 2)
                  : JSON.stringify(
                      { error: { code: result.code ?? 'ERROR', message: result.message } },
                      null,
                      2,
                    )}
              </pre>
            </div>
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <AppLottie src={ANIM.hacker} size={44} className="hidden shrink-0 sm:block" />
          <div>
            <h3 className="font-semibold tracking-tight">Documentation</h3>
            <p className="text-xs text-muted-foreground">
              Full OpenAPI reference and an interactive explorer, served directly by the backend.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/api/docs" target="_blank" rel="noreferrer">
              Interactive API docs
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/api/openapi.json" target="_blank" rel="noreferrer">
              OpenAPI spec (JSON)
            </a>
          </Button>
        </div>
      </Card>
    </div>
  )
}
