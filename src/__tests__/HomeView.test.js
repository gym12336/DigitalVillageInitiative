import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/components/ChinaMap2D.vue', () => ({
  default: { name: 'ChinaMap2D', template: '<div class="map-stub" />' },
}))
vi.mock('@/components/MapDashboardStats.vue', () => ({
  default: { name: 'MapDashboardStats', template: '<div class="stats-stub" />' },
}))
vi.mock('@/components/VillageInfoCard.vue', () => ({
  default: { name: 'VillageInfoCard', template: '<div class="info-stub" />' },
}))
vi.mock('@/modules.config.js', () => ({
  modules: [
    { id: 'villages', name: '村庄主页', icon: '🏘️', path: '/villages', enabled: true, desc: 'x' },
    { id: 'ranking', name: '资源榜单', icon: '🏆', path: '/ranking', enabled: false, desc: 'y' },
  ],
}))
vi.mock('@/data/villages.json', () => ({ default: [] }))

import HomeView from '@/views/HomeView.vue'

const stubs = { 'router-link': { template: '<a><slot /></a>' } }

describe('HomeView 首页中枢', () => {
  it('渲染大屏三栏（统计 + 地图 + 信息卡）', () => {
    const w = mount(HomeView, { global: { stubs } })
    expect(w.find('.stats-stub').exists()).toBe(true)
    expect(w.find('.map-stub').exists()).toBe(true)
    expect(w.find('.info-stub').exists()).toBe(true)
  })

  it('只渲染已启用的模块卡，不展示未启用模块', () => {
    const w = mount(HomeView, { global: { stubs } })
    expect(w.text()).toContain('村庄主页')
    expect(w.text()).not.toContain('资源榜单')
  })

  it('渲染英雄区标语与数据看板', () => {
    const w = mount(HomeView, { global: { stubs } })
    expect(w.text()).toContain('让乡村被看见')
    expect(w.text()).toContain('已入驻乡村')
  })
})
