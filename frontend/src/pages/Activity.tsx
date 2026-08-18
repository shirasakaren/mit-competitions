import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { AppLottie } from '@/components/app/AppLottie'
import { ANIM } from '@/lib/animations'
import { useAnalytics, isWarmingUp } from '@/lib/api/hooks'
import { ApiError } from '@/lib/api/client'
import { formatCompact, formatDateTime, formatMs, formatNumber, formatPercent } from '@/lib/format'
import type { ActivityHeatmap, AnalyticsBucket, AnalyticsMonthPoint } from '@/lib/api/types'

function monthLabel(m: string): string {
  const [y, mm] = m.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[Number(mm) - 1] ?? mm} ${y}`
}

/** Monochrome heatmap cell: intensity maps to foreground opacity, so it
 * adapts to light/dark themes automatically without any color. */
function HeatmapCell({ count, max }: { count: number; max: number }) {
  const intensity = max > 0 ? count / max : 0
  const opacity = intensity === 0 ? 0.04 : 0.08 + 0.9 * intensity
  return (
    <div
      title={`${formatNumber(count)} events`}
      className="h-5 w-full rounded-[3px] border border-transparent"
      style={{ backgroundColor: 'var(--foreground)', opacity }}
    />
  )
}

function Heatmap({ heatmap }: { heatmap: ActivityHeatmap }) {
  const max = Math.max(1, ...heatmap.cells.flat())
  const hourTicks = [0, 6, 12, 18, 23]
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <AppLottie src={ANIM.hacker} size={22} />
        <div>
          <h3 className="text-sm font-medium">Activity heatmap</h3>
          <p className="text-xs text-muted-foreground">
            Events by day-of-week × hour-of-day — darker means busier.
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="flex">
            <div className="w-12 shrink-0" />
            <div className="relative flex-1">
              {hourTicks.map((h) => (
                <span
                  key={h}
                  className="absolute top-0 -translate-x-1/2 text-[10px] tabular-nums text-muted-foreground"
                  style={{ left: `${(h / 24) * 100}%` }}
                >
                  {String(h).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            {heatmap.days.map((day, row) => (
              <div key={day} className="flex items-center gap-1">
                <div className="w-12 shrink-0 text-[11px] text-muted-foreground">{day}</div>
                <div className="flex flex-1 gap-1">
                  {(heatmap.cells[row] ?? Array.from({ length: 24 }, () => 0)).map((count, hour) => (
                    <div key={hour} className="min-w-0 flex-1">
                      <HeatmapCell count={count} max={max} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Peak: {formatNumber(max)} events in one hour-slot</span>
        <span className="flex items-center gap-1.5">
          quiet
          <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: 'var(--foreground)', opacity: 0.08 }} />
          <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: 'var(--foreground)', opacity: 0.35 }} />
          <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: 'var(--foreground)', opacity: 0.7 }} />
          <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: 'var(--foreground)', opacity: 0.95 }} />
          busy
        </span>
      </div>
    </Card>
  )
}

function TypeBars({ data }: { data: AnalyticsBucket[] }) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium">Activity types</h3>
      <p className="text-xs text-muted-foreground">What users actually do, top 15</p>
      <div className="mt-3 flex flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.label}>
            <div className="mb-0.5 flex justify-between text-xs">
              <span className="truncate pr-2">{d.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatNumber(d.count)} · {formatPercent(d.percent)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground/70"
                style={{ width: `${Math.max(2, d.percent)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function OverTime({ data }: { data: AnalyticsMonthPoint[] }) {
  const config: ChartConfig = { count: { label: 'Events' } }
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium">Activity over time</h3>
      <p className="text-xs text-muted-foreground">Monthly event volume</p>
      <ChartContainer config={config} className="mt-3 aspect-auto h-56 w-full">
        <AreaChart data={data} margin={{ left: 8, right: 16 }}>
          <defs>
            <linearGradient id="actFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickFormatter={monthLabel} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => formatCompact(Number(v))} axisLine={false} tickLine={false} width={46} tick={{ fontSize: 11 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area type="monotone" dataKey="count" name="Events" stroke="var(--chart-1)" fill="url(#actFill)" strokeWidth={2} />
        </AreaChart>
      </ChartContainer>
    </Card>
  )
}

export default function Activity() {
  const { data, isLoading, isError, error } = useAnalytics()
  const warming = !data && isWarmingUp(error)

  const peak = useMemo(() => {
    if (!data) return null
    let best = { day: '', hour: 0, count: 0 }
    data.activity_heatmap.cells.forEach((row, d) =>
      row.forEach((count, h) => {
        if (count > best.count) best = { day: data.activity_heatmap.days[d] ?? '', hour: h, count }
      }),
    )
    return best
  }, [data])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">User Activity</h2>
          <p className="text-sm text-muted-foreground">
            When and how 2M activity events happened ·{' '}
            {data ? `computed in ${formatMs(data.computation_ms)} · ${formatDateTime(data.analyzed_at)}` : 'live'}
          </p>
        </div>
        <AppLottie src={ANIM.locations} size={72} className="hidden shrink-0 sm:block" />
      </div>

      {!data && (isLoading || warming) && (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <AppLottie src={warming ? ANIM.processing : ANIM.gears} size={110} />
          <p className="font-medium">
            {warming ? 'Computing the activity snapshot…' : 'Loading activity analytics…'}
          </p>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {warming
              ? 'The background pass aggregates all four tables live. This page fills in automatically.'
              : 'Fetching the latest snapshot from the API.'}
          </p>
        </Card>
      )}

      {!data && isError && !warming && (
        <Alert variant="destructive" className="items-center">
          <AppLottie src={ANIM.warning} size={36} className="mr-2" />
          <div>
            <AlertTitle>{error instanceof ApiError ? error.code : 'Failed to load'}</AlertTitle>
            <AlertDescription>
              {error instanceof ApiError ? error.message : 'An unexpected error occurred.'}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total events</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {formatCompact(data.activity_over_time.reduce((a, p) => a + p.count, 0))}
              </div>
              <div className="text-xs text-muted-foreground">across {data.activity_over_time.length} months</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Event types</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{data.activity_types.length}</div>
              <div className="text-xs text-muted-foreground">distinct kinds recorded</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Peak hour-slot</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {peak ? `${peak.day} ${String(peak.hour).padStart(2, '0')}:00` : '—'}
              </div>
              <div className="text-xs text-muted-foreground">{peak ? `${formatNumber(peak.count)} events` : ''}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Busiest month</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {(() => {
                  const best = [...data.activity_over_time].sort((a, b) => b.count - a.count)[0]
                  return best ? monthLabel(best.month) : '—'
                })()}
              </div>
              <div className="text-xs text-muted-foreground">by event volume</div>
            </Card>
          </div>

          <Heatmap heatmap={data.activity_heatmap} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TypeBars data={data.activity_types} />
            <OverTime data={data.activity_over_time} />
          </div>

          <Card className="flex items-center justify-between p-4">
            <p className="text-sm text-muted-foreground">
              Heatmap cells are hour-slot counts of <Badge variant="outline">ws_user_activity</Badge> — the
              single hottest combination is highlighted by intensity.
            </p>
            <AppLottie src={ANIM.sparkle} size={36} className="hidden shrink-0 sm:block" />
          </Card>
        </>
      )}
    </div>
  )
}
