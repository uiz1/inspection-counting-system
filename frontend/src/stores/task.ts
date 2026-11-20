import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { CountingResult, Task } from '@/types'
import { MOCK_LATEST_COUNT, MOCK_TASK } from '@/mock/scenario'

export const useTaskStore = defineStore('task', () => {
  const live_current = ref<Task | null>(null)
  const live_list = ref<Task[] | null>(null)
  const live_latest_count = ref<CountingResult | null>(null)

  const current = computed(() => live_current.value ?? MOCK_TASK)
  const list = computed(() => live_list.value ?? [MOCK_TASK])
  const latest_count = computed(() => live_latest_count.value ?? MOCK_LATEST_COUNT)
  const using_demo = computed(() => !live_current.value && !live_latest_count.value)

  function setCurrent(task: Task | null) {
    live_current.value = task
  }

  function setList(tasks: Task[]) {
    live_list.value = tasks
  }

  function setLatestCount(result: CountingResult | null) {
    live_latest_count.value = result
  }

  return {
    current,
    list,
    latest_count,
    using_demo,
    setCurrent,
    setList,
    setLatestCount,
  }
})
