import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/data/villages.json', () => ({
  default: [
    { id: 'xiaozhuwan', name: '小朱湾村', fullName: '武汉市江夏区小朱湾村', type: '文旅基础', status: '样板',
      extra: { resources: [{ name: '荷塘民宿', type: '文旅' }], people: [{ name: '王大哥', role: '返乡青年' }], media: [{ type: 'photo' }, { type: 'video' }] } },
    { id: 'dayuwan', name: '大余湾村', fullName: '武汉市黄陂区大余湾村', type: '古村落', status: '候选',
      extra: { resources: [{ name: '古民居', type: '古建' }], people: [{ name: '余师傅', role: '匠人' }], media: [{ type: 'photo' }] } },
  ],
}))

// 可切换 query 的 useRoute mock
let currentQuery = {}
vi.mock('vue-router', () => ({ useRoute: () => ({ query: currentQuery }) }))

import RankingView from '@/modules/ranking/RankingView.vue'
import PeopleView from '@/modules/people/PeopleView.vue'
import MediaView from '@/modules/media/MediaView.vue'

const stubs = { 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } }

describe('模块按村筛选（索引 A）', () => {
  it('RankingView 无 query 显示全部村，带 village 只看该村', () => {
    currentQuery = {}
    let w = mount(RankingView, { global: { stubs } })
    expect(w.text()).toContain('小朱湾村')
    expect(w.text()).toContain('大余湾村')

    currentQuery = { village: 'xiaozhuwan' }
    w = mount(RankingView, { global: { stubs } })
    expect(w.text()).toContain('只看')
    expect(w.text()).toContain('荷塘民宿')      // 资源明细
    expect(w.text()).not.toContain('大余湾村')
  })

  it('PeopleView 带 village 只显示该村人物', () => {
    currentQuery = { village: 'xiaozhuwan' }
    const w = mount(PeopleView, { global: { stubs } })
    expect(w.text()).toContain('王大哥')
    expect(w.text()).not.toContain('余师傅')
  })

  it('MediaView 带 village 只显示该村', () => {
    currentQuery = { village: 'dayuwan' }
    const w = mount(MediaView, { global: { stubs } })
    expect(w.text()).toContain('大余湾村')
    expect(w.text()).not.toContain('小朱湾村')
  })
})
