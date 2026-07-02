import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/components/ChinaMap3D.vue', () => ({
  default: { name: 'ChinaMap3D', template: '<div class="map-stub" />' },
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
  it('只渲染 enabled=true 的模块卡', () => {
    const w = mount(HomeView, { global: { stubs } })
    expect(w.text()).toContain('村庄主页')
    expect(w.text()).not.toContain('资源榜单')
  })
})
