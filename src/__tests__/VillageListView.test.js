import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// 组件已改为服务端按需拉取，mock API 层而非静态 JSON
const sampleVillages = [
  { id: 'chenjiapu', name: '陈家铺村', fullName: '浙江省丽水市松阳县四都乡陈家铺村', province: '浙江省', city: '丽水市', district: '松阳县', coord: [119, 28], honors: ['中国传统村落'], certLevel: 'township', certLabel: '乡镇团委认证', summary: '竹编之乡', cover: 'x.jpg', tags: { 文化类: ['非遗文化'] }, stats: { views: 100, favorites: 10, practices: 6 } },
  { id: 'xidi', name: '西递村', fullName: '安徽省黄山市黟县西递镇西递村', province: '安徽省', city: '黄山市', district: '黟县', coord: [117, 29], honors: ['世界文化遗产'], certLevel: 'province', certLabel: '省级认证', summary: '徽派典范', cover: 'y.jpg', tags: { 文化类: ['古建筑群'] }, stats: { views: 300, favorites: 5, practices: 5 } },
  { id: 'hongcun', name: '宏村', fullName: '安徽省黄山市黟县宏村镇宏村', province: '安徽省', city: '黄山市', district: '黟县', coord: [117, 30], honors: ['世界文化遗产'], certLevel: 'province', certLabel: '省级认证', summary: '画里乡村', cover: 'z.jpg', tags: { 自然类: ['山水画卷'] }, stats: { views: 200, favorites: 30, practices: 7 } },
]

const fetchAllMock = vi.fn()
vi.mock('@/api/villages.js', () => ({ fetchAllVillages: (...a) => fetchAllMock(...a) }))

let currentQuery = {}
vi.mock('vue-router', () => ({ useRoute: () => ({ query: currentQuery }) }))

import VillageListView from '@/modules/villages/VillageListView.vue'
const stubs = { 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } }

async function mountList() {
  const w = mount(VillageListView, { global: { stubs } })
  await flushPromises()
  return w
}

describe('VillageListView 目录检索', () => {
  beforeEach(() => {
    currentQuery = {}
    fetchAllMock.mockReset()
    fetchAllMock.mockResolvedValue(sampleVillages)
  })

  it('渲染全部村庄卡片与统计', async () => {
    const w = await mountList()
    expect(w.text()).toContain('乡村百科 —— 一村一页，读懂中国乡村')
    expect(w.text()).toContain('共 3 个乡村')
    expect(w.findAll('.grid .v-card')).toHaveLength(3)
  })

  it('关键词筛选只保留匹配项', async () => {
    const w = await mountList()
    await w.find('.search-bar input').setValue('竹编')
    expect(w.findAll('.grid .v-card')).toHaveLength(1)
    expect(w.text()).toContain('陈家铺村')
  })

  it('荣誉墙筛选生效', async () => {
    const w = await mountList()
    const chips = w.findAll('.honor-chip')
    const wh = chips.find((c) => c.text().includes('世界文化遗产'))
    await wh.trigger('click')
    expect(w.findAll('.grid .v-card')).toHaveLength(2)
  })

  it('从首页搜索带入 ?q= 关键词', async () => {
    currentQuery = { q: '画里' }
    const w = await mountList()
    expect(w.findAll('.grid .v-card')).toHaveLength(1)
    expect(w.text()).toContain('宏村')
  })
})
