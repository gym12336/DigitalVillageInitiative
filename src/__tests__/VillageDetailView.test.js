import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/data/villages.json', () => ({
  default: [
    { id: 'xiaozhuwan', name: '小朱湾村', fullName: '武汉市江夏区小朱湾村', type: '文旅基础', status: '样板试点', summary: '样板', extra: { history: [], people: ['张三'], resources: [], media: [], route: [], outcomes: [] } },
  ],
}))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: 'xiaozhuwan' } }) }))

import VillageDetailView from '@/modules/villages/VillageDetailView.vue'
const stubs = { 'router-link': { template: '<a><slot /></a>' } }

describe('VillageDetailView 村庄主页', () => {
  it('渲染核心字段', () => {
    const w = mount(VillageDetailView, { global: { stubs } })
    expect(w.text()).toContain('小朱湾村')
    expect(w.text()).toContain('武汉市江夏区小朱湾村')
  })
  it('空 extra 栏目显示占位，非空显示内容', () => {
    const w = mount(VillageDetailView, { global: { stubs } })
    expect(w.text()).toContain('张三')
    expect(w.text()).toContain('待实地采集补充')
  })
})
