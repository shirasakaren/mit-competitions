import { useQuery } from '@tanstack/react-query'
import * as api from './client'
import type { SearchParams } from './client'

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

export function useQuality() {
  return useQuery({
    queryKey: ['quality'],
    queryFn: ({ signal }) => api.getQuality(signal),
    refetchInterval: 30_000,
    retry: 2,
  })
}

export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: ({ signal }) => api.getMetrics(signal),
    refetchInterval: 30_000,
    retry: 2,
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
