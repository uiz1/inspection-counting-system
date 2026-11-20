<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useSessionStore } from '@/stores/session'
import { useRobotStore } from '@/stores/robot'

const route = useRoute()
const session = useSessionStore()
const robot = useRobotStore()
const { status_label, demo_mode } = storeToRefs(session)

const nav = [
  { to: '/map', label: '态势地图' },
  { to: '/monitor', label: '实时计数' },
  { to: '/ledger', label: '巡检台账' },
  { to: '/system', label: '系统概览' },
]

const activePath = computed(() => {
  if (route.path === '/' || route.path.startsWith('/map')) return '/map'
  return route.path
})

onMounted(async () => {
  await session.refreshHealth()
  session.connectRealtime()
  robot.bindSocket()
})
</script>

<template>
  <div class="app-root">
    <header class="topbar">
      <div class="page-shell topbar-inner">
        <RouterLink class="brand" to="/map">
          <span class="brand-mark" aria-hidden="true">
            <span class="ring" />
            <span class="dot" />
          </span>
          <span class="brand-text">
            <strong>光巡计数</strong>
            <small>光照自适应 · 轻量密集计数</small>
          </span>
        </RouterLink>

        <nav class="nav">
          <RouterLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="nav-link"
            :class="{ active: activePath === item.to }"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="status mono" :class="{ demo: demo_mode, live: !demo_mode }">
          <span class="pulse" />
          {{ status_label }}
        </div>
      </div>
    </header>

    <main class="page-shell main">
      <RouterView />
    </main>

    <footer class="footer page-shell">
      <span>基于光照自适应预处理的巡检机器人目标计数系统</span>
      <span class="mono">contract v1.1.1 · framework</span>
    </footer>
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(16px);
  background: rgba(244, 247, 248, 0.82);
  border-bottom: 1px solid var(--line);
}

.topbar-inner {
  display: flex;
  align-items: center;
  gap: 24px;
  min-height: 72px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 220px;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(145deg, var(--brand), #1a6a6c);
  display: grid;
  place-items: center;
  position: relative;
  box-shadow: 0 10px 24px rgba(15, 61, 62, 0.28);
}

.ring {
  width: 18px;
  height: 18px;
  border: 2px solid #99f6e4;
  border-radius: 50%;
  animation: breathe 2.8s ease-in-out infinite;
}

.dot {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #f0fdfa;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-text strong {
  font-size: 1.2rem;
  letter-spacing: 0.04em;
  color: var(--brand);
}

.brand-text small {
  color: var(--muted);
  font-size: 0.78rem;
}

.nav {
  display: flex;
  gap: 8px;
  flex: 1;
}

.nav-link {
  padding: 8px 14px;
  border-radius: 999px;
  color: var(--ink-soft);
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.nav-link:hover {
  color: var(--brand);
  background: rgba(13, 148, 136, 0.08);
}

.nav-link.active {
  color: white;
  background: var(--brand);
  transform: translateY(-1px);
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(13, 148, 136, 0.1);
  color: var(--accent);
  font-size: 0.78rem;
  font-weight: 600;
}

.status.live {
  background: rgba(15, 61, 62, 0.1);
  color: var(--brand);
}

.status.demo {
  background: rgba(13, 148, 136, 0.1);
  color: var(--accent);
}

.pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: ping 1.8s infinite;
}

.main {
  flex: 1;
  padding: 28px 0 48px;
}

.footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 0 28px;
  color: var(--muted);
  font-size: 0.85rem;
  border-top: 1px solid var(--line);
}

@keyframes breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

@keyframes ping {
  0% {
    box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.45);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(13, 148, 136, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(13, 148, 136, 0);
  }
}

@media (max-width: 860px) {
  .topbar-inner {
    flex-wrap: wrap;
    padding: 12px 0;
    gap: 12px;
  }

  .nav {
    order: 3;
    width: 100%;
    overflow-x: auto;
  }

  .status {
    margin-left: auto;
  }

  .footer {
    flex-direction: column;
  }
}
</style>
