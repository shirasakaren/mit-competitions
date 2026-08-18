import { useMemo, useState } from 'react'
import { Search as SearchIcon, X, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AppLottie } from '@/components/app/AppLottie'
import { ANIM } from '@/lib/animations'
import { useSearch } from '@/lib/api/hooks'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { formatDateTime, formatNumber, statusLabel } from '@/lib/format'
import { ApiError } from '@/lib/api/client'
import type { SearchResultItem, SearchType } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const TYPE_OPTIONS: { value: SearchType; label: string; placeholder: string }[] = [
  { value: 'name', label: 'Name', placeholder: 'e.g. Komang Pipit' },
  { value: 'email', label: 'Email', placeholder: 'e.g. name@example.com' },
  { value: 'phone', label: 'Phone', placeholder: 'e.g. 081234567890' },
  { value: 'user_id', label: 'User ID', placeholder: 'e.g. 1234567' },
]

const PAGE_SIZE = 10

type SortKey = 'user_id' | 'full_name' | 'status' | 'created_at'

export default function Search() {
  const [input, setInput] = useState('')
  const [type, setType] = useState<SearchType>('name')
  const [offset, setOffset] = useState(0)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null)

  const debounced = useDebouncedValue(input, 400)
  const trimmed = debounced.trim()

  const params = trimmed.length > 0 ? { q: trimmed, type, limit: PAGE_SIZE, offset } : null
  const { data, isLoading, isFetching, isError, error } = useSearch(params)

  const rows = useMemo(() => {
    const list = data?.results ?? []
    if (!sort) return list
    const copy = [...list]
    copy.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (av < bv) return -1 * sort.dir
      if (av > bv) return 1 * sort.dir
      return 0
    })
    return copy
  }, [data, sort])

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 1 }
      if (prev.dir === 1) return { key, dir: -1 }
      return null
    })
  }

  function handleTypeChange(next: SearchType) {
    setType(next)
    setOffset(0)
  }

  const activeOption = TYPE_OPTIONS.find((o) => o.value === type)!
  const total = data?.total ?? 0
  const hasMore = offset + PAGE_SIZE < total

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Search customers</h2>
        <p className="text-sm text-muted-foreground">
          Exact email, exact phone, exact user ID, or fuzzy name — across 14,999,896 records.
        </p>
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Select value={type} onValueChange={(v) => handleTypeChange(v as SearchType)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setOffset(0)
            }}
            placeholder={activeOption.placeholder}
            className="pl-9 pr-9"
            maxLength={256}
            autoFocus
          />
          {input && (
            <button
              onClick={() => setInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </Card>

      {!trimmed && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AppLottie src={ANIM.welcome} size={150} />
          <p className="text-sm text-muted-foreground">Start typing to search the customer database.</p>
        </div>
      )}

      {trimmed && isLoading && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <AppLottie src={ANIM.loader} size={20} className="!size-5" />
            Searching…
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-10 w-full" />
          ))}
        </Card>
      )}

      {trimmed && isError && (
        <Alert variant="destructive">
          <AlertTitle>{error instanceof ApiError ? error.code : 'Search failed'}</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'An unexpected error occurred.'}
          </AlertDescription>
        </Alert>
      )}

      {trimmed && !isLoading && !isError && data && data.results.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AppLottie src={ANIM.crowPeople} size={140} />
          <p className="text-sm font-medium">No results found</p>
          <p className="text-sm text-muted-foreground">Try a different query or search type.</p>
        </div>
      )}

      {trimmed && !isLoading && !isError && data && data.results.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{formatNumber(total)}</strong> result{total === 1 ? '' : 's'}
              {isFetching && <span className="ml-2">refreshing…</span>}
            </span>
            <Badge variant="secondary" className="font-mono">
              {data.took_ms}ms
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="User ID" col="user_id" sort={sort} onSort={toggleSort} />
                  <SortableHead label="Name" col="full_name" sort={sort} onSort={toggleSort} />
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <SortableHead label="Status" col="status" sort={sort} onSort={toggleSort} />
                  <SortableHead label="Created" col="created_at" sort={sort} onSort={toggleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <ResultRow key={row.user_id} row={row} />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t px-4 py-2.5">
            <span className="text-xs text-muted-foreground">
              Showing {offset + 1}–{offset + rows.length} of {formatNumber(total)}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                <ChevronLeft className="size-4" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
              >
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function SortableHead({
  label,
  col,
  sort,
  onSort,
}: {
  label: string
  col: SortKey
  sort: { key: SortKey; dir: 1 | -1 } | null
  onSort: (col: SortKey) => void
}) {
  const active = sort?.key === col
  return (
    <TableHead>
      <button
        onClick={() => onSort(col)}
        className={cn(
          'flex items-center gap-1 text-xs font-medium uppercase tracking-wide',
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {label}
        <ArrowUpDown className={cn('size-3', active && (sort!.dir === -1 ? 'rotate-180' : ''))} />
      </button>
    </TableHead>
  )
}

function ResultRow({ row }: { row: SearchResultItem }) {
  const status = statusLabel(row.status)
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{row.user_id}</TableCell>
      <TableCell className="font-medium">{row.full_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
      <TableCell className="text-muted-foreground">{row.user_email ?? '—'}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{row.msisdn ?? '—'}</TableCell>
      <TableCell>
        <Badge
          variant={status.tone === 'success' ? 'default' : status.tone === 'destructive' ? 'destructive' : 'secondary'}
        >
          {status.label}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</TableCell>
    </TableRow>
  )
}
