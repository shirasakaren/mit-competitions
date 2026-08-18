import { useQuery } from '@tanstack/react-query'
import * as api from './client'
import type { SearchParams } from './client'
import { ApiError } from './client'

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => api.getHealth(signal),
    refetchInterval: 15_000,
  })
}

export function useApiHealth() {
  return useQuery({
    queryKey: ['api-health'],
    queryFn: ({ signal }) => api.getApiHealth(signal),
    refetchInterval: 10_000,
  })
}

export function useSearch(params: SearchParams | null) {
  return useQuery({
    queryKey: ['search', params],
    queryFn: ({ signal }) => api.search(params as SearchParams, signal),
    enabled: params !== null && params.q.trim().length > 0,
    placeholderData: (prev) => prev,
    retry: false,
  })
}

/** True when the backend's analytics snapshot is still computing its first
 * pass — /api/quality and /api/metrics return 503 WARMING_UP for ~2-3
 * minutes after a backend restart. Consumers use this to show a
 * "computing" state instead of treating it as a hard failure. */
export function isWarmingUp(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 503 || error.code === 'WARMING_UP')
}

/** Retry policy for snapshot-backed queries: while the backend reports
 * WARMING_UP, keep polling every 5s for up to ~5 minutes so the dashboard
 * fills in on its own on the very first visit; any other error fails fast
 * (two retries). */
function snapshotRetry(failureCount: number, error: unknown): boolean {
  if (isWarmingUp(error)) return failureCount < 150
  return failureCount < 2
}

export function useQuality() {
  return useQuery({
    queryKey: ['quality'],
    queryFn: ({ signal }) => api.getQuality(signal),
    refetchInterval: 30_000,
    retry: snapshotRetry,
    retryDelay: 5_000,
  })
}

export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: ({ signal }) => api.getAnalytics(signal),
    refetchInterval: 30_000,
    retry: snapshotRetry,
    retryDelay: 5_000,
  })
}

export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: ({ signal }) => api.getMetrics(signal),
    refetchInterval: 30_000,
    retry: snapshotRetry,
    retryDelay: 5_000,
  })
}

export function useDuplicates(
  userId: number | null,
  opts?: { threshold?: number; limit?: number },
) {
  return useQuery({
    queryKey: ['duplicates', userId, opts],
    queryFn: ({ signal }) => api.getDuplicates(userId as number, opts, signal),
    enabled: userId !== null,
    retry: false,
  })
}
