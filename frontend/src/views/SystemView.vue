<script setup lang="ts">
const modules = [
  {
    title: '巡检采图平台',
    status: '框架预留',
    desc: 'ROS2 Humble + Nav2 + 二维激光 SLAM，多工位巡航与定点采图；视觉推理下沉到独立边缘节点。',
  },
  {
    title: '异构光照动态路由',
    status: '已接通',
    desc: '提取 L_mean / r_dark / r_sat / L_std / a_glare，路由至 normal / low / high 三分支。',
  },
  {
    title: '三分支预处理',
    status: '近似实现',
    desc: '直通 · Zero-DCE++ 近似 · 高光抑制+CLAHE。后续可替换正式网络权重。',
  },
  {
    title: '轻量密度计数',
    status: '占位演示',
    desc: '当前为纹理响应伪密度图；正式阶段接入 MobileCount（≤1M）ONNX。',
  },
  {
    title: 'Web 监控终端',
    status: '已交付',
    desc: 'FastAPI + Vue 3 + Element Plus：校正对比、计数、耗时瀑布、台账导出。',
  },
]
</script>

<template>
  <section class="system">
    <div class="panel intro">
      <h1>系统概览</h1>
      <p>
        本仓库为毕业设计「基于光照自适应预处理的巡检机器人目标计数系统」的整体框架与前端监控终端。
        算法核心以可运行占位实现打通链路，后续分块替换为正式模型与 ROS2 联调。
      </p>
    </div>

    <div class="modules">
      <article v-for="m in modules" :key="m.title" class="panel module">
        <div class="module-head">
          <h2>{{ m.title }}</h2>
          <el-tag>{{ m.status }}</el-tag>
        </div>
        <p>{{ m.desc }}</p>
      </article>
    </div>

    <div class="panel stack">
      <h2>推荐本地启动</h2>
      <ol>
        <li>后端：<code class="mono">./scripts/dev-backend.sh</code></li>
        <li>前端：<code class="mono">./scripts/dev-frontend.sh</code></li>
        <li>打开监控页上传工位采图，查看路由、校正对比与计数结果。</li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.system {
  display: grid;
  gap: 18px;
}

.intro,
.module,
.stack {
  padding: 24px 28px;
}

h1,
h2 {
  margin: 0 0 10px;
  color: var(--brand);
}

p {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.65;
}

.modules {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.module-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}

.module-head h2 {
  margin: 0;
  font-size: 1.05rem;
}

ol {
  margin: 0;
  padding-left: 18px;
  color: var(--ink-soft);
  line-height: 1.9;
}

code {
  display: inline-block;
  margin-top: 4px;
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(15, 61, 62, 0.08);
  font-size: 0.82rem;
}

@media (max-width: 800px) {
  .modules {
    grid-template-columns: 1fr;
  }
}
</style>
