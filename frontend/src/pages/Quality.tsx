import {
  Mail,
  Phone,
  Cake,
  Smile,
  PieChart as PieChartIcon,
  type LucideIcon,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { AppLottie } from '@/components/app/AppLottie'
import { ANIM } from '@/lib/animations'
import { useQuality } from '@/lib/api/hooks'
import { formatDateTime, formatMs, formatNumber, formatPercent, statusLabel } from '@/lib/format'
import { ApiError } from '@/lib/api/client'
import type { DataIssue } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function pct(n: number, total: number): number {
  if (!total) return 0
  return (n / total) * 100
}

function clampPercent(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, n))
}

function statusKeyLabel(key: string): string {
  const n = Number(key)
  if (key.trim() !== '' && !Number.isNaN(n)) return statusLabel(n).label
  return key.length ? key.charAt(0).toUpperCase() + key.slice(1) : 'Unknown'
}

export default function Quality() {
  const { data, isFetching, isError, error } = useQuality()

  const isWarmingUp =
    isError && error instanceof ApiError && (error.code === 'WARMING_UP' || error.status === 503)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Data Quality</h2>
          {data ? (
            <p className="text-sm text-muted-foreground">
              {formatNumber(data.total_records)} records analyzed · {formatDateTime(data.analyzed_at)} · computed
              in {formatMs(data.computation_ms)}
              {isFetching && <span className="ml-2 text-xs text-muted-foreground/80">refreshing…</span>}
              {isError && (
                <span className="ml-2 text-xs text-muted-foreground/80">
                  · refresh failed, retrying automatically
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Completeness, validity, and issue detection across the customer table.
            </p>
          )}
        </div>
        <AppLottie src={ANIM.graphStats} size={80} className="hidden shrink-0 sm:block" />
      </div>

      {!data && !isError && <LoadingState />}

      {!data && isError && (isWarmingUp ? <WarmingUpState /> : <ErrorState error={error} />)}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <SummaryCard
              icon={Mail}
              label="Email"
              completePercent={100 - data.quality_metrics.email.missing_percent}
              missingCount={data.quality_metrics.email.missing_count}
            />
            <SummaryCard
              icon={Phone}
              label="Phone"
              completePercent={100 - data.quality_metrics.phone.missing_percent}
              missingCount={data.quality_metrics.phone.missing_count}
            />
            <SummaryCard
              icon={Cake}
              label="Birth date"
              completePercent={100 - data.quality_metrics.birth_date.missing_percent}
              missingCount={data.quality_metrics.birth_date.missing_count}
            />
            <SummaryCard
              icon={Smile}
              label="Hobbies"
              completePercent={100 - data.quality_metrics.hobbies.null_percent}
              missingCount={data.quality_metrics.hobbies.null_count}
              missingLabel="null"
            />
            <StatusSummaryCard
              distribution={data.quality_metrics.status.distribution}
              total={data.quality_metrics.status.total}
            />
          </div>

          <CompletenessOverviewChart
            data={[
              {
                key: 'email',
                label: 'Email',
                percent: clampPercent(100 - data.quality_metrics.email.missing_percent),
              },
              {
                key: 'phone',
                label: 'Phone',
                percent: clampPercent(100 - data.quality_metrics.phone.missing_percent),
              },
              {
                key: 'birth_date',
                label: 'Birth date',
                percent: clampPercent(100 - data.quality_metrics.birth_date.missing_percent),
              },
              {
                key: 'hobbies',
                label: 'Hobbies',
                percent: clampPercent(100 - data.quality_metrics.hobbies.null_percent),
              },
            ]}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FieldCard
              icon={Mail}
              title="Email"
              completePercent={100 - data.quality_metrics.email.missing_percent}
              present={data.quality_metrics.email.present}
              missingCount={data.quality_metrics.email.missing_count}
              missingLabel="missing"
              stats={[
                { label: 'Unique', value: data.quality_metrics.email.unique },
                {
                  label: 'Duplicates',
                  value: data.quality_metrics.email.duplicate_count,
                  hint: formatPercent(pct(data.quality_metrics.email.duplicate_count, data.quality_metrics.email.total)),
                },
                {
                  label: 'Invalid format',
                  value: data.quality_metrics.email.invalid_format,
                  hint: formatPercent(pct(data.quality_metrics.email.invalid_format, data.quality_metrics.email.total)),
                },
              ]}
            />

            <FieldCard
              icon={Phone}
              title="Phone"
              completePercent={100 - data.quality_metrics.phone.missing_percent}
              present={data.quality_metrics.phone.present}
              missingCount={data.quality_metrics.phone.missing_count}
              missingLabel="missing"
              stats={[
                { label: 'Unique', value: data.quality_metrics.phone.unique },
                {
                  label: 'Duplicates',
                  value: data.quality_metrics.phone.duplicate_count,
                  hint: formatPercent(pct(data.quality_metrics.phone.duplicate_count, data.quality_metrics.phone.total)),
                },
                {
                  label: 'Malformed',
                  value: data.quality_metrics.phone.malformed,
                  hint: formatPercent(pct(data.quality_metrics.phone.malformed, data.quality_metrics.phone.total)),
                },
              ]}
            />

            <FieldCard
              icon={Cake}
              title="Birth date"
              completePercent={100 - data.quality_metrics.birth_date.missing_percent}
              present={data.quality_metrics.birth_date.present}
              missingCount={data.quality_metrics.birth_date.missing_count}
              missingLabel="missing"
              stats={[
                {
                  label: 'Invalid dates',
                  value: data.quality_metrics.birth_date.invalid_dates,
                  hint: formatPercent(pct(data.quality_metrics.birth_date.invalid_dates, data.quality_metrics.birth_date.total)),
                },
                {
                  label: 'Impossible dates',
                  value: data.quality_metrics.birth_date.impossible_dates,
                  hint: formatPercent(pct(data.quality_metrics.birth_date.impossible_dates, data.quality_metrics.birth_date.total)),
                },
                {
                  label: 'Future dates',
                  value: data.quality_metrics.birth_date.future_dates,
                  hint: formatPercent(pct(data.quality_metrics.birth_date.future_dates, data.quality_metrics.birth_date.total)),
                },
              ]}
            />

            <FieldCard
              icon={Smile}
              title="Hobbies"
              completePercent={100 - data.quality_metrics.hobbies.null_percent}
              present={data.quality_metrics.hobbies.total - data.quality_metrics.hobbies.null_count}
              missingCount={data.quality_metrics.hobbies.null_count}
              missingLabel="null"
              stats={[
                {
                  label: 'Special chars',
                  value: data.quality_metrics.hobbies.with_special_chars,
                  hint: formatPercent(pct(data.quality_metrics.hobbies.with_special_chars, data.quality_metrics.hobbies.total)),
                },
                {
                  label: 'Emoji',
                  value: data.quality_metrics.hobbies.with_emoji,
                  hint: formatPercent(pct(data.quality_metrics.hobbies.with_emoji, data.quality_metrics.hobbies.total)),
                },
              ]}
            />

            <StatusCard
              distribution={data.quality_metrics.status.distribution}
              total={data.quality_metrics.status.total}
            />
          </div>

          <DataIssuesSection issues={data.data_issues ?? []} />
        </>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AppLottie src={ANIM.gears} size={20} className="!size-5" />
        Computing data quality metrics…
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-7 w-20" />
            <Skeleton className="mt-2 h-3 w-24" />
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <Skeleton className="h-48 w-full" />
      </Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-3 h-2 w-full" />
            <Skeleton className="mt-4 h-16 w-full" />
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <Skeleton className="h-40 w-full" />
      </Card>
    </div>
  )
}

function WarmingUpState() {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <AppLottie src={ANIM.processing} size={130} />
      <div>
        <p className="font-medium">Still computing the first snapshot</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Data quality metrics run on a background cycle roughly every 30 minutes. This page refreshes
          automatically as soon as the first snapshot is ready.
        </p>
      </div>
    </Card>
  )
}

function ErrorState({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive" className="items-center">
      <AppLottie src={ANIM.warning} size={36} className="mr-2" />
      <div>
        <AlertTitle>{error instanceof ApiError ? error.code : 'Failed to load'}</AlertTitle>
        <AlertDescription>
          {error instanceof ApiError
            ? error.message
            : 'An unexpected error occurred while loading data quality metrics.'}
        </AlertDescription>
      </div>
    </Alert>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  completePercent,
  missingCount,
  missingLabel = 'missing',
}: {
  icon: LucideIcon
  label: string
  completePercent: number
  missingCount: number
  missingLabel?: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" strokeWidth={1.75} />
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">
        {formatPercent(clampPercent(completePercent))}
        <span className="ml-1 text-sm font-normal text-muted-foreground">complete</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {formatNumber(missingCount)} {missingLabel}
      </div>
    </Card>
  )
}

function StatusSummaryCard({ distribution, total }: { distribution: Record<string, number>; total: number }) {
  const entries = Object.entries(distribution)
  const top = entries.reduce<[string, number] | null>((best, cur) => (!best || cur[1] > best[1] ? cur : best), null)
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <PieChartIcon className="size-3.5" strokeWidth={1.75} />
        Status
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">
        {entries.length}
        <span className="ml-1 text-sm font-normal text-muted-foreground">group{entries.length === 1 ? '' : 's'}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {top ? `${statusKeyLabel(top[0])} · ${formatPercent(pct(top[1], total))}` : '—'}
      </div>
    </Card>
  )
}

function CompletenessOverviewChart({ data }: { data: { key: string; label: string; percent: number }[] }) {
  const config: ChartConfig = Object.fromEntries(data.map((d) => [d.key, { label: d.label }]))
  return (
    <Card className="p-4">
      <div>
        <h3 className="font-medium">Completeness overview</h3>
        <p className="mt-1 text-sm text-muted-foreground">Percent of records with a usable value, per field</p>
      </div>
      <ChartContainer config={config} className="aspect-auto h-48 w-full">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 28 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} width={90} />
          <Bar dataKey="percent" radius={4} fill="var(--foreground)">
            <LabelList
              dataKey="percent"
              position="right"
              className="fill-foreground text-xs"
              formatter={(v) => `${Number(v).toFixed(1)}%`}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </Card>
  )
}

function FieldCard({
  icon: Icon,
  title,
  completePercent,
  present,
  missingCount,
  missingLabel,
  stats,
}: {
  icon: LucideIcon
  title: string
  completePercent: number
  present: number
  missingCount: number
  missingLabel: string
  stats: { label: string; value: number; hint?: string }[]
}) {
  const clamped = clampPercent(completePercent)
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
          <h3 className="font-medium">{title}</h3>
        </div>
        <Badge variant="secondary">{formatPercent(clamped)} complete</Badge>
      </div>
      <div>
        <Progress value={clamped} />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{formatNumber(present)} present</span>
          <span>
            {formatNumber(missingCount)} {missingLabel}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-sm font-medium tabular-nums">
              {formatNumber(s.value)}
              {s.hint && <span className="ml-1 text-xs font-normal text-muted-foreground">({s.hint})</span>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function StatusCard({ distribution, total }: { distribution: Record<string, number>; total: number }) {
  const entries = Object.entries(distribution)
  const chartData = entries.map(([key, value], i) => ({
    key,
    name: statusKeyLabel(key),
    value,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }))
  const chartConfig: ChartConfig = Object.fromEntries(entries.map(([key]) => [key, { label: statusKeyLabel(key) }]))

  return (
    <Card className="p-4 md:col-span-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChartIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />
          <h3 className="font-medium">Status distribution</h3>
        </div>
        <AppLottie src={ANIM.pieChart} size={36} />
      </div>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-56 w-full max-w-56 shrink-0">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
            <Pie data={chartData} dataKey="value" nameKey="key" innerRadius={55} outerRadius={85} strokeWidth={2}>
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="flex w-full flex-1 flex-col gap-1.5 text-sm">
          {chartData.map((entry) => (
            <li key={entry.key} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: entry.fill }} />
                {entry.name}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatNumber(entry.value)} · {formatPercent(pct(entry.value, total))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

function DataIssuesSection({ issues }: { issues: DataIssue[] }) {
  if (issues.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <AppLottie src={ANIM.done} size={110} />
        <div>
          <p className="font-medium">No major data issues detected</p>
          <p className="mt-1 text-sm text-muted-foreground">The latest scan did not flag any fields for review.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <AppLottie src={ANIM.warning} size={20} />
          <h3 className="font-medium">Data issues</h3>
        </div>
        <Badge variant="secondary">{formatNumber(issues.length)}</Badge>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead className="text-right">Count</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Examples</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue, i) => {
              const examples = (issue.examples ?? []).join(', ')
              return (
                <TableRow key={`${issue.field}-${issue.issue_type}-${i}`}>
                  <TableCell className="font-medium">{issue.field}</TableCell>
                  <TableCell className="text-muted-foreground">{issue.issue_type}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(issue.count)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={issue.severity === 'high' ? 'destructive' : 'secondary'}
                      className={cn(
                        issue.severity === 'medium' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                      )}
                    >
                      {issue.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className="block max-w-[280px] truncate font-mono text-xs text-muted-foreground"
                      title={examples}
                    >
                      {examples || '—'}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
