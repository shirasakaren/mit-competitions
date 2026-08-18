export interface HealthResponse {
  status: string
  total_records: number
  database: string
  timestamp: string
}

export interface ApiHealthResponse {
  ok: boolean
  status: string
}

export type SearchType = 'email' | 'phone' | 'user_id' | 'name'

export interface SearchResultItem {
  user_id: number
  full_name: string | null
  user_email: string | null
  msisdn: string | null
  status: number | null
  created_at: string | null
}

export interface SearchResponse {
  query: string
  type: SearchType
  limit: number
  offset: number
  results: SearchResultItem[]
  total: number
  took_ms: number
}

export interface ApiErrorBody {
  error: { code: string; message: string }
}

export interface EmailQuality {
  total: number
  present: number
  missing_count: number
  missing_percent: number
  unique: number
  duplicate_count: number
  invalid_format: number
}

export interface PhoneQuality {
  total: number
  present: number
  missing_count: number
  missing_percent: number
  unique: number
  duplicate_count: number
  malformed: number
}

export interface BirthDateQuality {
  total: number
  present: number
  missing_count: number
  missing_percent: number
  invalid_dates: number
  impossible_dates: number
  future_dates: number
}

export interface HobbiesQuality {
  total: number
  null_count: number
  null_percent: number
  with_special_chars: number
  with_emoji: number
}

export interface StatusQuality {
  total: number
  distribution: Record<string, number>
}

export interface DataIssue {
  field: string
  issue_type: string
  count: number
  examples: string[]
  severity: 'low' | 'medium' | 'high'
}

export interface QualityResponse {
  total_records: number
  analyzed_at: string
  computation_ms: number
  quality_metrics: {
    email: EmailQuality
    phone: PhoneQuality
    birth_date: BirthDateQuality
    hobbies: HobbiesQuality
    status: StatusQuality
  }
  data_issues: DataIssue[]
}

export interface MetricsResponse {
  duplicates: number
  missing_fields: number
  quality_score: number
  total_records: number
  analyzed_at: string
}

export type Confidence = 'high' | 'medium' | 'low'

export interface PossibleDuplicate {
  user_id: number
  user_email: string | null
  user_phone: string | null
  full_name: string | null
  similarity_score: number
  match_reasons: string[]
  confidence: Confidence
}

export interface DuplicatesResponse {
  user_id: number
  user_email: string | null
  user_phone: string | null
  full_name: string | null
  possible_duplicates: PossibleDuplicate[]
  total_possible_duplicates: number
}

export interface DuplicatePair {
  id1: number
  id2: number
  similarity: number
}

export interface PostDuplicatesResponse {
  duplicates: DuplicatePair[]
  count: number
  note: string
}
