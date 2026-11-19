export type RouteClass = 'normal' | 'low' | 'high'
export type BranchName = 'identity' | 'zero_dce_pp' | 'specular_clahe'

export interface LightingFeatures {
  l_mean: number
  r_dark: number
  r_sat: number
  l_std: number
  a_glare: number
}

export interface TimingBreakdown {
  feature_ms: number
  route_ms: number
  preprocess_ms: number
  count_ms: number
  total_ms: number
}

export interface InferenceResult {
  id: string
  station: string
  created_at: string
  route_class: RouteClass
  branch: BranchName
  features: LightingFeatures
  count: number
  count_rounded: number
  timing: TimingBreakdown
  original_image: string
  corrected_image: string
  density_overlay: string
  mock: boolean
  note: string
}

export interface LedgerEntry {
  id: string
  station: string
  created_at: string
  route_class: RouteClass
  branch: BranchName
  count: number
  count_rounded: number
  total_ms: number
  filename: string
}

export interface HealthResponse {
  status: string
  service: string
  version: string
  mode: string
}
