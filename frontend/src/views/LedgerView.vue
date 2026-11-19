<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import { clearLedger, fetchLedger, ledgerExportUrl } from '@/api/client'
import type { LedgerEntry } from '@/types/inference'

const loading = ref(false)
const rows = ref<LedgerEntry[]>([])
const localOnly = ref(false)

const routeMap: Record<string, string> = {
  normal: '正常',
  low: '低照度',
  high: '强反光',
}

async function load() {
  loading.value = true
  try {
    rows.value = await fetchLedger()
    localOnly.value = false
  } catch {
    localOnly.value = true
    const cached = localStorage.getItem('lumi-ledger')
    rows.value = cached ? (JSON.parse(cached) as LedgerEntry[]) : []
  } finally {
    loading.value = false
  }
}

async function onClear() {
  try {
    await ElMessageBox.confirm('确认清空台账？此操作不可恢复。', '清空台账', {
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    if (!localOnly.value) await clearLedger()
    localStorage.removeItem('lumi-ledger')
    rows.value = []
    ElMessage.success('台账已清空')
  } catch {
    ElMessage.error('清空失败')
  }
}

async function exportXlsx() {
  if (!rows.value.length) {
    ElMessage.warning('暂无台账数据')
    return
  }

  if (!localOnly.value) {
    window.open(ledgerExportUrl('xlsx'), '_blank')
    return
  }

  const sheet = rows.value.map((r) => ({
    ID: r.id,
    工位: r.station,
    时间: r.created_at,
    光照类别: routeMap[r.route_class] || r.route_class,
    预处理分支: r.branch,
    计数值: r.count,
    取整: r.count_rounded,
    总耗时ms: r.total_ms,
    文件名: r.filename,
  }))
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(sheet)
  XLSX.utils.book_append_sheet(wb, ws, '巡检台账')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'inspection-ledger.xlsx')
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(value))
  } catch {
    return value
  }
}

onMounted(load)
</script>

<template>
  <section class="ledger">
    <div class="panel head">
      <div>
        <h1>巡检台账</h1>
        <p>记录各工位计数结果、光照路由类别与单帧耗时，支持导出 Excel。</p>
      </div>
      <div class="actions">
        <el-button @click="load" :loading="loading">刷新</el-button>
        <el-button type="primary" @click="exportXlsx">导出 Excel</el-button>
        <el-button type="danger" plain @click="onClear">清空</el-button>
      </div>
    </div>

    <el-alert
      v-if="localOnly"
      type="info"
      show-icon
      :closable="false"
      title="后端台账服务未连接，当前展示本地缓存（若有）。连接 FastAPI 后可同步服务端台账。"
      class="tip"
    />

    <div class="panel table-wrap">
      <el-table :data="rows" v-loading="loading" empty-text="暂无台账记录" stripe>
        <el-table-column prop="station" label="工位" width="100" />
        <el-table-column label="时间" min-width="170">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="光照" width="100">
          <template #default="{ row }">{{ routeMap[row.route_class] || row.route_class }}</template>
        </el-table-column>
        <el-table-column prop="branch" label="分支" min-width="140" />
        <el-table-column prop="count_rounded" label="计数" width="90" />
        <el-table-column label="耗时" width="110">
          <template #default="{ row }">
            <span class="mono">{{ row.total_ms.toFixed(1) }} ms</span>
          </template>
        </el-table-column>
        <el-table-column prop="filename" label="文件" min-width="160" show-overflow-tooltip />
      </el-table>
    </div>
  </section>
</template>

<style scoped>
.ledger {
  display: grid;
  gap: 16px;
}

.head {
  padding: 24px 28px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

h1 {
  margin: 0 0 8px;
  color: var(--brand);
}

p {
  margin: 0;
  color: var(--ink-soft);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.table-wrap {
  padding: 12px;
}

.tip {
  border-radius: 14px;
}

@media (max-width: 800px) {
  .head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
