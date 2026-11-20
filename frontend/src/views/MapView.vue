<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useRobotStore } from '@/stores/robot'

const robot = useRobotStore()
const { pose, status, follow, planned_path, traveled_path } = storeToRefs(robot)
</script>

<template>
  <section class="map-page">
    <div class="hero panel">
      <div class="copy">
        <p class="eyebrow">态势地图 · 默认首页</p>
        <h1>巡检态势</h1>
        <p class="lead">
          实时定位、规划路径与已走轨迹将在此 Canvas/SVG 画布呈现；支持拖拽平移、滚轮缩放与跟随/自由视角。
          （第 1 块仅骨架，地图交互下一分块接入）
        </p>
        <div class="actions">
          <el-button :type="follow ? 'primary' : 'default'" @click="robot.setFollow(true)">
            跟随机器人
          </el-button>
          <el-button :type="!follow ? 'primary' : 'default'" @click="robot.setFollow(false)">
            自由视角
          </el-button>
        </div>
      </div>
      <div class="canvas-shell" data-testid="map-canvas-placeholder">
        <div class="grid" />
        <p class="hint mono">MAP CANVAS · drag / zoom pending</p>
      </div>
    </div>

    <div class="meta-grid">
      <article class="panel meta">
        <h2>位姿快照</h2>
        <p v-if="pose" class="mono">
          x={{ pose.x.toFixed(2) }} y={{ pose.y.toFixed(2) }} yaw={{ pose.yaw.toFixed(2) }}
        </p>
        <p v-else class="muted">等待 /ws/v1 · robot.pose</p>
      </article>
      <article class="panel meta">
        <h2>机器人状态</h2>
        <p v-if="status">{{ status.mode }} · {{ status.message || (status.online ? '在线' : '离线') }}</p>
        <p v-else class="muted">等待 robot.status</p>
      </article>
      <article class="panel meta">
        <h2>路径点数</h2>
        <p class="mono">
          planned {{ planned_path?.points.length ?? 0 }} /
          traveled {{ traveled_path?.points.length ?? 0 }}
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.map-page {
  display: grid;
  gap: 18px;
}

.hero {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  overflow: hidden;
  min-height: 360px;
}

.copy {
  padding: 32px 36px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--accent);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
}

h1 {
  margin: 0;
  color: var(--brand);
  font-size: clamp(2rem, 4vw, 3rem);
}

.lead {
  margin: 12px 0 20px;
  color: var(--ink-soft);
  line-height: 1.65;
  max-width: 34rem;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.canvas-shell {
  position: relative;
  min-height: 320px;
  background: linear-gradient(160deg, rgba(15, 61, 62, 0.92), rgba(13, 148, 136, 0.7));
  display: grid;
  place-items: center;
}

.grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 28px 28px;
}

.hint {
  position: relative;
  color: #ecfeff;
  opacity: 0.85;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.meta {
  padding: 18px 20px;
}

.meta h2 {
  margin: 0 0 8px;
  font-size: 0.95rem;
  color: var(--brand);
}

.muted {
  color: var(--muted);
  margin: 0;
}

@media (max-width: 900px) {
  .hero,
  .meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
