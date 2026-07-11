import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

// 自动收集所有模块的路由定义：src/modules/<id>/routes.js 需默认导出路由数组
const moduleRouteFiles = import.meta.glob('../modules/*/routes.js', { eager: true })
const moduleRoutes = Object.values(moduleRouteFiles).flatMap((mod) => mod.default || [])

const routes = [
  { path: '/', name: 'home', component: HomeView },
  ...moduleRoutes,
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition || { top: 0, left: 0 }
  },
})
