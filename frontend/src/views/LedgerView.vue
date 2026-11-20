<template>
  <section class="page">
    <div class="panel intro">
      <p class="eyebrow">巡检台账</p>
      <h1>记录与导出</h1>
      <p>
        列表字段对齐契约 <code class="mono">Record</code>（含 <code class="mono">route_class</code> 四类与
        <code class="mono">task_id</code>）。导出走 <code class="mono">/api/v1/records/export</code>。第 1 块为页面骨架。
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
