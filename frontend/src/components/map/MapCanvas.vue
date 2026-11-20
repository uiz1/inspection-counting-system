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

const scale = ref(28)
const offsetX = ref(40)
const offsetY = ref(40)
const dragging = ref(false)
const lastX = ref(0)
const lastY = ref(0)

const LIGHT_COLOR: Record<string, string> = {
  normal: '#0D9488',
  low: '#E08600',
  high: '#D9483F',
  mixed: '#5B6FC0',
}

const worldBounds = computed(() => {
  const xs = props.stations.map((s) => s.x)
  const ys = props.stations.map((s) => s.y)
  for (const p of props.planned.points) {
    xs.push(p.x)
    ys.push(p.y)
  }
  const minX = Math.min(...xs) - 2
  const maxX = Math.max(...xs) + 2
  const minY = Math.min(...ys) - 2
  const maxY = Math.max(...ys) + 2
  return { minX, maxX, minY, maxY }
})

function worldToScreen(x: number, y: number) {
  const b = worldBounds.value
  // Y up in world → flip for canvas
  const sx = offsetX.value + (x - b.minX) * scale.value
  const sy = offsetY.value + (b.maxY - y) * scale.value
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
  const pad = 48
  scale.value = Math.min((w - pad * 2) / worldW, (h - pad * 2) / worldH)
  offsetX.value = (w - worldW * scale.value) / 2
  offsetY.value = (h - worldH * scale.value) / 2
}

function followRobot() {
  const el = wrapRef.value
  if (!el || !props.follow) return
  const { sx, sy } = worldToScreen(props.pose.x, props.pose.y)
  offsetX.value += el.clientWidth / 2 - sx
  offsetY.value += el.clientHeight / 2 - sy
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

  // dark floor
  ctx.fillStyle = '#0C2E30'
  ctx.fillRect(0, 0, w, h)

  // grid
  const grid = 1 // 1m
  const b = worldBounds.value
  ctx.strokeStyle = 'rgba(232, 244, 243, 0.08)'
  ctx.lineWidth = 1
  for (let x = Math.floor(b.minX); x <= b.maxX; x += grid) {
    const a = worldToScreen(x, b.minY)
    const c = worldToScreen(x, b.maxY)
    ctx.beginPath()
    ctx.moveTo(a.sx, a.sy)
    ctx.lineTo(c.sx, c.sy)
    ctx.stroke()
  }
  for (let y = Math.floor(b.minY); y <= b.maxY; y += grid) {
    const a = worldToScreen(b.minX, y)
    const c = worldToScreen(b.maxX, y)
    ctx.beginPath()
    ctx.moveTo(a.sx, a.sy)
    ctx.lineTo(c.sx, c.sy)
    ctx.stroke()
  }

  // heatmap soft blobs at stations
  if (props.show_heatmap) {
    for (const st of props.stations) {
      const kind = MOCK_STATION_LIGHTING[st.id] || 'normal'
      const { sx, sy } = worldToScreen(st.x, st.y)
      const grd = ctx.createRadialGradient(sx, sy, 4, sx, sy, 48)
      const col = LIGHT_COLOR[kind]
      grd.addColorStop(0, hexAlpha(col, 0.35))
      grd.addColorStop(1, hexAlpha(col, 0))
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(sx, sy, 48, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // planned path dashed
  drawPolyline(ctx, props.planned.points, '#5EEAD4', true, 2)
  // traveled solid
  drawPolyline(ctx, props.traveled.points, '#0D9488', false, 3)

  // stations
  for (const st of props.stations) {
    const { sx, sy } = worldToScreen(st.x, st.y)
    const kind = MOCK_STATION_LIGHTING[st.id] || 'normal'
    const active = st.id === props.current_station_id
    if (active) {
      ctx.beginPath()
      ctx.arc(sx, sy, 18, 0, Math.PI * 2)
      ctx.strokeStyle = hexAlpha(LIGHT_COLOR[kind], 0.7)
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(sx, sy, 24, 0, Math.PI * 2)
      ctx.strokeStyle = hexAlpha(LIGHT_COLOR[kind], 0.35)
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(sx, sy, 9, 0, Math.PI * 2)
    ctx.fillStyle = LIGHT_COLOR[kind]
    ctx.fill()
    ctx.fillStyle = '#E8F4F3'
    ctx.font = '600 11px IBM Plex Sans, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(String(st.order_index + 1), sx, sy + 4)
    ctx.font = '12px IBM Plex Sans, Noto Sans SC, sans-serif'
    ctx.fillStyle = '#E8F4F3'
    ctx.fillText(st.name, sx, sy + 26)
  }

  // robot
  const { sx, sy } = worldToScreen(props.pose.x, props.pose.y)
  ctx.save()
  ctx.translate(sx, sy)
  ctx.rotate(-props.pose.yaw) // screen Y flip already; yaw CCW in world
  // body
  ctx.beginPath()
  ctx.moveTo(14, 0)
  ctx.lineTo(-10, 9)
  ctx.lineTo(-6, 0)
  ctx.lineTo(-10, -9)
  ctx.closePath()
  ctx.fillStyle = '#F0FDFA'
  ctx.fill()
  ctx.strokeStyle = '#0D9488'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()

  // scale bar
  ctx.fillStyle = 'rgba(232,244,243,0.75)'
  ctx.font = '11px IBM Plex Mono, monospace'
  ctx.textAlign = 'left'
  const barM = 2
  const barPx = barM * scale.value
  ctx.fillRect(16, h - 28, barPx, 3)
  ctx.fillText(`${barM} m`, 16, h - 34)
}

function drawPolyline(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  color: string,
  dashed: boolean,
  width: number,
) {
  if (points.length < 2) return
  ctx.beginPath()
  const first = worldToScreen(points[0].x, points[0].y)
  ctx.moveTo(first.sx, first.sy)
  for (let i = 1; i < points.length; i++) {
    const p = worldToScreen(points[i].x, points[i].y)
    ctx.lineTo(p.sx, p.sy)
  }
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.setLineDash(dashed ? [8, 6] : [])
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.setLineDash([])
}

function hexAlpha(hex: string, a: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const factor = e.deltaY > 0 ? 0.9 : 1.1
  const rect = wrapRef.value!.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const b = worldBounds.value
  const wx = b.minX + (mx - offsetX.value) / scale.value
  const wy = b.maxY - (my - offsetY.value) / scale.value
  scale.value = Math.min(80, Math.max(12, scale.value * factor))
  offsetX.value = mx - (wx - b.minX) * scale.value
  offsetY.value = my - (b.maxY - wy) * scale.value
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
  () => [props.pose, props.planned, props.traveled, props.stations, props.show_heatmap, props.follow, props.current_station_id],
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
