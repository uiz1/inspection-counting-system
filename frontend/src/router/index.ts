import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'monitor',
      component: () => import('@/views/MonitorView.vue'),
      meta: { title: '实时计数' },
    },
    {
      path: '/ledger',
      name: 'ledger',
      component: () => import('@/views/LedgerView.vue'),
      meta: { title: '巡检台账' },
    },
    {
      path: '/system',
      name: 'system',
      component: () => import('@/views/SystemView.vue'),
      meta: { title: '系统概览' },
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const title = (to.meta.title as string) || '光巡计数'
  document.title = `${title} · 光巡计数`
})

export default router
