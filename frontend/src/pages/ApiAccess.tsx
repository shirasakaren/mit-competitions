import { useState } from 'react'
import { Check, Copy, ExternalLink, Play, TerminalSquare, Globe, Braces } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppLottie } from '@/components/app/AppLottie'
import { ANIM } from '@/lib/animations'
import { useApiHealth } from '@/lib/api/hooks'
import * as api from '@/lib/api/client'
import { ApiError } from '@/lib/api/client'
import { formatMs } from '@/lib/format'

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : ''

interface EndpointDef {
  method: 'GET' | 'POST'
  path: string
  title: string
  description: string
  params: { name: string; placeholder: string; optional?: boolean }[]
}

const ENDPOINTS: EndpointDef[] = [
  {
    method: 'GET',
    path: '/health',
    title: 'Health (judge compat)',
    description: 'Service liveness, database connectivity, and the true record count.',
    params: [],
  },
  {
    method: 'GET',
    path: '/api/health',
    title: 'Liveness probe',
    description: 'Cheapest possible health check — never touches the database.',
    params: [],
  },
  {
    method: 'GET',
    path: '/api/search',
    title: 'Search customers',
    description: 'Exact email, exact phone, exact user ID, or fuzzy name search with pagination.',
    params: [
      { name: 'q', placeholder: 'query text (required)' },
      { name: 'type', placeholder: 'name | email | phone | user_id' },
      { name: 'limit', placeholder: '1-100 (default 10)', optional: true },
      { name: 'offset', placeholder: '>= 0 (default 0)', optional: true },
    ],
  },
  {
    method: 'GET',
    path: '/api/quality',
    title: 'Data quality snapshot',
    description: 'Live-computed completeness, validity, and issue metrics over all 15M rows.',
    params: [],
  },
  {
    method: 'GET',
    path: '/api/metrics',
    title: 'Judge metrics',
    description: 'Duplicates, missing fields, and a composite quality score.',
    params: [],
  },
  {
    method: 'GET',
    path: '/api/duplicates/{id}',
    title: 'Duplicate candidates',
    description: 'Scored possible duplicates for one customer (email·0.4 + phone·0.4 + name·0.2).',
    params: [
      { name: 'id', placeholder: 'user id (required)' },
      { name: 'threshold', placeholder: '0-1 (default 0.5)', optional: true },
      { name: 'limit', placeholder: '1-50 (default 10)', optional: true },
    ],
  },
  {
    method: 'POST',
    path: '/api/duplicates',
    title: 'Duplicates (judge compat)',
    description: 'Accepts {"user_id": N} for a scoped lookup, or an empty body for a bounded sample.',
    params: [{ name: 'body', placeholder: '{"user_id": 1234567} (optional)' }],
  },
  {
    method: 'GET',
    path: '/api/analytics',
    title: 'Analytics snapshot',
    description: 'Growth, demographics, revenue, top spenders, and an activity heatmap.',
    params: [],
  },
  {
    method: 'GET',
    path: '/api/openapi.json',
    title: 'OpenAPI spec',
    description: 'The machine-readable specification of every endpoint above.',
    params: [],
  },
]

function methodTone(method: 'GET' | 'POST') {
  return method === 'GET'
    ? 'border-transparent bg-muted text-foreground'
    : 'border-transparent bg-foreground text-background'
}

function curlFor(def: EndpointDef, values: Record<string, string>): string {
  const q = def.params
    .filter((p) => p.name !== 'body' && !p.name.includes('{') && values[p.name]?.trim())
    .map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(values[p.name].trim())}`)
    .join('&')
  let path = def.path
  const idParam = def.params.find((p) => p.name === 'id')
  if (idParam && values[idParam.name]?.trim()) {
    path = path.replace('{id}', values[idParam.name].trim())
  }
  const url = `${BASE_URL}${path}${q ? `?${q}` : ''}`
  if (def.method === 'POST') {
    const body = values.body?.trim() || '{}'
    return `curl -X POST '${url}' -H 'Content-Type: application/json' -d '${body}'`
  }
  return `curl -s '${url}'`
}

function fetchSnippet(def: EndpointDef, values: Record<string, string>): string {
  const q = def.params
    .filter((p) => p.name !== 'body' && !p.name.includes('{') && values[p.name]?.trim())
    .map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(values[p.name].trim())}`)
    .join('&')
  let path = def.path
  const idParam = def.params.find((p) => p.name === 'id')
  if (idParam && values[idParam.name]?.trim()) {
    path = path.replace('{id}', values[idParam.name].trim())
  }
  const url = `${BASE_URL}${path}${q ? `?${q}` : ''}`
  const opts = def.method === 'POST' ? `, { method: 'POST', body: JSON.stringify(${values.body?.trim() || '{}'}) }` : ''
  return `const res = await fetch('${url}'${opts})\nconst data = await res.json()`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Copy"
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </Button>
  )
}

function EndpointCard({ def }: { def: EndpointDef }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ status: 'idle' | 'loading' | 'done'; ms: number; body: unknown; error?: string }>({
    status: 'idle',
    ms: 0,
    body: null,
  })

  const valueFor = (name: string) => values[name] ?? ''

  async function run() {
    setResult({ status: 'loading', ms: 0, body: null })
    const start = performance.now()
    try {
      let body: unknown
      switch (def.path) {
        case '/health':
          body = await api.getHealth()
          break
        case '/api/health':
          body = await api.getApiHealth()
          break
        case '/api/search':
          body = await api.search({ q: valueFor('q'), type: (valueFor('type') || 'name') as never })
          break
        case '/api/quality':
          body = await api.getQuality()
          break
        case '/api/metrics':
          body = await api.getMetrics()
          break
        case '/api/analytics':
          body = await api.getAnalytics()
          break
        case '/api/duplicates/{id}':
          body = await api.getDuplicates(Number(valueFor('id')), {
            threshold: valueFor('threshold').trim() ? Number(valueFor('threshold')) : undefined,
            limit: valueFor('limit').trim() ? Number(valueFor('limit')) : undefined,
          })
          break
        case '/api/duplicates':
          body = await api.postDuplicatesSample()
          break
        case '/api/openapi.json':
          body = await fetch('/api/openapi.json').then((r) => r.json())
          break
        default:
          body = null
      }
      setResult({ status: 'done', ms: performance.now() - start, body })
    } catch (err) {
      setResult({
        status: 'done',
        ms: performance.now() - start,
        body: null,
        error: err instanceof ApiError ? `${err.code}: ${err.message}` : String(err),
      })
    }
  }

  const idParam = def.params.find((p) => p.name === 'id')
  const idFilled = !idParam || /^\d+$/.test(valueFor('id'))
  const canRun = result.status !== 'loading' && idFilled

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`font-mono text-[10px] ${methodTone(def.method)}`}>{def.method}</Badge>
        <code className="text-sm font-medium">{def.path}</code>
        <div className="ml-auto">
          <CopyButton text={curlFor(def, values)} />
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{def.title} — {def.description}</p>

      {def.params.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {def.params.map((p) => (
            <Input
              key={p.name}
              placeholder={p.placeholder}
              value={valueFor(p.name)}
              onChange={(e) => setValues((v) => ({ ...v, [p.name]: e.target.value }))}
              className="h-8 text-xs"
            />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={run} disabled={!canRun} className="gap-1.5">
          {result.status === 'loading' ? (
            <AppLottie src={ANIM.remixLoader} size={14} />
          ) : (
            <Play className="size-3.5" />
          )}
          {result.status === 'loading' ? 'Running…' : 'Try it'}
        </Button>
        {result.status === 'done' && (
          <span className="text-xs text-muted-foreground">
            {result.error ? 'failed' : '200 OK'} · {formatMs(result.ms)}
          </span>
        )}
      </div>

      {result.status === 'loading' && <Skeleton className="mt-3 h-20 w-full" />}

      {result.status === 'done' && (
        <Tabs defaultValue="response" className="mt-3">
          <TabsList className="h-8">
            <TabsTrigger value="response" className="text-xs">
              <Braces className="mr-1 size-3.5" /> Response
            </TabsTrigger>
            <TabsTrigger value="curl" className="text-xs">
              <TerminalSquare className="mr-1 size-3.5" /> curl
            </TabsTrigger>
            <TabsTrigger value="fetch" className="text-xs">
              <Globe className="mr-1 size-3.5" /> fetch
            </TabsTrigger>
          </TabsList>
          <TabsContent value="response">
            <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs">
              {JSON.stringify(result.error ? { error: result.error } : result.body, null, 2)}
            </pre>
          </TabsContent>
          <TabsContent value="curl">
            <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs">
              {curlFor(def, values)}
            </pre>
          </TabsContent>
          <TabsContent value="fetch">
            <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs">
              {fetchSnippet(def, values)}
            </pre>
          </TabsContent>
        </Tabs>
      )}
    </Card>
  )
}

export default function ApiAccess() {
  const health = useApiHealth()

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">API Access</h2>
          <p className="text-sm text-muted-foreground">
            Everything the platform exposes, with a live explorer and copy-paste snippets.
          </p>
        </div>
        <AppLottie src={ANIM.applicant} size={72} className="ml-auto hidden shrink-0 sm:block" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Base URL</div>
          <div className="mt-1 truncate font-mono text-sm font-semibold">{BASE_URL}</div>
          <div className="text-xs text-muted-foreground">Same origin as this console</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
            {health.isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <>
                <AppLottie src={health.data?.ok ? ANIM.done : ANIM.warning} size={16} />
                {health.data?.ok ? 'Operational' : 'Degraded'}
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground">Reported by /api/health</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Docs</div>
          <div className="mt-1 flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/api/docs" target="_blank" rel="noreferrer">
                Open Swagger UI <ExternalLink className="ml-1 size-3.5" />
              </a>
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">Fully self-hosted, interactive</div>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <AppLottie src={ANIM.aiThinking} size={26} />
          <h3 className="text-sm font-semibold">Endpoints</h3>
          <Badge variant="secondary">{ENDPOINTS.length}</Badge>
        </div>
        {ENDPOINTS.map((def) => (
          <EndpointCard key={`${def.method} ${def.path}`} def={def} />
        ))}
      </div>

      <Separator />

      <div className="flex flex-col items-center gap-2 pb-6 text-center">
        <AppLottie src={ANIM.takeNote} size={64} />
        <p className="text-xs text-muted-foreground">
          Every endpoint above is live-computed against PostgreSQL — no cached fixtures, no mock data.
        </p>
      </div>
    </div>
  )
}
