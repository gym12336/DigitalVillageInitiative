import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/data/encyclopedia-villages.json', () => ({
  default: [
    {
      id: 'chenjiapu', name: '陈家铺村', fullName: '浙江省丽水市松阳县四都乡陈家铺村',
      province: '浙江省', city: '丽水市', district: '松阳县', town: '四都乡', coord: [119, 28],
      honors: ['中国传统村落'], certLevel: 'township', certLabel: '乡镇团委认证',
      manager: { name: '王村长', role: '村委会主任' },
      socials: { wechat: true, douyin: true, kuaishou: false, xiaohongshu: true, bilibili: false, gzh: true },
      tags: { 文化类: ['非遗文化', '传统技艺'], 自然类: ['高山云海'] },
      summary: '竹编之乡', intro: '陈家铺村是一座悬崖上的古村落，以非遗竹编闻名。',
      gallery: ['a.jpg', 'b.jpg'], cover: 'a.jpg',
      guide: [{ name: '陈氏宗祠', note: '宗族文化核心' }, { name: '观景平台', note: '俯瞰云海' }],
      stats: { views: 100, favorites: 10, practices: 6 },
    },
  ],
}))
vi.mock('@/modules/practice/practice-data.json', () => ({
  default: { results: [{ id: 'r1', title: '竹编调研', school: '浙江大学', village: '陈家铺村', cover: 'c.jpg' }] },
}))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: 'chenjiapu' } }) }))

import VillageDetailView from '@/modules/villages/VillageDetailView.vue'
const stubs = { 'router-link': { template: '<a><slot /></a>' }, teleport: true }

describe('VillageDetailView 村庄详情', () => {
  it('渲染村名、行政区、荣誉徽章', () => {
    const w = mount(VillageDetailView, { global: { stubs } })
    expect(w.text()).toContain('陈家铺村')
    expect(w.text()).toContain('浙江省 · 丽水市 · 松阳县 · 四都乡')
    expect(w.text()).toContain('中国传统村落')
  })
  it('渲染认证、负责人、六大类标签、详述、导览点位', () => {
    const w = mount(VillageDetailView, { global: { stubs } })
    expect(w.text()).toContain('乡镇团委认证')
    expect(w.text()).toContain('王村长')
    expect(w.text()).toContain('文化类')
    expect(w.text()).toContain('非遗竹编闻名')
    expect(w.findAll('.guide li')).toHaveLength(2)
  })
  it('展示该村匹配的实践成果', () => {
    const w = mount(VillageDetailView, { global: { stubs } })
    expect(w.text()).toContain('竹编调研')
    expect(w.findAll('.res-card')).toHaveLength(1)
  })
  it('社交平台按关联状态区分', () => {
    const w = mount(VillageDetailView, { global: { stubs } })
    expect(w.findAll('.social')).toHaveLength(6)
    expect(w.findAll('.social.off').length).toBe(2)
  })
})
