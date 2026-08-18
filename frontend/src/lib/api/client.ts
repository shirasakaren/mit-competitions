import type {
  AnalyticsResponse,
  HealthResponse,
  ApiHealthResponse,
  SearchResponse,
  SearchType,
  QualityResponse,
  MetricsResponse,
  DuplicatesResponse,
  PostDuplicatesResponse,
  ApiErrorBody,
} from './types'

export class ApiError extends Error {
  code: string
  status: number
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    let body: ApiErrorBody | null = null
    try {
      body = await res.json()
    } catch {
      // no JSON body
    }
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? res.statusText,
    )
  }
  return res.json() as Promise<T>
}

export function getHealth(signal?: AbortSignal) {
  return request<HealthResponse>('/health', { signal })
}

export function getApiHealth(signal?: AbortSignal) {
  return request<ApiHealthResponse>('/api/health', { signal })
}

export interface SearchParams {
  q: string
  type: SearchType
  limit?: number
  offset?: number
}

export function search(params: SearchParams, signal?: AbortSignal) {
  const usp = new URLSearchParams({
    q: params.q,
    type: params.type,
    limit: String(params.limit ?? 10),
    offset: String(params.offset ?? 0),
  })
  return request<SearchResponse>(`/api/search?${usp.toString()}`, { signal })
}

export function getQuality(signal?: AbortSignal) {
  return request<QualityResponse>('/api/quality', { signal })
}

export function getMetrics(signal?: AbortSignal) {
  return request<MetricsResponse>('/api/metrics', { signal })
}

export function getAnalytics(signal?: AbortSignal) {
  return request<AnalyticsResponse>('/api/analytics', { signal })
}

export function getDuplicates(
  userId: number,
  opts?: { threshold?: number; limit?: number },
  signal?: AbortSignal,
) {
  const usp = new URLSearchParams()
  if (opts?.threshold != null) usp.set('threshold', String(opts.threshold))
  if (opts?.limit != null) usp.set('limit', String(opts.limit))
  const qs = usp.toString()
  return request<DuplicatesResponse>(
    `/api/duplicates/${userId}${qs ? `?${qs}` : ''}`,
    { signal },
  )
}

export function postDuplicatesSample(signal?: AbortSignal) {
  return request<PostDuplicatesResponse>('/api/duplicates', {
    method: 'POST',
    signal,
  })
}
