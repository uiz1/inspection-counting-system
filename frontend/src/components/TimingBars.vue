<script setup lang="ts">
import { computed } from 'vue'
import type { TimingBreakdown } from '@/types/inference'

const props = defineProps<{ timing: TimingBreakdown }>()

const items = computed(() => {
  const t = props.timing
  const max = Math.max(t.feature_ms, t.route_ms, t.preprocess_ms, t.count_ms, 1)
  return [
    { key: '特征提取', ms: t.feature_ms, pct: (t.feature_ms / max) * 100 },
    { key: '动态路由', ms: t.route_ms, pct: (t.route_ms / max) * 100 },
    { key: '预处理', ms: t.preprocess_ms, pct: (t.preprocess_ms / max) * 100 },
    { key: '密度计数', ms: t.count_ms, pct: (t.count_ms / max) * 100 },
  ]
})
</script>

<template>
  <div class="bars">
    <div v-for="item in items" :key="item.key" class="row">
      <div class="meta">
        <span>{{ item.key }}</span>
        <span class="mono">{{ item.ms.toFixed(2) }} ms</span>
      </div>
      <div class="track">
        <div class="fill" :style="{ width: `${item.pct}%` }" />
      </div>
    </div>
    <p class="total mono">TOTAL {{ timing.total_ms.toFixed(2) }} ms</p>
  </div>
</template>

<style scoped>
.bars {
  display: grid;
  gap: 12px;
}

.meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  color: var(--ink-soft);
  font-size: 0.9rem;
}

.track {
  height: 10px;
  border-radius: 999px;
  background: rgba(15, 61, 62, 0.08);
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--brand));
  transition: width 0.6s ease;
}

.total {
  margin: 4px 0 0;
  color: var(--brand);
  font-weight: 600;
}
</style>
