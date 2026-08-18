import { useMemo, useState } from 'react'
import { Info, Mail, Phone, UserRound } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AppLottie } from '@/components/app/AppLottie'
import { ANIM } from '@/lib/animations'
import { useDuplicates } from '@/lib/api/hooks'
import { ApiError } from '@/lib/api/client'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Confidence, PossibleDuplicate } from '@/lib/api/types'

const THRESHOLD_OPTIONS = [0.3, 0.5, 0.7, 0.9]
const LIMIT_OPTIONS = [5, 10, 20, 50]

const CONFIDENCE_META: Record<
  Confidence,
  { label: string; badgeClass: string; barClass: string }
> = {
  high: {
    label: 'High',
    badgeClass: 'border-transparent bg-emerald-600/15 text-emerald-700 dark:text-emerald-400',
    barClass: '[&>[data-slot=progress-indicator]]:bg-emerald-600!',
  },
  medium: {
    label: 'Medium',
    badgeClass: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400',
    barClass: '[&>[data-slot=progress-indicator]]:bg-amber-500!',
  },
  low: {
    label: 'Low',
    badgeClass: 'border-transparent bg-muted text-muted-foreground',
    barClass: '',
  },
}

/** Humanizes backend match-reason tokens like "phone_exact_match" or
 * "name_similarity_0.92" into readable phrases: "Phone exact match",
 * "Name similarity 92%". Falls back gracefully for any unrecognized token. */
function humanizeReason(reason: string): string {
  const trailingNumber = reason.match(/^([a-z]+(?:_[a-z]+)*)_(\d+(?:\.\d+)?)$/i)
  let base = reason
  let suffix = ''
  if (trailingNumber) {
    base = trailingNumber[1]
    const num = Number.parseFloat(trailingNumber[2])
    if (!Number.isNaN(num)) {
      suffix = ` ${Math.round(num <= 1 ? num * 100 : num)}%`
    }
  }
  const words = base.split('_').filter(Boolean)
  if (words.length === 0) return reason
  const label = words
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toLowerCase()))
    .join(' ')
  return `${label}${suffix}`
}

export default function Duplicates() {
  const [input, setInput] = useState('')
  const [userId, setUserId] = useState<number | null>(null)
  const [threshold, setThreshold] = useState(0.5)
  const [limit, setLimit] = useState(10)

  const trimmed = input.trim()
  const canSubmit = /^\d+$/.test(trimmed) && Number(trimmed) > 0

  const { data, isLoading, isError, error } = useDuplicates(userId, { threshold, limit })

  const sortedDuplicates = useMemo(() => {
    if (!data) return []
    return [...data.possible_duplicates].sort((a, b) => b.similarity_score - a.similarity_score)
  }, [data])

  function handleSubmit() {
    if (!canSubmit) return
    setUserId(Number(trimmed))
  }

  const notFound = isError && error instanceof ApiError && error.status === 404

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Duplicate Detection</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Looks up a customer and scores every other record against it to surface possible
            duplicate accounts —{' '}
            <span className="font-mono text-xs text-foreground/80">
              score = email·0.4 + phone·0.4 + name·0.2
            </span>
            .
          </p>
        </div>
        <div className="flex items-center gap-1">
          <AppLottie src={ANIM.quiz} size={36} className="hidden shrink-0 sm:block" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="How scoring works">
                <Info className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-64">
              <div className="flex flex-col gap-1.5 py-0.5">
                <p className="font-medium">Similarity score</p>
                <p className="font-mono text-[11px] leading-relaxed opacity-90">
                  email_match × 0.4 + phone_match × 0.4 + name_similarity × 0.2
                </p>
                <p className="mt-1 font-medium">Confidence bands</p>
                <p className="opacity-90">High ≥ 90% · Medium 70–89% · Low &lt; 70%</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="dup-user-id" className="mb-1 block text-xs font-medium text-muted-foreground">
            User ID
          </label>
          <Input
            id="dup-user-id"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="e.g. 1234567"
            autoFocus
          />
        </div>

        <div className="w-full sm:w-36">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Threshold</label>
          <Select value={String(threshold)} onValueChange={(v) => setThreshold(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THRESHOLD_OPTIONS.map((t) => (
                <SelectItem key={t} value={String(t)}>
                  {Math.round(t * 100)}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-28">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Limit</label>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map((l) => (
                <SelectItem key={l} value={String(l)}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSubmit} disabled={!canSubmit} className="sm:w-28">
          Analyze
        </Button>
      </Card>

      {userId === null && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AppLottie src={ANIM.locations} size={140} />
          <p className="text-sm font-medium">Enter a user ID to search for possible duplicate accounts</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            The target customer's email, phone, and name are compared against every other record
            in the database to find likely matches.
          </p>
        </div>
      )}

      {userId !== null && isLoading && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AppLottie src={ANIM.searchingNotes} size={28} />
            Analyzing customer {userId}…
          </div>
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        </div>
      )}

      {userId !== null && !isLoading && notFound && (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <AppLottie src={ANIM.deleted} size={90} />
          <p className="text-sm font-medium">No customer found with ID {userId}</p>
          <p className="text-sm text-muted-foreground">Double-check the ID and try again.</p>
        </Card>
      )}

      {userId !== null && !isLoading && isError && !notFound && (
        <Alert variant="destructive" className="items-center">
          <AppLottie src={ANIM.warning} size={36} className="mr-2" />
          <div>
            <AlertTitle>{error instanceof ApiError ? error.code : 'Request failed'}</AlertTitle>
            <AlertDescription>
              {error instanceof ApiError ? error.message : 'An unexpected error occurred.'}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {userId !== null && !isLoading && !isError && data && (
        <div className="flex flex-col gap-4">
          <Card className="flex items-center gap-3 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <UserRound className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{data.full_name ?? 'Unknown name'}</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  ID {data.user_id}
                </Badge>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span>{data.user_email ?? 'No email on file'}</span>
                <span className="font-mono">{data.user_phone ?? 'No phone on file'}</span>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              Reference customer
            </Badge>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              {formatNumber(data.total_possible_duplicates)} possible duplicate
              {data.total_possible_duplicates === 1 ? '' : 's'}
              {sortedDuplicates.length < data.total_possible_duplicates && (
                <span className="ml-1 font-normal text-muted-foreground">
                  (showing {sortedDuplicates.length})
                </span>
              )}
            </h3>
            <span className="text-xs text-muted-foreground">
              above {Math.round(threshold * 100)}% similarity
            </span>
          </div>

          {sortedDuplicates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AppLottie src={ANIM.done} size={130} />
              <p className="text-sm font-medium">No possible duplicates found</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                No other records matched above the {Math.round(threshold * 100)}% similarity
                threshold.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sortedDuplicates.map((dup) => (
                <DuplicateCard key={dup.user_id} dup={dup} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DuplicateCard({ dup }: { dup: PossibleDuplicate }) {
  const pct = Math.round(dup.similarity_score * 100)
  const meta = CONFIDENCE_META[dup.confidence]

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">
            {dup.full_name ?? <span className="text-muted-foreground">Unknown name</span>}
          </div>
          <div className="text-xs text-muted-foreground">ID {dup.user_id}</div>
        </div>
        <Badge className={cn('shrink-0', meta.badgeClass)}>{meta.label}</Badge>
      </div>

      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Mail className="size-3.5 shrink-0" />
          <span className="truncate">{dup.user_email ?? '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Phone className="size-3.5 shrink-0" />
          <span className="font-mono">{dup.user_phone ?? '—'}</span>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Similarity</span>
          <span className="font-medium">{pct}%</span>
        </div>
        <Progress value={pct} className={meta.barClass} />
      </div>

      {dup.match_reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dup.match_reasons.map((reason) => (
            <Badge key={reason} variant="outline" className="text-[11px] font-normal">
              {humanizeReason(reason)}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  )
}
