/** 契约 AGENTS.md §7 — 字段一律 snake_case，禁止前端改写为 camelCase */

export type RouteClass = 'normal' | 'low' | 'high' | 'mixed'
export type BranchName = 'identity' | 'zero_dce_pp' | 'specular_clahe'

export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
}

export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface HealthInfo {
  status: 'ok' | 'degraded' | 'down'
  service: string
  version: string
  mode: 'mock' | 'onnx' | 'ros_bridge'
  robot_online: boolean
}

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

export interface CountingResult {
  id: string
  task_id: string | null
  station_id: string
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

export interface Record {
  id: string
  task_id: string | null
  station_id: string
  created_at: string
  route_class: RouteClass
  branch: BranchName
  count: number
  count_rounded: number
  total_ms: number
  filename: string
  frame_id: string | null
}

export interface Task {
  id: string
  name: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  station_ids: string[]
  current_station_id: string | null
  created_at: string
  updated_at: string
  progress: number
}

export interface Station {
  id: string
  name: string
  x: number
  y: number
  yaw: number
  order_index: number
}

export interface MapInfo {
  id: string
  name: string
  frame: 'map' | 'world'
  resolution: number
  width: number
  height: number
  origin_x: number
  origin_y: number
  image_url: string
}

export interface RobotPose {
  x: number
  y: number
  yaw: number
  speed: number
  stamp: string
  localized: boolean
  station_id: string | null
}

export interface PathPoint {
  x: number
  y: number
  stamp?: string
}

export interface Path {
  id: string
  kind: 'planned' | 'traveled'
  points: PathPoint[]
  task_id: string | null
}

export interface RobotStatus {
  online: boolean
  mode: 'idle' | 'cruising' | 'capturing' | 'charging' | 'error'
  battery: number | null
  message: string
}

export interface Alert {
  id: string
  level: 'info' | 'warn' | 'error'
  code: string
  message: string
  station_id: string | null
  created_at: string
}

export interface SystemConfig {
  route_thresholds: {
    low_l_mean: number
    low_r_dark: number
    high_r_sat: number
    high_a_glare: number
    mixed_l_std: number
  }
  camera: {
    jpeg_quality: number
    capture_dwell_sec: number
    prefer_width: number
    prefer_height: number
  }
  counting_input: {
    width: 640
    height: 360
    layout: 'NCHW'
  }
}

/** WebSocket 消息信封 AGENTS.md §6 */
export interface WsEnvelope<T = unknown> {
  event: string
  ts: string
  data: T
}

export const API_ERROR_CODE = {
  OK: 0,
  BAD_PARAMS: 40001,
  BAD_MEDIA: 40002,
  NOT_FOUND: 40401,
  CONFLICT: 40901,
  INTERNAL: 50001,
  INFER_FAIL: 50002,
  DEPENDENCY: 50301,
} as const
