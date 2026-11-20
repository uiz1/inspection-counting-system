import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchHealth } from '@/api/health'
import type { HealthInfo } from '@/types'
import { robotSocket } from '@/ws/socket'

export const useSessionStore = defineStore('session', () => {
  const health = ref<HealthInfo | null>(null)
  const api_online = ref(false)
  const ws_status = ref(robotSocket.connection_status)
  const last_error = ref('')

  async function refreshHealth() {
    try {
      health.value = await fetchHealth()
      api_online.value = health.value.status === 'ok' || health.value.status === 'degraded'
      last_error.value = ''
    } catch (err) {
      api_online.value = false
      health.value = null
      last_error.value = err instanceof Error ? err.message : 'health failed'
    }
  }

  function connectRealtime() {
    robotSocket.connect()
    ws_status.value = robotSocket.connection_status
    robotSocket.onMessage(() => {
      ws_status.value = robotSocket.connection_status
    })
  }

  return {
    health,
    api_online,
    ws_status,
    last_error,
    refreshHealth,
    connectRealtime,
  }
})
