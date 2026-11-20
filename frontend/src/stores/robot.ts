import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Path, RobotPose, RobotStatus, Station, WsEnvelope } from '@/types'
import {
  MOCK_PLANNED_PATH,
  MOCK_POSE,
  MOCK_STATIONS,
  MOCK_STATUS,
  MOCK_TRAVELED_PATH,
} from '@/mock/scenario'
import { robotSocket } from '@/ws/socket'

export const useRobotStore = defineStore('robot', () => {
  const live_pose = ref<RobotPose | null>(null)
  const live_status = ref<RobotStatus | null>(null)
  const live_planned = ref<Path | null>(null)
  const live_traveled = ref<Path | null>(null)
  const live_stations = ref<Station[] | null>(null)
  const follow = ref(true)
  const using_demo = ref(true)

  const pose = computed(() => live_pose.value ?? MOCK_POSE)
  const status = computed(() => live_status.value ?? MOCK_STATUS)
  const planned_path = computed(() => live_planned.value ?? MOCK_PLANNED_PATH)
  const traveled_path = computed(() => live_traveled.value ?? MOCK_TRAVELED_PATH)
  const stations = computed(() => live_stations.value ?? MOCK_STATIONS)

  function refreshDemoFlag() {
    using_demo.value = !(
      live_pose.value ||
      live_status.value ||
      live_planned.value ||
      live_traveled.value
    )
  }

  function bindSocket() {
    robotSocket.onMessage((msg: WsEnvelope) => {
      switch (msg.event) {
        case 'robot.pose':
          live_pose.value = msg.data as RobotPose
          break
        case 'robot.status': {
          const st = msg.data as RobotStatus
          // 骨架消息 online=false 时仍用演示态，避免空界面
          if (st.online) live_status.value = st
          break
        }
        case 'path.planned':
          live_planned.value = msg.data as Path
          break
        case 'path.traveled': {
          const data = msg.data as Path | { x: number; y: number; stamp?: string }[]
          if (Array.isArray(data)) {
            if (!live_traveled.value) {
              live_traveled.value = {
                id: 'traveled-live',
                kind: 'traveled',
                points: data,
                task_id: null,
              }
            } else {
              live_traveled.value = {
                ...live_traveled.value,
                points: [...live_traveled.value.points, ...data],
              }
            }
          } else {
            live_traveled.value = data
          }
          break
        }
        default:
          break
      }
      refreshDemoFlag()
    })
    refreshDemoFlag()
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
    stations,
    follow,
    using_demo,
    bindSocket,
    setFollow,
  }
})
