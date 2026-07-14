import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ query: {} })),
  useRouter: vi.fn(() => ({})),
}))

vi.mock('@/modules/builder/editor/preview/PreviewComponent.vue', () => ({
  default: { props: ['component', 'allowMap3d'], template: '<div class="pc-stub">{{ component.type }}</div>' },
}))

import PreviewStage from '@/modules/builder/editor/preview/PreviewStage.vue'
import PreviewComponent from '@/modules/builder/editor/preview/PreviewComponent.vue'
import { useRoute } from 'vue-router'

function setRouteQuery(query) {
  useRoute.mockReturnValue({ query })
}

function makeState(components) {
  return { pageWidth: 1200, pageHeight: 800, pageBackground: '#fff', components }
}

describe('PreviewStage', () => {
  beforeEach(() => {
    window.opener = null
    useRoute.mockReturnValue({ query: {} })
  })

  it('opener 为 null 时显示失效文案', async () => {
    setRouteQuery({ id: 'test-id' })
    const w = mount(PreviewStage)
    await nextTick()
    expect(w.text()).toContain('预览已失效，请回到编辑器重新预览')
  })

  it('route.query.id 缺失时显示失效文案', async () => {
    setRouteQuery({})
    window.opener = { __previewState: { 'test-id': makeState([]) } }
    const w = mount(PreviewStage)
    await nextTick()
    expect(w.text()).toContain('预览已失效')
  })

  it('__previewState[id] 不存在时显示失效文案', async () => {
    setRouteQuery({ id: 'missing' })
    window.opener = { __previewState: { 'other-id': makeState([]) } }
    const w = mount(PreviewStage)
    await nextTick()
    expect(w.text()).toContain('预览已失效')
  })

  it('state.components 非数组时显示数据异常', async () => {
    setRouteQuery({ id: 't1' })
    window.opener = { __previewState: { t1: { pageWidth: 1200, pageHeight: 800, pageBackground: '#fff', components: 'bad' } } }
    const w = mount(PreviewStage)
    await nextTick()
    expect(w.text()).toContain('预览数据异常')
  })

  it('正常路径 state 正确读取后 __previewState[id] 被 delete', async () => {
    const s = makeState([{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: { text: 'A' } }])
    const store = { t1: s }
    setRouteQuery({ id: 't1' })
    window.opener = { __previewState: store }
    const w = mount(PreviewStage)
    await nextTick()
    expect(w.find('.stage').exists()).toBe(true)
    expect(w.text()).toContain('text')
    expect(store.t1).toBeUndefined()
  })

  it('5 个 map-3d → 前 4 个 allowMap3d=true, 第 5 个 allowMap3d=false', async () => {
    const maps = Array.from({ length: 5 }, (_, i) => ({
      type: 'map-3d',
      x: 0, y: i * 100,
      width: 400, height: 80,
      props: { centerLng: 100, centerLat: 23 },
    }))
    const store = { t2: makeState(maps) }
    setRouteQuery({ id: 't2' })
    window.opener = { __previewState: store }
    const w = mount(PreviewStage)
    await nextTick()
    const stubs = w.findAllComponents(PreviewComponent)
    expect(stubs).toHaveLength(5)
    expect(stubs[0].props('allowMap3d')).toBe(true)
    expect(stubs[1].props('allowMap3d')).toBe(true)
    expect(stubs[2].props('allowMap3d')).toBe(true)
    expect(stubs[3].props('allowMap3d')).toBe(true)
    expect(stubs[4].props('allowMap3d')).toBe(false)
  })

  it('pageWidth/pageHeight/pageBackground 正确应用到 stage style', async () => {
    const s = makeState([{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: { text: 'A' } }])
    s.pageWidth = 800
    s.pageHeight = 600
    s.pageBackground = '#f0f0f0'
    const store = { t3: s }
    setRouteQuery({ id: 't3' })
    window.opener = { __previewState: store }
    const w = mount(PreviewStage)
    await nextTick()
    const stage = w.find('.stage')
    expect(stage.attributes('style')).toContain('width: 800px')
    expect(stage.attributes('style')).toContain('height: 600px')
    expect(stage.attributes('style')).toContain('background: rgb(240, 240, 240)')
  })
})
