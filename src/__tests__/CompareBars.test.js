import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CompareBars from '@/modules/practice/mine/CompareBars.vue'

describe('CompareBars', () => {
  it('renders comparison bars for each item', () => {
    const items = [
      { name: '月销量', before: 300, after: 420, unit: '件', beforePct: 71, afterPct: 100, up: true, down: false, deltaLabel: '▲ +120件' },
    ]
    const w = mount(CompareBars, { props: { items } })
    expect(w.text()).toContain('帮扶前后对比')
    expect(w.text()).toContain('月销量')
    expect(w.text()).toContain('▲ +120件')
    expect(w.text()).toContain('300件')
    expect(w.text()).toContain('420件')
    w.unmount()
  })

  it('renders nothing when items empty', () => {
    const w = mount(CompareBars, { props: { items: [] } })
    expect(w.text()).toBe('')
    w.unmount()
  })

  it('shows delta label for down trend', () => {
    const items = [
      { name: '贫困率', before: 20, after: 5, unit: '%', beforePct: 100, afterPct: 25, up: false, down: true, deltaLabel: '▼ 15%' },
    ]
    const w = mount(CompareBars, { props: { items } })
    expect(w.text()).toContain('▼ 15%')
    w.unmount()
  })
})
