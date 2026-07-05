import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const setOption = vi.fn()
const on = vi.fn()
const dispose = vi.fn()
vi.mock('echarts', () => ({
  init: vi.fn(() => ({ setOption, on, dispose, resize: vi.fn() })),
  registerMap: vi.fn(),
}))

vi.mock('@/lib/geoLoader.js', () => ({
  createGeoLoader: () => ({
    load: vi.fn().mockResolvedValue({ type: 'FeatureCollection', features: [] }),
    urlFor: (a) => a,
  }),
}))

import ChinaMap2D from '@/components/ChinaMap2D.vue'

const villages = [
  { id: 'xiaozhuwan', name: '小朱湾村', province: '湖北省', city: '武汉市', district: '江夏区', adcode: '420115', coord: [114.32, 30.34] },
]

function mountMap() {
  return mount(ChinaMap2D, {
    props: { villages },
    global: { stubs: { teleport: true } },
  })
}

describe('ChinaMap2D', () => {
  beforeEach(() => { setOption.mockClear(); on.mockClear() })

  it('初始渲染面包屑为「全国」', async () => {
    const w = mountMap()
    await w.vm.$nextTick()
    expect(w.text()).toContain('全国')
  })

  it('点击村庄散点 emit select-village 带村庄 id', async () => {
    const w = mountMap()
    await w.vm.$nextTick()
    w.vm.handleVillageClick({ data: { id: 'xiaozhuwan' } })
    expect(w.emitted()['select-village'][0]).toEqual(['xiaozhuwan'])
  })

  it('goToDepth 回退后面包屑收缩', async () => {
    const w = mountMap()
    await w.vm.$nextTick()
    await w.vm.enterRegion({ adcode: '420000', name: '湖北省' })
    expect(w.text()).toContain('湖北省')
    await w.vm.goToDepth(0)
    expect(w.text()).not.toContain('湖北省')
  })
})
