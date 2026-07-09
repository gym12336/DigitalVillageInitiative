import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// 三个模块页已改为服务端按需拉取，mock API 层。数据用当前 shape（manager/specialties/gallery）。
const sampleVillages = [
  {
    id: 'xiaozhuwan', name: '小朱湾村', fullName: '武汉市江夏区小朱湾村',
    province: '湖北省', city: '武汉市', district: '江夏区', certLabel: '文旅基础', honors: ['样板村'],
    manager: { name: '王大哥', role: '返乡青年' },
    specialties: [{ name: '荷塘民宿', icon: '🏠', description: '临荷而居' }],
    gallery: ['a.jpg', 'b.jpg'],
  },
  {
    id: 'dayuwan', name: '大余湾村', fullName: '武汉市黄陂区大余湾村',
    province: '湖北省', city: '武汉市', district: '黄陂区', certLabel: '古村落', honors: ['中国传统村落'],
    manager: { name: '余师傅', role: '匠人' },
    specialties: [{ name: '古民居', icon: '🏛️', description: '明清建筑' }],
    gallery: ['c.jpg'],
  },
]

const fetchAllMock = vi.fn()
vi.mock('@/api/villages.js', () => ({ fetchAllVillages: (...a) => fetchAllMock(...a) }))

// 可切换 query 的 useRoute mock
let currentQuery = {}
vi.mock('vue-router', () => ({ useRoute: () => ({ query: currentQuery }) }))

import RankingView from '@/modules/ranking/RankingView.vue'
import PeopleView from '@/modules/people/PeopleView.vue'
import MediaView from '@/modules/media/MediaView.vue'

const stubs = { 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } }

async function mountView(Comp) {
  const w = mount(Comp, { global: { stubs } })
  await flushPromises()
  return w
}

describe('模块按村筛选（索引 A）', () => {
  beforeEach(() => {
    fetchAllMock.mockReset()
    fetchAllMock.mockResolvedValue(sampleVillages)
  })

  it('RankingView 无 query 显示全部村，带 village 只看该村', async () => {
    currentQuery = {}
    let w = await mountView(RankingView)
    expect(w.text()).toContain('小朱湾村')
    expect(w.text()).toContain('大余湾村')

    currentQuery = { village: 'xiaozhuwan' }
    w = await mountView(RankingView)
    expect(w.text()).toContain('只看')
    expect(w.text()).toContain('荷塘民宿')      // 资源明细
    expect(w.text()).not.toContain('大余湾村')
  })

  it('PeopleView 带 village 只显示该村人物', async () => {
    currentQuery = { village: 'xiaozhuwan' }
    const w = await mountView(PeopleView)
    expect(w.text()).toContain('王大哥')
    expect(w.text()).not.toContain('余师傅')
  })

  it('MediaView 带 village 只显示该村', async () => {
    currentQuery = { village: 'dayuwan' }
    const w = await mountView(MediaView)
    expect(w.text()).toContain('大余湾村')
    expect(w.text()).not.toContain('小朱湾村')
  })
})
