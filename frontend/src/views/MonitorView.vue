<script setup lang="ts">
</script>

<template>
  <section class="page">
    <div class="panel intro">
      <p class="eyebrow">实时计数</p>
      <h1>单帧推理监控</h1>
      <p>
        本页将承接上传/样例采图、光照路由（含 <code class="mono">mixed</code>）、校正对比、密度叠加与耗时瀑布。
        第 1 块仅完成路由占位；推理联调见后续分块。
      </p>
    </div>
  </section>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
}

.intro {
  padding: 28px 32px;
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
  margin: 0 0 12px;
  color: var(--brand);
}

p {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.65;
  max-width: 42rem;
}
</style>
