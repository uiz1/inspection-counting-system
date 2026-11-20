<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Path, RobotPose, Station } from '@/types'
import { MOCK_STATION_LIGHTING } from '@/mock/scenario'

const props = defineProps<{
  pose: RobotPose
  stations: Station[]
  planned: Path
  traveled: Path
  follow: boolean
  show_heatmap: boolean
  current_station_id: string | null
}>()

const emit = defineEmits<{ resetView: [] }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const wrapRef = ref<HTMLDivElement | null>(null)

/** isometric tile scale (px per world meter along axes) */
const scale = ref(22)
const offsetX = ref(0)
const offsetY = ref(0)
const dragging = ref(false)
const lastX = ref(0)
const lastY = ref(0)

const LIGHT: Record<string, { top: string; left: string; right: string; glow: string }> = {
  normal: { top: '#2DD4BF', left: '#0F766E', right: '#14B8A6', glow: 'rgba(13,148,136,0.35)' },
  low: { top: '#F5B942', left: '#B45309', right: '#E08600', glow: 'rgba(224,134,0,0.35)' },
  high: { top: '#F07167', left: '#9F2D24', right: '#D9483F', glow: 'rgba(217,72,63,0.35)' },
  mixed: { top: '#8EA2E8', left: '#3F4E99', right: '#5B6FC0', glow: 'rgba(91,111,192,0.35)' },
}

const floorPad = 2.2

const worldBounds = computed(() => {
  const xs = props.stations.map((s) => s.x)
  const ys = props.stations.map((s) => s.y)
  for (const p of [...props.planned.points, ...props.traveled.points]) {
    xs.push(p.x)
    ys.push(p.y)
  }
  xs.push(props.pose.x)
  ys.push(props.pose.y)
  return {
    minX: Math.min(...xs) - floorPad,
    maxX: Math.max(...xs) + floorPad,
    minY: Math.min(...ys) - floorPad,
    maxY: Math.max(...ys) + floorPad,
  }
})

/** world (x,y,z) → screen; z up */
function iso(x: number, y: number, z = 0) {
  const b = worldBounds.value
  const lx = x - b.minX
  const ly = y - b.minY
  const s = scale.value
  const sx = offsetX.value + (lx - ly) * s
  const sy = offsetY.value + (lx + ly) * s * 0.5 - z * s
  return { sx, sy }
}

function fitView() {
  const el = wrapRef.value
  if (!el) return
  const b = worldBounds.value
  const w = el.clientWidth
  const h = el.clientHeight
  const worldW = b.maxX - b.minX
  const worldH = b.maxY - b.minY
  // bounding box of iso rectangle
  const isoW = (worldW + worldH) * 1
  const isoH = (worldW + worldH) * 0.5
  const pad = 70
  scale.value = Math.min((w - pad * 2) / isoW, (h - pad * 2) / isoH)
  // center the iso diamond
  const mid = iso((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, 0)
  // mid currently uses current offset; recompute with offset 0
  const s = scale.value
  const lx = (b.maxX - b.minX) / 2
  const ly = (b.maxY - b.minY) / 2
  const cx = (lx - ly) * s
  const cy = (lx + ly) * s * 0.5
  offsetX.value = w / 2 - cx
  offsetY.value = h / 2 - cy - 10
  void mid
}

function followRobot() {
  const el = wrapRef.value
  if (!el || !props.follow) return
  const p = iso(props.pose.x, props.pose.y, 0.4)
  offsetX.value += el.clientWidth / 2 - p.sx
  offsetY.value += el.clientHeight / 2 - p.sy
}

function shade(hex: string, amt: number) {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  let r = (n >> 16) + amt
  let g = ((n >> 8) & 0xff) + amt
  let b = (n & 0xff) + amt
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  colors: { top: string; left: string; right: string },
  zBase = 0.48,
) {
  const z0 = zBase
  const p = [
    iso(x, y, z0 + h),
    iso(x + w, y, z0 + h),
    iso(x + w, y + d, z0 + h),
    iso(x, y + d, z0 + h),
    iso(x, y, z0),
    iso(x + w, y, z0),
    iso(x + w, y + d, z0),
    iso(x, y + d, z0),
  ]
  // left face (x fixed small side visually)
  ctx.beginPath()
  ctx.moveTo(p[3].sx, p[3].sy)
  ctx.lineTo(p[2].sx, p[2].sy)
  ctx.lineTo(p[6].sx, p[6].sy)
  ctx.lineTo(p[7].sx, p[7].sy)
  ctx.closePath()
  ctx.fillStyle = colors.left
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'
  ctx.lineWidth = 1
  ctx.stroke()

  // right face
  ctx.beginPath()
  ctx.moveTo(p[1].sx, p[1].sy)
  ctx.lineTo(p[2].sx, p[2].sy)
  ctx.lineTo(p[6].sx, p[6].sy)
  ctx.lineTo(p[5].sx, p[5].sy)
  ctx.closePath()
  ctx.fillStyle = colors.right
  ctx.fill()
  ctx.stroke()

  // top face
  ctx.beginPath()
  ctx.moveTo(p[0].sx, p[0].sy)
  ctx.lineTo(p[1].sx, p[1].sy)
  ctx.lineTo(p[2].sx, p[2].sy)
  ctx.lineTo(p[3].sx, p[3].sy)
  ctx.closePath()
  ctx.fillStyle = colors.top
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'
  ctx.stroke()
}

function drawFloorPad(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, d: number) {
  const z = 0.05
  const p = [iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z)]
  ctx.beginPath()
  ctx.moveTo(p[0].sx, p[0].sy)
  ctx.lineTo(p[1].sx, p[1].sy)
  ctx.lineTo(p[2].sx, p[2].sy)
  ctx.lineTo(p[3].sx, p[3].sy)
  ctx.closePath()
  ctx.fillStyle = 'rgba(232,244,243,0.12)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(232,244,243,0.35)'
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawPlatform(ctx: CanvasRenderingContext2D) {
  const b = worldBounds.value
  const x0 = b.minX
  const y0 = b.minY
  const w = b.maxX - b.minX
  const d = b.maxY - b.minY
  const thick = 0.45

  // aisle strip in front-left (visual accent like reference)
  const aisle = [
    iso(x0 - 1.2, y0 - 0.2, 0),
    iso(x0 + w * 0.55, y0 - 0.2, 0),
    iso(x0 + w * 0.55, y0 + 1.1, 0),
    iso(x0 - 1.2, y0 + 1.1, 0),
  ]
  ctx.beginPath()
  ctx.moveTo(aisle[0].sx, aisle[0].sy)
  for (let i = 1; i < aisle.length; i++) ctx.lineTo(aisle[i].sx, aisle[i].sy)
  ctx.closePath()
  ctx.fillStyle = '#1A3335'
  ctx.fill()

  // platform side faces
  const top = [
    iso(x0, y0, thick),
    iso(x0 + w, y0, thick),
    iso(x0 + w, y0 + d, thick),
    iso(x0, y0 + d, thick),
  ]
  const bot = [
    iso(x0, y0, 0),
    iso(x0 + w, y0, 0),
    iso(x0 + w, y0 + d, 0),
    iso(x0, y0 + d, 0),
  ]

  ctx.beginPath()
  ctx.moveTo(top[3].sx, top[3].sy)
  ctx.lineTo(top[2].sx, top[2].sy)
  ctx.lineTo(bot[2].sx, bot[2].sy)
  ctx.lineTo(bot[3].sx, bot[3].sy)
  ctx.closePath()
  ctx.fillStyle = '#6B7578'
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(top[1].sx, top[1].sy)
  ctx.lineTo(top[2].sx, top[2].sy)
  ctx.lineTo(bot[2].sx, bot[2].sy)
  ctx.lineTo(bot[1].sx, bot[1].sy)
  ctx.closePath()
  ctx.fillStyle = '#8A9295'
  ctx.fill()

  // top deck
  ctx.beginPath()
  ctx.moveTo(top[0].sx, top[0].sy)
  ctx.lineTo(top[1].sx, top[1].sy)
  ctx.lineTo(top[2].sx, top[2].sy)
  ctx.lineTo(top[3].sx, top[3].sy)
  ctx.closePath()
  ctx.fillStyle = '#9AA3A6'
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'
  ctx.lineWidth = 1
  ctx.stroke()

  // subtle deck grid
  ctx.strokeStyle = 'rgba(12,46,48,0.12)'
  ctx.lineWidth = 1
  for (let x = Math.ceil(x0); x < x0 + w; x += 2) {
    const a = iso(x, y0, thick)
    const c = iso(x, y0 + d, thick)
    ctx.beginPath()
    ctx.moveTo(a.sx, a.sy)
    ctx.lineTo(c.sx, c.sy)
    ctx.stroke()
  }
  for (let y = Math.ceil(y0); y < y0 + d; y += 2) {
    const a = iso(x0, y, thick)
    const c = iso(x0 + w, y, thick)
    ctx.beginPath()
    ctx.moveTo(a.sx, a.sy)
    ctx.lineTo(c.sx, c.sy)
    ctx.stroke()
  }
}

function drawPath(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], color: string, dashed: boolean, width: number) {
  if (points.length < 2) return
  const z = 0.48
  ctx.beginPath()
  const first = iso(points[0].x, points[0].y, z)
  ctx.moveTo(first.sx, first.sy)
  for (let i = 1; i < points.length; i++) {
    const p = iso(points[i].x, points[i].y, z)
    ctx.lineTo(p.sx, p.sy)
  }
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.setLineDash(dashed ? [7, 6] : [])
  ctx.stroke()
  ctx.setLineDash([])
}

function drawStation(ctx: CanvasRenderingContext2D, st: Station) {
  const kind = MOCK_STATION_LIGHTING[st.id] || 'normal'
  const colors = LIGHT[kind]
  const active = st.id === props.current_station_id
  const variant = st.order_index % 3

  // footprint pad
  const fw = variant === 0 ? 2.4 : variant === 1 ? 1.6 : 1.9
  const fd = variant === 0 ? 1.1 : variant === 1 ? 1.6 : 1.3
  drawFloorPad(ctx, st.x - fw / 2, st.y - fd / 2, fw, fd)

  if (props.show_heatmap) {
    const c = iso(st.x, st.y, 0.5)
    const g = ctx.createRadialGradient(c.sx, c.sy, 2, c.sx, c.sy, 36)
    g.addColorStop(0, colors.glow)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(c.sx, c.sy, 36, 0, Math.PI * 2)
    ctx.fill()
  }

  if (active) {
    const ring = iso(st.x, st.y, 0.5)
    ctx.beginPath()
    ctx.ellipse(ring.sx, ring.sy, 22, 11, 0, 0, Math.PI * 2)
    ctx.strokeStyle = colors.top
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // geometry variants like reference: rack / cube stack / crates
  if (variant === 0) {
    // long low rack
    drawBox(
      ctx,
      st.x - 1.1,
      st.y - 0.4,
      2.2,
      0.8,
      0.55,
      {
        top: shade(colors.top, -40),
        left: shade(colors.left, -20),
        right: shade(colors.right, -30),
      },
      0.48,
    )
  } else if (variant === 1) {
    // cube stack 2x2x3 — back-to-front
    const cell = 0.55
    const hCell = 0.5
    const cells: { xi: number; yi: number; zi: number }[] = []
    for (let zi = 0; zi < 3; zi++) {
      for (let xi = 0; xi < 2; xi++) {
        for (let yi = 0; yi < 2; yi++) cells.push({ xi, yi, zi })
      }
    }
    cells.sort((a, b) => a.xi + a.yi + a.zi - (b.xi + b.yi + b.zi))
    for (const c of cells) {
      drawBox(
        ctx,
        st.x - cell + c.xi * cell,
        st.y - cell + c.yi * cell,
        cell * 0.92,
        cell * 0.92,
        hCell,
        colors,
        0.48 + c.zi * hCell,
      )
    }
  } else {
    // twin crates
    drawBox(ctx, st.x - 0.95, st.y - 0.45, 0.85, 0.9, 0.85, colors, 0.48)
    drawBox(ctx, st.x + 0.1, st.y - 0.45, 0.85, 0.9, 0.85, colors, 0.48)
  }

  const label = iso(st.x, st.y, 2.2)
  ctx.fillStyle = '#E8F4F3'
  ctx.font = '600 12px IBM Plex Sans, Noto Sans SC, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${st.order_index + 1} · ${st.name}`, label.sx, label.sy)
}

function drawRobot(ctx: CanvasRenderingContext2D) {
  const { x, y, yaw } = props.pose
  // body
  const colors = { top: '#F0FDFA', left: '#5EEAD4', right: '#99F6E4' }
  drawBox(ctx, x - 0.35, y - 0.35, 0.7, 0.7, 0.45, colors)

  // heading chevron on top
  const len = 0.85
  const hx = x + Math.cos(yaw) * len
  const hy = y + Math.sin(yaw) * len
  const a = iso(x, y, 0.7)
  const b = iso(hx, hy, 0.7)
  ctx.beginPath()
  ctx.moveTo(a.sx, a.sy)
  ctx.lineTo(b.sx, b.sy)
  ctx.strokeStyle = '#0D9488'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.stroke()
  // tip
  ctx.beginPath()
  ctx.arc(b.sx, b.sy, 4, 0, Math.PI * 2)
  ctx.fillStyle = '#0D9488'
  ctx.fill()
}

function draw() {
  const canvas = canvasRef.value
  const wrap = wrapRef.value
  if (!canvas || !wrap) return
  const dpr = window.devicePixelRatio || 1
  const w = wrap.clientWidth
  const h = wrap.clientHeight
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // scene backdrop (only dark zone)
  ctx.fillStyle = '#0C2E30'
  ctx.fillRect(0, 0, w, h)

  // soft vignette
  const vg = ctx.createRadialGradient(w * 0.5, h * 0.45, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.7)
  vg.addColorStop(0, 'rgba(20,82,85,0.35)')
  vg.addColorStop(1, 'rgba(12,46,48,0)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, w, h)

  drawPlatform(ctx)
  drawPath(ctx, props.planned.points, 'rgba(94,234,212,0.85)', true, 2.5)
  drawPath(ctx, props.traveled.points, '#0D9488', false, 3.5)

  // painters algorithm-ish: sort stations by iso depth (x+y)
  const sorted = [...props.stations].sort((a, b) => a.x + a.y - (b.x + b.y))
  for (const st of sorted) drawStation(ctx, st)
  drawRobot(ctx)

  // scale hint
  ctx.fillStyle = 'rgba(232,244,243,0.75)'
  ctx.font = '11px IBM Plex Mono, monospace'
  ctx.textAlign = 'left'
  ctx.fillText('ISO · 2 m', 16, h - 18)
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const factor = e.deltaY > 0 ? 0.9 : 1.1
  const rect = wrapRef.value!.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const before = { x: mx, y: my }
  // zoom around cursor: adjust offset so iso mid under cursor stays
  const old = scale.value
  scale.value = Math.min(48, Math.max(10, scale.value * factor))
  const k = scale.value / old
  offsetX.value = before.x - (before.x - offsetX.value) * k
  offsetY.value = before.y - (before.y - offsetY.value) * k
  draw()
}

function onDown(e: PointerEvent) {
  dragging.value = true
  lastX.value = e.clientX
  lastY.value = e.clientY
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onMove(e: PointerEvent) {
  if (!dragging.value) return
  offsetX.value += e.clientX - lastX.value
  offsetY.value += e.clientY - lastY.value
  lastX.value = e.clientX
  lastY.value = e.clientY
  draw()
}

function onUp() {
  dragging.value = false
}

function onDblClick() {
  fitView()
  draw()
  emit('resetView')
}

function reset() {
  fitView()
  if (props.follow) followRobot()
  draw()
}

let raf = 0
function schedule() {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    if (props.follow) followRobot()
    draw()
  })
}

onMounted(() => {
  fitView()
  if (props.follow) followRobot()
  draw()
  window.addEventListener('resize', schedule)
})

onUnmounted(() => {
  window.removeEventListener('resize', schedule)
  cancelAnimationFrame(raf)
})

watch(
  () => [
    props.pose,
    props.planned,
    props.traveled,
    props.stations,
    props.show_heatmap,
    props.follow,
    props.current_station_id,
  ],
  schedule,
  { deep: true },
)

defineExpose({ reset })
</script>

<template>
  <div ref="wrapRef" class="map-wrap">
    <canvas
      ref="canvasRef"
      @wheel.prevent="onWheel"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @dblclick="onDblClick"
    />
    <div class="map-legend">
      <span><i class="dot planned" />规划</span>
      <span><i class="dot traveled" />已走</span>
      <span><i class="dot normal" />正常</span>
      <span><i class="dot low" />低照</span>
      <span><i class="dot high" />强反光</span>
      <span><i class="dot mixed" />混合</span>
    </div>
  </div>
</template>

<style scoped>
.map-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  background: #0c2e30;
  border-radius: 16px;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}

.map-wrap:active {
  cursor: grabbing;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.map-legend {
  position: absolute;
  left: 12px;
  top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(12, 46, 48, 0.72);
  color: #e8f4f3;
  font-size: 11px;
  backdrop-filter: blur(6px);
}

.map-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot.planned {
  background: #5eead4;
  border-radius: 1px;
}
.dot.traveled {
  background: #0d9488;
  border-radius: 1px;
}
.dot.normal {
  background: #0d9488;
}
.dot.low {
  background: #e08600;
}
.dot.high {
  background: #d9483f;
}
.dot.mixed {
  background: #5b6fc0;
}
</style>
