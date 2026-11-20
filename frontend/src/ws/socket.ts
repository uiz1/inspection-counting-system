import type { WsEnvelope } from '@/types'

type Handler = (msg: WsEnvelope) => void

function buildWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws/v1`
}

/**
 * 契约 §6：唯一端点 /ws/v1；信封 {event,ts,data}；
 * 断线指数退避 1s→2s→…→30s；25s 心跳 ping。
 */
class RobotSocket {
  private socket: WebSocket | null = null
  private handlers = new Set<Handler>()
  private reconnectMs = 1000
  private closedByUser = false
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private status: 'idle' | 'connecting' | 'open' | 'closed' = 'idle'

  get connection_status() {
    return this.status
  }

  connect() {
    this.closedByUser = false
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return
    }
    this.status = 'connecting'
    const ws = new WebSocket(buildWsUrl())
    this.socket = ws

    ws.onopen = () => {
      this.status = 'open'
      this.reconnectMs = 1000
      this.startHeartbeat()
      this.send({ event: 'subscribe', data: { topics: ['robot.*', 'path.*', 'counting.*', 'alert'] } })
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as WsEnvelope
        if (!msg || typeof msg.event !== 'string') return
        this.handlers.forEach((h) => h(msg))
      } catch {
        // ignore malformed
      }
    }

    ws.onclose = () => {
      this.status = 'closed'
      this.stopHeartbeat()
      this.socket = null
      if (!this.closedByUser) this.scheduleReconnect()
    }

    ws.onerror = () => {
      // onclose will follow
    }
  }

  disconnect() {
    this.closedByUser = true
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.socket?.close()
    this.socket = null
    this.status = 'closed'
  }

  onMessage(handler: Handler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  send(partial: { event: string; data: unknown }) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    const payload: WsEnvelope = {
      event: partial.event,
      ts: new Date().toISOString(),
      data: partial.data,
    }
    this.socket.send(JSON.stringify(payload))
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this.send({ event: 'ping', data: {} })
    }, 25000)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    const delay = this.reconnectMs
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectMs = Math.min(this.reconnectMs * 2, 30000)
      this.connect()
    }, delay)
  }
}

export const robotSocket = new RobotSocket()
