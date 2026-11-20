<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSessionStore } from '@/stores/session'

const tab = ref('overview')
const session = useSessionStore()
const { health, api_online } = storeToRefs(session)
</script>

<template>
  <section class="page">
    <div class="panel intro">
      <p class="eyebrow">系统概览与设置</p>
      <h1>系统</h1>
      <p>不设第 5 个独立设置路由；概览与阈值/相机配置同页分 Tab（契约 §9.1）。</p>
    </div>

    <el-tabs v-model="tab" class="panel tabs">
      <el-tab-pane label="概览" name="overview">
        <ul class="list">
          <li>API：{{ api_online ? '在线' : '离线' }}</li>
          <li v-if="health">mode={{ health.mode }} · robot_online={{ health.robot_online }}</li>
          <li>契约版本：v1.1.1</li>
          <li>计数输入：W×H=640×360 · NCHW=1×3×360×640</li>
        </ul>
      </el-tab-pane>
      <el-tab-pane label="设置" name="settings">
        <p class="muted">
          光照阈值与相机参数将绑定 <code class="mono">GET/PUT /api/v1/config</code>（SystemConfig）。第 1 块仅占位。
        </p>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
}

.intro,
.tabs {
  padding: 24px 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--accent);
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 0.78rem;
}

h1 {
  margin: 0 0 10px;
  color: var(--brand);
}

p {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.65;
}

.list {
  margin: 0;
  padding-left: 18px;
  color: var(--ink-soft);
  line-height: 1.9;
}

.muted {
  color: var(--muted);
}
</style>
