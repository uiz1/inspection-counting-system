<script setup lang="ts">
import { computed } from 'vue'
import type { LightingFeatures } from '@/types/inference'

const props = defineProps<{ features: LightingFeatures }>()

const rows = computed(() => [
  { key: 'L_mean', label: '全局平均亮度', value: props.features.l_mean, max: 1 },
  { key: 'r_dark', label: '暗部像素占比', value: props.features.r_dark, max: 1 },
  { key: 'r_sat', label: '高光饱和占比', value: props.features.r_sat, max: 0.2 },
  { key: 'L_std', label: '亮度标准差', value: props.features.l_std, max: 0.5 },
  { key: 'a_glare', label: '高光连通域面积比', value: props.features.a_glare, max: 0.2 },
])
</script>

<template>
  <div class="meters">
    <div v-for="row in rows" :key="row.key" class="meter">
      <div class="head">
        <span>{{ row.label }}</span>
        <span class="mono">{{ row.value.toFixed(4) }}</span>
      </div>
      <el-progress
        :percentage="Math.min(100, (row.value / row.max) * 100)"
        :stroke-width="10"
        :show-text="false"
        color="var(--accent)"
      />
    </div>
  </div>
</template>

<style scoped>
.meters {
  display: grid;
  gap: 14px;
}

.head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  color: var(--ink-soft);
  font-size: 0.9rem;
}
</style>
