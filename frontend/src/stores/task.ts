import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Task } from '@/types'

export const useTaskStore = defineStore('task', () => {
  const current = ref<Task | null>(null)
  const list = ref<Task[]>([])

  function setCurrent(task: Task | null) {
    current.value = task
  }

  function setList(tasks: Task[]) {
    list.value = tasks
  }

  return { current, list, setCurrent, setList }
})
