import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PreviewComponent from '@/modules/builder/editor/preview/PreviewComponent.vue'

const Map3DStub = { props: ['component', 'mode'], template: '<div class="m3d-stub">Map3D</div>' }

vi.mock('@/modules/builder/editor/chartRenderer.js', () => ({
  renderChartSvg: vi.fn(() => '<svg class="chart-svg"></svg>'),
}))
vi.mock('@/modules/builder/editor/sensorRenderer.js', () => ({
  renderSensorMarkup: vi.fn(() => '<div class="sensor-markup">sensor</div>'),
}))
vi.mock('@/modules/builder/editor/timelineRenderer.js', () => ({
  renderTimelineMarkup: vi.fn(() => '<div class="timeline-markup">timeline</div>'),
}))
vi.mock('@/modules/builder/editor/datatableRenderer.js', () => ({
  renderDatatableMarkup: vi.fn(() => '<table class="datatable-markup"></table>'),
}))
vi.mock('@/modules/builder/editor/layoutBoxEngine.js', () => ({
  calcLayoutSlots: vi.fn(() => []),
}))

function makeComponent(type, overrides = {}) {
  return {
    type,
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    props: {},
    ...overrides,
  }
}

describe('PreviewComponent', () => {
  it('text 类型渲染文本 div', () => {
    const comp = makeComponent('text', { props: { text: 'Hello', fontSize: 16, color: '#333', fontWeight: 'bold', textAlign: 'left', backgroundColor: '#fff' } })
    const w = mount(PreviewComponent, { props: { component: comp }, global: { stubs: { Map3DComponent: Map3DStub } } })
    expect(w.text()).toContain('Hello')
    const div = w.find('.preview-text')
    expect(div.exists()).toBe(true)
    expect(div.attributes('style')).toContain('font-size: 16px')
  })

  it('image 有 src 时渲染 img', () => {
    const comp = makeComponent('image', { props: { src: 'http://example.com/a.jpg', alt: 'pic', objectFit: 'cover', borderRadius: 8 } })
    const w = mount(PreviewComponent, { props: { component: comp }, global: { stubs: { Map3DComponent: Map3DStub } } })
    const img = w.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('http://example.com/a.jpg')
  })

  it('image 无 src 时显示占位', () => {
    const comp = makeComponent('image', { props: {} })
    const w = mount(PreviewComponent, { props: { component: comp }, global: { stubs: { Map3DComponent: Map3DStub } } })
    expect(w.text()).toContain('图片占位')
  })

  it('chart 类型通过 v-html 渲染 chart SVG', () => {
    const comp = makeComponent('chart')
    const w = mount(PreviewComponent, { props: { component: comp }, global: { stubs: { Map3DComponent: Map3DStub } } })
    expect(w.html()).toContain('chart-svg')
  })

  it('agri-sensor 类型通过 v-html 渲染 sensor markup', () => {
    const comp = makeComponent('agri-sensor')
    const w = mount(PreviewComponent, { props: { component: comp }, global: { stubs: { Map3DComponent: Map3DStub } } })
    expect(w.html()).toContain('sensor-markup')
  })

  it('timeline 类型通过 v-html 渲染 timeline markup', () => {
    const comp = makeComponent('timeline')
    const w = mount(PreviewComponent, { props: { component: comp }, global: { stubs: { Map3DComponent: Map3DStub } } })
    expect(w.html()).toContain('timeline-markup')
  })

  it('datatable 类型通过 v-html 渲染 datatable markup', () => {
    const comp = makeComponent('datatable')
    const w = mount(PreviewComponent, { props: { component: comp }, global: { stubs: { Map3DComponent: Map3DStub } } })
    expect(w.html()).toContain('datatable-markup')
  })

  it('map-3d 类型渲染 Map3DComponent mode=preview', () => {
    const comp = makeComponent('map-3d', { props: { centerLng: 100, centerLat: 23 } })
    const w = mount(PreviewComponent, { props: { component: comp, allowMap3d: true }, global: { stubs: { Map3DComponent: Map3DStub } } })
    expect(w.find('.m3d-stub').exists()).toBe(true)
  })

  it('map-3d 类型 allowMap3d=false 时显示实例超限占位', () => {
    const comp = makeComponent('map-3d', { props: { centerLng: 100, centerLat: 23 } })
    const w = mount(PreviewComponent, { props: { component: comp, allowMap3d: false }, global: { stubs: { Map3DComponent: Map3DStub } } })
    expect(w.text()).toContain('实例超限，单页最多 4 个 3D 地图')
    expect(w.find('.m3d-stub').exists()).toBe(false)
  })

  it('flow-box 渲染 slides 和 dots', () => {
    const comp = makeComponent('flow-box', {
      width: 400,
      height: 300,
      props: {
        children: [
          { type: 'text', props: { text: 'Slide 1', fontSize: 14, color: '#333', fontWeight: 'normal', textAlign: 'left', backgroundColor: 'transparent' } },
          { type: 'text', props: { text: 'Slide 2', fontSize: 14, color: '#333', fontWeight: 'normal', textAlign: 'left', backgroundColor: 'transparent' } },
        ],
        activeIndex: 0,
        autoPlay: false,
        interval: 5,
        animationDuration: 400,
      },
    })
    const w = mount(PreviewComponent, { props: { component: comp, allowMap3d: true }, global: { stubs: { Map3DComponent: Map3DStub } } })
    expect(w.text()).toContain('Slide 1')
    expect(w.text()).toContain('Slide 2')
    const dots = w.findAll('.fb-dot')
    expect(dots).toHaveLength(2)
  })
})
