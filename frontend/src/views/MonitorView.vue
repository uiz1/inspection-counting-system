<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { runInfer, fetchHealth } from '@/api/client'
import { runLocalInference } from '@/demo/localPipeline'
import type { InferenceResult } from '@/types/inference'
import TimingBars from '@/components/TimingBars.vue'
import FeatureMeters from '@/components/FeatureMeters.vue'

const fileInput = ref<HTMLInputElement | null>(null)
const fileList = ref<File[]>([])
const station = ref('工位-A')
const loading = ref(false)
const sampleLoading = ref('')
const result = ref<InferenceResult | null>(null)
const previewUrl = ref('')
const dragOver = ref(false)

const routeLabel: Record<string, string> = {
  normal: '正常光照',
  low: '低照度',
  high: '强反光',
}

const branchLabel: Record<string, string> = {
  identity: '直通',
  zero_dce_pp: 'Zero-DCE++',
  specular_clahe: '高光抑制+CLAHE',
}

const hasResult = computed(() => !!result.value)

function setSelectedFile(file: File) {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }
  fileList.value = [file]
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
  result.value = null
}

function openFilePicker() {
  fileInput.value?.click()
}

function onNativeFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) setSelectedFile(file)
  input.value = ''
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) setSelectedFile(file)
}

async function loadSample(kind: 'low' | 'high') {
  sampleLoading.value = kind
  try {
    const name = kind === 'low' ? 'sample_low.jpg' : 'sample_high.jpg'
    const res = await fetch(`/samples/${name}`)
    if (!res.ok) throw new Error(`sample ${name} missing`)
    const blob = await res.blob()
    const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg'
    setSelectedFile(new File([blob], name, { type }))
    ElMessage.success(kind === 'low' ? '已载入低照度样例' : '已载入强反光样例')
  } catch (err) {
    console.error(err)
    ElMessage.error('样例图片加载失败')
  } finally {
    sampleLoading.value = ''
  }
}

async function runSample(kind: 'low' | 'high') {
  await loadSample(kind)
  if (fileList.value.length) await startInfer()
}

async function startInfer() {
  if (!fileList.value.length) {
    ElMessage.warning('请先选择巡检采图')
    return
  }
  loading.value = true
  try {
    let online = false
    try {
      const health = await fetchHealth()
      online = health.status === 'ok'
    } catch {
      online = false
    }

    if (online) {
      result.value = await runInfer(fileList.value[0], station.value)
    } else {
      const local = await runLocalInference(fileList.value[0], station.value)
      result.value = local
      const entry = {
        id: local.id,
        station: local.station,
        created_at: local.created_at,
        route_class: local.route_class,
        branch: local.branch,
        count: local.count,
        count_rounded: local.count_rounded,
        total_ms: local.timing.total_ms,
        filename: fileList.value[0].name,
      }
      const prev = JSON.parse(localStorage.getItem('lumi-ledger') || '[]') as unknown[]
      localStorage.setItem('lumi-ledger', JSON.stringify([entry, ...prev].slice(0, 200)))
    }

    ElMessage.success(
      online ? '推理完成（后端管线）' : '推理完成（本地演示管线）',
    )
  } catch (err) {
    console.error(err)
    ElMessage.error('推理失败，请检查图片或服务状态')
  } finally {
    loading.value = false
  }
}

function reset() {
  fileList.value = []
  result.value = null
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}
</script>

<template>
  <section class="monitor">
    <div class="hero panel">
      <div class="hero-copy">
        <p class="eyebrow">巡检监控终端</p>
        <h1>光巡计数</h1>
        <p class="lead">
          上传工位采图，系统按光照特征动态路由预处理分支，再进行轻量密度计数，输出校正对比、计数值与单帧耗时。
        </p>
        <div class="hero-actions">
          <el-select v-model="station" style="width: 140px">
            <el-option label="工位-A" value="工位-A" />
            <el-option label="工位-B" value="工位-B" />
            <el-option label="工位-C" value="工位-C" />
          </el-select>
          <input
            ref="fileInput"
            class="sr-only"
            type="file"
            accept="image/*"
            @change="onNativeFileChange"
          />
          <el-button @click="openFilePicker">选择图片</el-button>
          <el-button type="primary" :loading="loading" @click="startInfer">开始计数</el-button>
          <el-button text @click="reset">清空</el-button>
        </div>
        <div class="sample-row">
          <span class="sample-label">快速样例</span>
          <button
            type="button"
            class="sample-btn"
            data-testid="sample-low"
            :disabled="sampleLoading === 'low'"
            @click.stop.prevent="loadSample('low')"
          >
            {{ sampleLoading === 'low' ? '载入中…' : '低照度' }}
          </button>
          <button
            type="button"
            class="sample-btn"
            data-testid="sample-high"
            :disabled="sampleLoading === 'high'"
            @click.stop.prevent="loadSample('high')"
          >
            {{ sampleLoading === 'high' ? '载入中…' : '强反光' }}
          </button>
          <button
            type="button"
            class="sample-btn primary"
            data-testid="sample-low-run"
            :disabled="!!sampleLoading || loading"
            @click.stop.prevent="runSample('low')"
          >
            一键演示（低照度）
          </button>
        </div>
        <div
          class="dropzone"
          data-testid="dropzone"
          :class="{ active: dragOver }"
          @dragenter.prevent="dragOver = true"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop="onDrop"
        >
          拖拽图片到此处，或使用上方「选择图片」
        </div>
        <p v-if="fileList.length" class="file-name mono">{{ fileList[0].name }}</p>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="orb" />
        <div class="scan-line" />
        <div class="grid" />
      </div>
    </div>

    <div v-if="!hasResult && previewUrl" class="panel preview-only">
      <img :src="previewUrl" alt="待推理预览" />
      <p>已载入采图，点击「开始计数」运行光照路由与计数管线。</p>
    </div>

    <div v-if="hasResult" class="result-grid">
      <article class="panel score">
        <p class="label">目标计数</p>
        <p class="value mono">{{ result!.count_rounded }}</p>
        <p class="sub">回归值 {{ result!.count }} · {{ result!.station }}</p>
        <div class="tags">
          <el-tag type="success">{{ routeLabel[result!.route_class] }}</el-tag>
          <el-tag>{{ branchLabel[result!.branch] }}</el-tag>
          <el-tag v-if="result!.mock" type="warning">框架 mock</el-tag>
        </div>
        <p class="note">{{ result!.note }}</p>
      </article>

      <article class="panel timing-panel">
        <h2>单帧耗时</h2>
        <TimingBars :timing="result!.timing" />
      </article>

      <article class="panel feature-panel">
        <h2>光照特征</h2>
        <FeatureMeters :features="result!.features" />
      </article>

      <article class="panel compare">
        <h2>校正前后对比</h2>
        <div class="compare-row">
          <figure>
            <img :src="result!.original_image" alt="原图" />
            <figcaption>原图</figcaption>
          </figure>
          <figure>
            <img :src="result!.corrected_image" alt="校正后" />
            <figcaption>校正后 · {{ branchLabel[result!.branch] }}</figcaption>
          </figure>
        </div>
      </article>

      <article class="panel density">
        <h2>密度热力叠加</h2>
        <img :src="result!.density_overlay" alt="密度叠加" />
      </article>
    </div>
  </section>
</template>

<style scoped>
.monitor {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.hero {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  min-height: 320px;
  overflow: hidden;
  position: relative;
}

.hero-copy {
  padding: 36px 40px;
  z-index: 1;
}

.eyebrow {
  margin: 0 0 10px;
  color: var(--accent);
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.78rem;
}

h1 {
  margin: 0;
  font-size: clamp(2.4rem, 5vw, 3.6rem);
  line-height: 1.05;
  color: var(--brand);
  letter-spacing: 0.02em;
}

.lead {
  margin: 14px 0 22px;
  max-width: 36rem;
  color: var(--ink-soft);
  line-height: 1.65;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.sample-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.sample-label {
  color: var(--muted);
  font-size: 0.85rem;
}

.sample-btn {
  appearance: none;
  border: 1px solid rgba(15, 61, 62, 0.18);
  background: #fff;
  color: var(--brand);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.sample-btn:hover:not(:disabled) {
  border-color: var(--accent);
  background: var(--accent-mist);
  transform: translateY(-1px);
}

.sample-btn.primary {
  background: var(--brand);
  border-color: var(--brand);
  color: #f0fdfa;
}

.sample-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.dropzone {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1.5px dashed rgba(15, 61, 62, 0.28);
  color: var(--ink-soft);
  background: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.dropzone:hover,
.dropzone.active {
  border-color: var(--accent);
  background: rgba(204, 251, 241, 0.45);
  transform: translateY(-1px);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.file-name {
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 0.85rem;
}

.hero-visual {
  position: relative;
  min-height: 280px;
  background:
    linear-gradient(160deg, rgba(15, 61, 62, 0.92), rgba(13, 148, 136, 0.75)),
    url("data:image/svg+xml,%3Csvg width='160' height='160' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 80h160M80 0v160' stroke='%2399f6e433' stroke-width='1'/%3E%3C/svg%3E");
}

.orb {
  position: absolute;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  right: 18%;
  top: 18%;
  background: radial-gradient(circle at 35% 35%, #f0fdfa, #2dd4bf 45%, transparent 70%);
  filter: blur(2px);
  animation: floaty 5s ease-in-out infinite;
}

.scan-line {
  position: absolute;
  inset: 12% 10%;
  border: 1px solid rgba(240, 253, 250, 0.35);
  border-radius: 18px;
  overflow: hidden;
}

.scan-line::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #99f6e4, transparent);
  animation: scan 2.8s linear infinite;
}

.grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(180deg, transparent, #000 30%, #000 70%, transparent);
}

.preview-only {
  padding: 18px;
  display: grid;
  gap: 12px;
  justify-items: start;
}

.preview-only img {
  width: min(420px, 100%);
  border-radius: 14px;
  border: 1px solid var(--line);
}

.result-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.score,
.timing-panel,
.feature-panel,
.compare,
.density {
  padding: 22px;
}

.score {
  background: linear-gradient(160deg, rgba(15, 61, 62, 0.96), rgba(20, 82, 85, 0.92));
  color: #ecfeff;
}

.score .label {
  margin: 0;
  opacity: 0.75;
}

.score .value {
  margin: 8px 0 0;
  font-size: 4rem;
  line-height: 1;
  font-weight: 600;
}

.score .sub,
.score .note {
  color: rgba(236, 254, 255, 0.78);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
}

h2 {
  margin: 0 0 14px;
  font-size: 1.05rem;
  color: var(--brand);
}

.compare-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

figure {
  margin: 0;
}

img {
  width: 100%;
  display: block;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: #0f172a;
}

figcaption {
  margin-top: 8px;
  color: var(--muted);
  font-size: 0.85rem;
}

.compare,
.density {
  grid-column: 1 / -1;
}

@keyframes floaty {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-12px);
  }
}

@keyframes scan {
  0% {
    top: 8%;
  }
  100% {
    top: 90%;
  }
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero-visual {
    min-height: 180px;
  }

  .result-grid,
  .compare-row {
    grid-template-columns: 1fr;
  }
}
</style>
