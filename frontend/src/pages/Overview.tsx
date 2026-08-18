import { Link } from 'react-router-dom'
import { Search, ShieldCheck, Copy, Activity, TerminalSquare, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AppLottie } from '@/components/app/AppLottie'
import { ANIM } from '@/lib/animations'
import { useHealth, useMetrics, useQuality } from '@/lib/api/hooks'
import { formatNumber, formatPercent } from '@/lib/format'

function StatCard({
  label,
  value,
  loading,
  suffix,
}: {
  label: string
  value: string | number | null | undefined
  loading?: boolean
  suffix?: string
}) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <div className="mt-1 text-2xl font-semibold tracking-tight">
          {value ?? '—'}
          {suffix && <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span>}
        </div>
      )}
    </Card>
  )
}

const SHORTCUTS = [
  { to: '/search', label: 'Search customers', desc: 'Email, phone, user ID, fuzzy name', icon: Search },
  { to: '/quality', label: 'Data quality', desc: 'Completeness, validity, issues', icon: ShieldCheck },
  { to: '/duplicates', label: 'Duplicate detection', desc: 'Similarity scoring & confidence', icon: Copy },
  { to: '/system', label: 'System status', desc: 'API health & performance', icon: Activity },
  { to: '/api-access', label: 'API access', desc: 'Explorer, snippets, Swagger docs', icon: TerminalSquare },
]

export default function Overview() {
  const health = useHealth()
  const metrics = useMetrics()
  const quality = useQuality()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Card className="flex flex-col items-center gap-3 overflow-hidden p-8 text-center sm:flex-row sm:text-left">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">Customer Intelligence Platform</h2>
            <AppLottie src={ANIM.sparkle} size={24} />
          </div>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Live search, data quality analytics, and duplicate detection over{' '}
            {health.data ? formatNumber(health.data.total_records) : '14,999,896'} customer records — all computed
            directly against PostgreSQL, nothing pre-computed.
          </p>
        </div>
        <AppLottie src={ANIM.welcome} size={120} />
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total records" value={health.data ? formatNumber(health.data.total_records) : undefined} loading={health.isLoading} />
        <StatCard
          label="Quality score"
          value={metrics.data ? metrics.data.quality_score.toFixed(1) : undefined}
          loading={metrics.isLoading}
          suffix="/ 100"
        />
        <StatCard
          label="Known duplicates"
          value={metrics.data ? formatNumber(metrics.data.duplicates) : undefined}
          loading={metrics.isLoading}
        />
        <StatCard
          label="Email completeness"
          value={quality.data ? formatPercent(100 - quality.data.quality_metrics.email.missing_percent) : undefined}
          loading={quality.isLoading}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <AppLottie src={ANIM.rocketLaunch} size={24} />
          <h3 className="text-sm font-semibold text-muted-foreground">Jump to</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {SHORTCUTS.map((s) => (
            <Link key={s.to} to={s.to}>
              <Card className="group flex h-full flex-col justify-between p-4 transition-colors hover:border-foreground/30">
                <div>
                  <s.icon className="size-5 text-muted-foreground" strokeWidth={1.75} />
                  <div className="mt-3 font-medium">{s.label}</div>
                  <div className="text-sm text-muted-foreground">{s.desc}</div>
                </div>
                <ArrowRight className="mt-3 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
