import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
import { useAnalytics, isWarmingUp } from '@/lib/api/hooks'
import { ApiError } from '@/lib/api/client'
import { formatCompact, formatCurrency, formatDateTime, formatMs, formatNumber, formatPercent } from '@/lib/format'
import type { AnalyticsBucket, AnalyticsMonthPoint, AnalyticsResponse } from '@/lib/api/types'

const GRAY_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

function totalOf(points: AnalyticsMonthPoint[], key: 'count' | 'amount'): number {
  return sum(points.map((p) => p[key]))
}

function monthLabel(m: string): string {
  const [y, mm] = m.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[Number(mm) - 1] ?? mm} ${y}`
}

function Kpi({ label, value, hint, loading }: { label: string; value: string; hint?: string; loading?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      )}
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  )
}

function Donut({
  data,
  title,
}: {
  data: AnalyticsBucket[]
  title: string
}) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.label, { label: d.label, color: GRAY_PALETTE[i % GRAY_PALETTE.length] }]),
  )
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <AppLottie src={ANIM.pieChart} size={18} />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <ChartContainer config={config} className="mx-auto aspect-square max-h-44 w-full max-w-44 shrink-0">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie data={data} dataKey="count" nameKey="label" innerRadius={42} outerRadius={68} strokeWidth={2}>
              {data.map((d, i) => (
                <Cell key={d.label} fill={GRAY_PALETTE[i % GRAY_PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="flex w-full flex-1 flex-col gap-1 text-xs">
          {data.map((d, i) => (
            <li key={d.label} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: GRAY_PALETTE[i % GRAY_PALETTE.length] }} />
                <span className="truncate">{d.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatNumber(d.count)} · {formatPercent(d.percent)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

function HBar({
  data,
  title,
  subtitle,
}: {
  data: AnalyticsBucket[]
  title: string
  subtitle: string
}) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.label, { label: d.label, color: GRAY_PALETTE[i % GRAY_PALETTE.length] }]),
  )
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      <ChartContainer config={config} className="mt-3 aspect-auto h-72 w-full">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 30 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => formatCompact(Number(v))} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} width={110} tick={{ fontSize: 11 }} />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="count" radius={3} fill="var(--foreground)">
            {data.map((d, i) => (
              <Cell key={d.label} fill={GRAY_PALETTE[i % GRAY_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </Card>
  )
}

export default function Analytics() {
  const { data, isLoading, error } = useAnalytics()
  const warming = !data && isWarmingUp(error)

  if (!data) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Live data science over 22.4M records — demographics, growth, commerce, and money.
          </p>
        </div>
        {warming ? (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <AppLottie src={ANIM.sandyLoading} size={110} />
            <p className="font-medium">Crunching 22.4M records…</p>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              The first analytics pass aggregates every table live. This page fills in
              automatically when it's ready — usually within a few minutes of a server restart.
            </p>
          </Card>
        ) : isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
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
      </div>
    )
  }

  return <AnalyticsBody data={data} />
}

function AnalyticsBody({ data }: { data: AnalyticsResponse }) {
  const registrations = data.registrations
  const cumulative = registrations.reduce<AnalyticsMonthPoint[]>((acc, p) => {
    const prev = acc.length ? acc[acc.length - 1].amount : 0
    acc.push({ ...p, amount: prev + p.count })
    return acc
  }, [])

  const totalOrders = totalOf(data.orders_over_time, 'count')
  const totalRevenue = totalOf(data.revenue_over_time, 'amount')
  const totalTxns = totalOf(data.revenue_over_time, 'count')
  const avgMonthlySignups = registrations.length
    ? Math.round(totalOf(registrations, 'count') / registrations.length)
    : 0
  const firstMonth = registrations[0]?.month ?? '—'
  const lastMonth = registrations[registrations.length - 1]?.month ?? '—'
  const topLocation = data.top_locations[0]?.label ?? '—'

  const hourly: AnalyticsMonthPoint[] = data.activity_heatmap.hours.map((h) => {
    const count = sum(data.activity_heatmap.cells.map((row) => row[h] ?? 0))
    return { month: `${String(h).padStart(2, '0')}:00`, count, amount: 0 }
  })

  const growthConfig: ChartConfig = {
    count: { label: 'New users' },
    amount: { label: 'Cumulative', color: 'var(--chart-2)' },
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Live data science over 22.4M records · computed in {formatMs(data.computation_ms)} ·{' '}
            {formatDateTime(data.analyzed_at)}
          </p>
        </div>
        <AppLottie src={ANIM.graphStats} size={80} className="hidden shrink-0 sm:block" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Kpi label="Customers" value={formatNumber(totalOf(registrations, 'count'))} hint={`${monthLabel(firstMonth)} → ${monthLabel(lastMonth)}`} />
        <Kpi label="Avg monthly signups" value={formatCompact(avgMonthlySignups)} hint="over the full lifetime" />
        <Kpi label="Orders" value={formatCompact(totalOrders)} hint="last 13 months" />
        <Kpi label="Revenue" value={formatCurrency(totalRevenue)} hint={`${formatCompact(totalTxns)} transactions`} />
        <Kpi label="Top location" value={topLocation} hint={`${formatNumber(data.top_locations[0]?.count ?? 0)} customers`} />
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <AppLottie src={ANIM.rocketLaunch} size={22} />
          <div>
            <h3 className="text-sm font-medium">Customer growth</h3>
            <p className="text-xs text-muted-foreground">
              Monthly registrations since 2009, with the cumulative total overlaid.
            </p>
          </div>
        </div>
        <ChartContainer config={growthConfig} className="mt-3 aspect-auto h-72 w-full">
          <LineChart data={cumulative} margin={{ left: 8, right: 16 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickFormatter={monthLabel} minTickGap={40} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tickFormatter={(v) => formatCompact(Number(v))} axisLine={false} tickLine={false} width={46} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatCompact(Number(v))} axisLine={false} tickLine={false} width={46} tick={{ fontSize: 11 }} />
            <ChartTooltip
              content={<ChartTooltipContent labelFormatter={(_, p) => p?.[0]?.payload?.month ?? ''} />}
            />
            <Line yAxisId="left" type="monotone" dataKey="count" name="New users" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="amount" name="Cumulative" stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ChartContainer>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AppLottie src={ANIM.paymentSuccess} size={20} />
            <h3 className="text-sm font-medium">Orders per month</h3>
          </div>
          <ChartContainer config={{ count: { label: 'Orders' } }} className="mt-3 aspect-auto h-60 w-full">
            <AreaChart data={data.orders_over_time} margin={{ left: 8, right: 16 }}>
              <defs>
                <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickFormatter={monthLabel} minTickGap={40} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatCompact(Number(v))} axisLine={false} tickLine={false} width={46} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="count" name="Orders" stroke="var(--chart-1)" fill="url(#ordersFill)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AppLottie src={ANIM.musicNote} size={18} />
            <h3 className="text-sm font-medium">Revenue per month</h3>
          </div>
          <ChartContainer config={{ amount: { label: 'Revenue' } }} className="mt-3 aspect-auto h-60 w-full">
            <BarChart data={data.revenue_over_time} margin={{ left: 8, right: 16 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickFormatter={monthLabel} minTickGap={40} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatCompact(Number(v))} axisLine={false} tickLine={false} width={46} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="amount" name="Revenue" radius={3} fill="var(--foreground)" />
            </BarChart>
          </ChartContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-sm font-medium">Age distribution</h3>
          <p className="text-xs text-muted-foreground">10-year buckets from birth dates</p>
          <ChartContainer
            config={Object.fromEntries(data.age_distribution.map((d) => [d.label, { label: d.label }]))}
            className="mt-3 aspect-auto h-56 w-full"
          >
            <BarChart data={data.age_distribution} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatCompact(Number(v))} axisLine={false} tickLine={false} width={46} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={3} fill="var(--foreground)" />
            </BarChart>
          </ChartContainer>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium">Deposit histogram</h3>
          <p className="text-xs text-muted-foreground">
            Stored wallet balances (IDR) — {formatPercent(data.deposit_histogram.find((d) => d.label === 'no deposit')?.percent ?? 0)} never deposited
          </p>
          <ChartContainer
            config={Object.fromEntries(data.deposit_histogram.map((d) => [d.label, { label: d.label }]))}
            className="mt-3 aspect-auto h-56 w-full"
          >
            <BarChart data={data.deposit_histogram} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatCompact(Number(v))} axisLine={false} tickLine={false} width={46} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={3} fill="var(--foreground)" />
            </BarChart>
          </ChartContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Donut data={data.sex_distribution} title="Sex" />
        <Donut data={data.lang_distribution} title="Language" />
        <Donut data={data.transaction_types} title="Transaction types" />
        <Donut data={data.order_statuses} title="Order status" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <HBar data={data.top_locations} title="Top locations" subtitle="Customers by declared location" />
        <HBar data={data.top_occupations} title="Top occupations" subtitle="Customers by declared occupation" />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Profile completeness</h3>
            <p className="text-xs text-muted-foreground">Share of rows with a usable value</p>
          </div>
          <AppLottie src={ANIM.fingerprint} size={28} />
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted-foreground">Location</span>
              <span className="tabular-nums">{formatPercent(data.location_completeness)}</span>
            </div>
            <Progress value={data.location_completeness} />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted-foreground">Occupation</span>
              <span className="tabular-nums">{formatPercent(data.occupation_completeness)}</span>
            </div>
            <Progress value={data.occupation_completeness} />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <AppLottie src={ANIM.crowPeople} size={22} />
            <h3 className="font-medium">Top spenders</h3>
          </div>
          <Badge variant="secondary">by order value</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total spent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.top_spenders.map((s, i) => (
                <TableRow key={s.user_id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium">{s.full_name ?? 'Unknown name'}</div>
                    <div className="font-mono text-xs text-muted-foreground">ID {s.user_id}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(s.orders)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatCurrency(s.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-medium">Hourly activity pattern</h3>
        <p className="text-xs text-muted-foreground">When the platform is busiest, hour by hour</p>
        <ChartContainer
          config={Object.fromEntries(hourly.map((h) => [h.month, { label: h.month }]))}
          className="mt-3 aspect-auto h-48 w-full"
        >
          <AreaChart data={hourly} margin={{ left: 8, right: 16 }}>
            <defs>
              <linearGradient id="hourlyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" minTickGap={30} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatCompact(Number(v))} axisLine={false} tickLine={false} width={46} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="count" name="Events" stroke="var(--chart-1)" fill="url(#hourlyFill)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </Card>
    </div>
  )
}
