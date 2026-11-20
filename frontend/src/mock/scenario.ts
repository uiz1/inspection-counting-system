import type {
  CountingResult,
  MapInfo,
  Path,
  Record as LedgerRecord,
  RobotPose,
  RobotStatus,
  Station,
  Task,
} from '@/types'

/** 车间平面坐标系：米；原点左下，X 向右，Y 向上 */

export const MOCK_MAP: MapInfo = {
  id: 'map-workshop-a',
  name: 'A区装配车间',
  frame: 'map',
  resolution: 0.05,
  width: 800,
  height: 560,
  origin_x: 0,
  origin_y: 0,
  image_url: '',
}

export const MOCK_STATIONS: Station[] = [
  { id: 'station-a', name: '工位-A', x: 4.2, y: 12.5, yaw: 0, order_index: 0 },
  { id: 'station-b', name: '工位-B', x: 11.8, y: 13.1, yaw: -0.2, order_index: 1 },
  { id: 'station-c', name: '工位-C', x: 18.5, y: 11.6, yaw: 0.1, order_index: 2 },
  { id: 'station-d', name: '工位-D', x: 19.2, y: 5.4, yaw: -1.4, order_index: 3 },
  { id: 'station-e', name: '工位-E', x: 12.4, y: 4.1, yaw: 3.0, order_index: 4 },
  { id: 'station-f', name: '工位-F', x: 5.1, y: 4.8, yaw: 1.6, order_index: 5 },
  { id: 'station-g', name: '工位-G', x: 9.6, y: 8.8, yaw: 0.4, order_index: 6 },
  { id: 'station-h', name: '工位-H', x: 15.2, y: 8.2, yaw: -0.6, order_index: 7 },
]

function pathThrough(ids: string[]): { x: number; y: number }[] {
  const byId = Object.fromEntries(MOCK_STATIONS.map((s) => [s.id, s]))
  const pts: { x: number; y: number }[] = []
  for (const id of ids) {
    const s = byId[id]
    if (!s) continue
    pts.push({ x: s.x, y: s.y })
  }
  // densify for nicer polyline
  const dense: { x: number; y: number }[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const steps = 8
    for (let k = 0; k < steps; k++) {
      const t = k / steps
      dense.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
    }
  }
  dense.push(pts[pts.length - 1])
  return dense
}

const plannedPts = pathThrough([
  'station-a',
  'station-b',
  'station-c',
  'station-d',
  'station-e',
  'station-f',
  'station-g',
  'station-h',
  'station-a',
])

export const MOCK_PLANNED_PATH: Path = {
  id: 'path-planned-demo',
  kind: 'planned',
  points: plannedPts,
  task_id: 'task-demo-001',
}

/** 已走约前 35% 路径 */
const traveledCount = Math.floor(plannedPts.length * 0.35)
export const MOCK_TRAVELED_PATH: Path = {
  id: 'path-traveled-demo',
  kind: 'traveled',
  points: plannedPts.slice(0, traveledCount),
  task_id: 'task-demo-001',
}

const lastTraveled = MOCK_TRAVELED_PATH.points[MOCK_TRAVELED_PATH.points.length - 1]
const nextPt = plannedPts[Math.min(traveledCount, plannedPts.length - 1)]

export const MOCK_POSE: RobotPose = {
  x: lastTraveled.x,
  y: lastTraveled.y,
  yaw: Math.atan2(nextPt.y - lastTraveled.y, nextPt.x - lastTraveled.x),
  speed: 0.42,
  stamp: new Date().toISOString(),
  localized: true,
  station_id: 'station-c',
}

export const MOCK_STATUS: RobotStatus = {
  online: true,
  mode: 'cruising',
  battery: 0.78,
  message: '巡航至工位-C · 光照路由就绪',
}

export const MOCK_TASK: Task = {
  id: 'task-demo-001',
  name: '晚班盘点巡检',
  status: 'running',
  station_ids: MOCK_STATIONS.map((s) => s.id),
  current_station_id: 'station-c',
  created_at: new Date(Date.now() - 36 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
  progress: 0.35,
}

/** 工位点光照标签（演示热力） */
export const MOCK_STATION_LIGHTING: Record<string, 'normal' | 'low' | 'high' | 'mixed'> = {
  'station-a': 'normal',
  'station-b': 'low',
  'station-c': 'high',
  'station-d': 'mixed',
  'station-e': 'normal',
  'station-f': 'low',
  'station-g': 'normal',
  'station-h': 'high',
}

export const MOCK_LATEST_COUNT: CountingResult = {
  id: 'count-demo-001',
  task_id: 'task-demo-001',
  station_id: 'station-b',
  created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  route_class: 'low',
  branch: 'zero_dce_pp',
  features: {
    l_mean: 0.24,
    r_dark: 0.41,
    r_sat: 0.01,
    l_std: 0.12,
    a_glare: 0.0,
  },
  count: 126.4,
  count_rounded: 126,
  timing: {
    feature_ms: 8.2,
    route_ms: 0.3,
    preprocess_ms: 21.5,
    count_ms: 34.1,
    total_ms: 64.1,
  },
  original_image: '',
  corrected_image: '',
  density_overlay: '',
  mock: true,
  note: '演示数据 · 工位-B 暗光增强后计数',
}

export const MOCK_RECORDS: LedgerRecord[] = [
  {
    id: 'rec-01',
    task_id: 'task-demo-001',
    station_id: 'station-a',
    created_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    route_class: 'normal',
    branch: 'identity',
    count: 98.2,
    count_rounded: 98,
    total_ms: 41.2,
    filename: 'station-a-001.jpg',
    frame_id: 'frame-01',
  },
  {
    id: 'rec-02',
    task_id: 'task-demo-001',
    station_id: 'station-b',
    created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    route_class: 'low',
    branch: 'zero_dce_pp',
    count: 126.4,
    count_rounded: 126,
    total_ms: 64.1,
    filename: 'station-b-001.jpg',
    frame_id: 'frame-02',
  },
]
