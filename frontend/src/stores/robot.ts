import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Path, RobotPose, RobotStatus, WsEnvelope } from '@/types'
import { robotSocket } from '@/ws/socket'

export const useRobotStore = defineStore('robot', () => {
  const pose = ref<RobotPose | null>(null)
  const status = ref<RobotStatus | null>(null)
  const planned_path = ref<Path | null>(null)
  const traveled_path = ref<Path | null>(null)
  const follow = ref(true)

  function bindSocket() {
    robotSocket.onMessage((msg: WsEnvelope) => {
      switch (msg.event) {
        case 'robot.pose':
          pose.value = msg.data as RobotPose
          break
        case 'robot.status':
          status.value = msg.data as RobotStatus
          break
        case 'path.planned':
          planned_path.value = msg.data as Path
          break
        case 'path.traveled': {
          const data = msg.data as Path | { x: number; y: number; stamp?: string }[]
          if (Array.isArray(data)) {
            if (!traveled_path.value) {
              traveled_path.value = {
                id: 'traveled-live',
                kind: 'traveled',
                points: data,
                task_id: null,
              }
            } else {
              traveled_path.value = {
                ...traveled_path.value,
                points: [...traveled_path.value.points, ...data],
              }
            }
          } else {
            traveled_path.value = data
          }
          break
        }
        default:
          break
      }
    })
  }

  function setFollow(value: boolean) {
    follow.value = value
    robotSocket.send({ event: 'map.viewport', data: { follow: value } })
  }

  return {
    pose,
    status,
    planned_path,
    traveled_path,
    follow,
    bindSocket,
    setFollow,
  }
})
