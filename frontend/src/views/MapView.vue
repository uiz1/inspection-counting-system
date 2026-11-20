<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import MapCanvas from '@/components/map/MapCanvas.vue'
import { useRobotStore } from '@/stores/robot'
import { useTaskStore } from '@/stores/task'
import { MOCK_STATIONS, MOCK_STATION_LIGHTING } from '@/mock/scenario'

const robot = useRobotStore()
const taskStore = useTaskStore()
const { pose, status, follow, planned_path, traveled_path, stations, using_demo } = storeToRefs(robot)
const { current, latest_count } = storeToRefs(taskStore)

const show_heatmap = ref(true)
const mapRef = ref<InstanceType<typeof MapCanvas> | null>(null)

const modeLabel: Record<string, string> = {
  idle: '空闲',
  cruising: '巡航中',
  capturing: '定点采图',
  charging: '充电',
  error: '异常',
}

const routeLabel: Record<string, string> = {
  normal: '正常',
  low: '低照度',
  high: '强反光',
  mixed: '混合',
}

const batteryPct = computed(() => Math.round((status.value.battery ?? 0) * 100))
const pathProgress = computed(() => {
  const p = planned_path.value.points.length || 1
  const t = traveled_path.value.points.length
  return Math.min(1, t / p)
})

const queue = computed(() => {
  const ids = current.value.station_ids
  const byId = Object.fromEntries(stations.value.map((s) => [s.id, s]))
  return ids.map((id) => byId[id]).filter(Boolean)
})

const lightColor: Record<string, string> = {
  normal: '#0D9488',
  low: '#E08600',
  high: '#D9483F',
  mixed: '#5B6FC0',
}

function stationLight(id: string) {
  return MOCK_STATION_LIGHTING[id] || 'normal'
}

function resetView() {
  mapRef.value?.reset()
}
</script>

<template>
  <section class="map-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">巡检态势</p>
        <h1>A区装配车间</h1>
      </div>
      <div class="head-tags">
        <span v-if="using_demo" class="demo-tag">演示数据</span>
        <span class="live-tag">{{ modeLabel[status.mode] || status.mode }}</span>
      </div>
    </header>

    <div class="main-grid">
      <div class="map-panel">
        <MapCanvas
          ref="mapRef"
          :pose="pose"
          :stations="stations"
          :planned="planned_path"
          :traveled="traveled_path"
          :follow="follow"
          :show_heatmap="show_heatmap"
          :current_station_id="current.current_station_id"
          @reset-view="resetView"
        />
        <div class="map-toolbar">
          <button
            type="button"
            class="tb"
            :class="{ on: follow }"
            @click="robot.setFollow(true)"
          >
            跟随
          </button>
          <button
            type="button"
            class="tb"
            :class="{ on: !follow }"
            @click="robot.setFollow(false)"
          >
            自由视角
          </button>
          <button type="button" class="tb" :class="{ on: show_heatmap }" @click="show_heatmap = !show_heatmap">
            光照热力
          </button>
          <button type="button" class="tb reset" @click="resetView">复位</button>
        </div>
      </div>

      <aside class="side">
        <article class="side-card">
          <div class="card-head">
            <h2>工位任务</h2>
            <span class="mono">{{ Math.round(current.progress * 100) }}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${current.progress * 100}%` }" />
          </div>
          <ol class="queue">
            <li
              v-for="st in queue"
              :key="st.id"
              :class="{
                active: st.id === current.current_station_id,
                done: st.order_index < (MOCK_STATIONS.find((x) => x.id === current.current_station_id)?.order_index ?? 0),
              }"
            >
              <span class="idx" :style="{ background: lightColor[stationLight(st.id)] }">
                {{ st.order_index + 1 }}
              </span>
              <span class="name">{{ st.name }}</span>
              <span class="light">{{ routeLabel[stationLight(st.id)] }}</span>
            </li>
          </ol>
        </article>

        <article class="side-card robot-card">
          <div class="card-head">
            <h2>机器人</h2>
            <span class="pill">{{ status.online ? '在线' : '演示' }}</span>
          </div>
          <div class="batt-row">
            <div class="batt-num mono">{{ batteryPct }}%</div>
            <div class="batt-meta">
              <p>{{ modeLabel[status.mode] }}</p>
              <p class="sub">{{ status.message }}</p>
            </div>
          </div>
          <div class="batt-bar">
            <div class="batt-fill" :style="{ width: `${batteryPct}%` }" />
          </div>
          <dl class="kv">
            <div><dt>速度</dt><dd class="mono">{{ pose.speed.toFixed(2) }} m/s</dd></div>
            <div><dt>定位</dt><dd>{{ pose.localized ? '正常' : '降级' }}</dd></div>
          </dl>
        </article>

        <article class="side-card count-card">
          <div class="card-head">
            <h2>最新计数</h2>
            <span class="route" :data-r="latest_count.route_class">
              {{ routeLabel[latest_count.route_class] }}
            </span>
          </div>
          <p class="count-num mono">{{ latest_count.count_rounded }}</p>
          <p class="sub">
            {{ stations.find((s) => s.id === latest_count.station_id)?.name || latest_count.station_id }}
            · {{ latest_count.timing.total_ms.toFixed(1) }} ms
          </p>
        </article>
      </aside>
    </div>

    <div class="kpi-row">
      <article class="kpi">
        <h3>位姿快照</h3>
        <p class="kpi-main mono">
          X {{ pose.x.toFixed(2) }}
          <span>Y {{ pose.y.toFixed(2) }}</span>
        </p>
        <p class="kpi-sub">θ {{ ((pose.yaw * 180) / Math.PI).toFixed(1) }}° · 定位{{ pose.localized ? '正常' : '降级' }}</p>
      </article>
      <article class="kpi">
        <h3>机器人状态</h3>
        <p class="kpi-main mono">
          {{ batteryPct }}%
          <span>{{ pose.speed.toFixed(2) }} m/s</span>
        </p>
        <p class="kpi-sub">{{ modeLabel[status.mode] }} · {{ status.message }}</p>
      </article>
      <article class="kpi">
        <h3>路径进度</h3>
        <p class="kpi-main mono">
          {{ traveled_path.points.length }}
          <span>/ {{ planned_path.points.length }}</span>
        </p>
        <div class="mini-track">
          <div class="mini-fill" :style="{ width: `${pathProgress * 100}%` }" />
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.map-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--accent);
  font-size: 0.75rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 600;
}

h1 {
  margin: 0;
  color: var(--brand);
  font-size: 1.65rem;
  letter-spacing: 0.02em;
}

.head-tags {
  display: flex;
  gap: 8px;
}

.demo-tag,
.live-tag,
.pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.demo-tag {
  background: rgba(13, 148, 136, 0.12);
  color: var(--accent);
}

.live-tag,
.pill {
  background: rgba(15, 61, 62, 0.1);
  color: var(--brand);
}

.main-grid {
  display: grid;
  grid-template-columns: 1.85fr 1fr;
  gap: 14px;
  min-height: 520px;
}

.map-panel {
  position: relative;
  min-height: 520px;
}

.map-toolbar {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  gap: 6px;
  z-index: 2;
}

.tb {
  appearance: none;
  border: 1px solid rgba(232, 244, 243, 0.2);
  background: rgba(12, 46, 48, 0.82);
  color: #e8f4f3;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.tb:hover {
  transform: translateY(-1px);
  border-color: rgba(94, 234, 212, 0.55);
}

.tb.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #f0fdfa;
}

.tb.reset {
  background: rgba(232, 244, 243, 0.12);
}

.side {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.side-card,
.kpi {
  background: var(--surface-strong);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 16px 18px;
  box-shadow: 0 8px 24px rgba(15, 61, 62, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.side-card:hover,
.kpi:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(15, 61, 62, 0.09);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.card-head h2,
.kpi h3 {
  margin: 0;
  font-size: 0.92rem;
  color: var(--brand);
}

.progress-track,
.batt-bar,
.mini-track {
  height: 6px;
  border-radius: 999px;
  background: rgba(15, 61, 62, 0.08);
  overflow: hidden;
}

.progress-fill,
.batt-fill,
.mini-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--brand));
  transition: width 0.2s ease;
}

.queue {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
  max-height: 220px;
  overflow: auto;
}

.queue li {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  border-radius: 10px;
  color: var(--ink-soft);
  font-size: 0.85rem;
}

.queue li.active {
  background: rgba(13, 148, 136, 0.1);
  color: var(--brand);
  font-weight: 600;
}

.queue li.done {
  opacity: 0.55;
}

.idx {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 700;
}

.light {
  font-size: 0.72rem;
  color: var(--muted);
}

.batt-row {
  display: flex;
  gap: 14px;
  align-items: center;
}

.batt-num {
  font-size: 2.4rem;
  font-weight: 600;
  color: var(--brand);
  line-height: 1;
}

.batt-meta p {
  margin: 0;
  color: var(--ink);
  font-weight: 600;
}

.sub {
  margin: 4px 0 0 !important;
  color: var(--muted) !important;
  font-size: 0.8rem !important;
  font-weight: 400 !important;
}

.batt-bar {
  margin: 12px 0;
}

.kv {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0;
}

.kv div {
  background: rgba(15, 61, 62, 0.04);
  border-radius: 10px;
  padding: 8px 10px;
}

.kv dt {
  margin: 0;
  font-size: 0.72rem;
  color: var(--muted);
}

.kv dd {
  margin: 2px 0 0;
  font-weight: 600;
  color: var(--brand);
}

.count-num {
  margin: 4px 0 0;
  font-size: 3rem;
  line-height: 1;
  font-weight: 600;
  color: var(--brand);
}

.route {
  font-size: 0.72rem;
  padding: 3px 8px;
  border-radius: 999px;
  color: #fff;
  background: #0d9488;
}

.route[data-r='low'] {
  background: #e08600;
}
.route[data-r='high'] {
  background: #d9483f;
}
.route[data-r='mixed'] {
  background: #5b6fc0;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.kpi-main {
  margin: 10px 0 6px;
  font-size: 1.55rem;
  font-weight: 600;
  color: var(--brand);
  display: flex;
  gap: 12px;
  align-items: baseline;
}

.kpi-main span {
  font-size: 1rem;
  color: var(--ink-soft);
  font-weight: 500;
}

.kpi-sub {
  margin: 0;
  color: var(--muted);
  font-size: 0.82rem;
}

.mini-track {
  margin-top: 10px;
}

@media (max-width: 980px) {
  .main-grid,
  .kpi-row {
    grid-template-columns: 1fr;
  }

  .map-panel {
    min-height: 420px;
  }
}
</style>
