import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VillageInfoCard from '@/components/VillageInfoCard.vue'

const stubs = { 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } }

const village = {
  id: 'xiaozhuwan', name: '小朱湾村', fullName: '武汉市江夏区小朱湾村', type: '文旅基础', status: '样板试点', summary: '样板',
  extra: { resources: [{ name: 'r1' }, { name: 'r2' }], people: [{ name: 'p1' }], media: [{ type: 'photo' }, { type: 'video' }] },
}

describe('VillageInfoCard', () => {
  it('无选中村时显示提示', () => {
    const w = mount(VillageInfoCard, { props: { village: null }, global: { stubs } })
    expect(w.text()).toContain('点击地图上的')
  })

  it('有村时显示村名与三类资源计数', () => {
    const w = mount(VillageInfoCard, { props: { village }, global: { stubs } })
    expect(w.text()).toContain('小朱湾村')
    expect(w.text()).toContain('2 项')   // resources
    expect(w.text()).toContain('1 位')   // people
    expect(w.text()).toContain('1 图 / 1 视频')  // media
  })

  it('跳转链接带村庄 id 指向对应模块', () => {
    const w = mount(VillageInfoCard, { props: { village }, global: { stubs } })
    const hrefs = w.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/ranking?village=xiaozhuwan')
    expect(hrefs).toContain('/people?village=xiaozhuwan')
    expect(hrefs).toContain('/media?village=xiaozhuwan')
    expect(hrefs).toContain('/villages/xiaozhuwan')
  })
})
