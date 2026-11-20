import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          redirect: '/map',
        },
        {
          path: 'map',
          name: 'map',
          component: () => import('@/views/MapView.vue'),
          meta: { title: '态势地图' },
        },
        {
          path: 'monitor',
          name: 'monitor',
          component: () => import('@/views/MonitorView.vue'),
          meta: { title: '实时计数' },
        },
        {
          path: 'ledger',
          name: 'ledger',
          component: () => import('@/views/LedgerView.vue'),
          meta: { title: '巡检台账' },
        },
        {
          path: 'system',
          name: 'system',
          component: () => import('@/views/SystemView.vue'),
          meta: { title: '系统概览' },
        },
      ],
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const leaf = [...to.matched].reverse().find((r) => r.meta?.title)
  const title = (leaf?.meta.title as string) || '光巡计数'
  document.title = `${title} · 光巡计数`
})

export default router
