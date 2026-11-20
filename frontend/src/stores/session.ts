import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchHealth } from '@/api/health'
import type { HealthInfo } from '@/types'
import { robotSocket } from '@/ws/socket'

export const useSessionStore = defineStore('session', () => {
  const health = ref<HealthInfo | null>(null)
  const api_online = ref(false)
  const ws_status = ref(robotSocket.connection_status)
  const demo_mode = ref(true)

  const status_label = computed(() => {
    if (api_online.value && health.value) {
      return health.value.mode === 'mock' ? '演示数据 · mock' : `实时 · ${health.value.mode}`
    }
    return '演示数据'
  })

  async function refreshHealth() {
    try {
      health.value = await fetchHealth()
      api_online.value = health.value.status === 'ok' || health.value.status === 'degraded'
      demo_mode.value = health.value.mode === 'mock' || !health.value.robot_online
    } catch {
      api_online.value = false
      health.value = null
      demo_mode.value = true
    }
  }

  function connectRealtime() {
    robotSocket.connect()
    ws_status.value = robotSocket.connection_status
    const tick = () => {
      ws_status.value = robotSocket.connection_status
    }
    robotSocket.onMessage(tick)
    setInterval(tick, 1000)
  }

  return {
    health,
    api_online,
    ws_status,
    demo_mode,
    status_label,
    refreshHealth,
    connectRealtime,
  }
})
