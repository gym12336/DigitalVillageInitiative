import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TimelineView from '@/modules/practice/mine/TimelineView.vue'

describe('TimelineView', () => {
  it('renders timeline items', () => {
    const items = [
      { name: '村口古树', event: '走访记录', date: '2026-07-03', theme: '文化挖掘' },
      { name: '村委会', note: '座谈会', date: '', theme: '' },
    ]
    const w = mount(TimelineView, { props: { items } })
    expect(w.text()).toContain('实践足迹')
    expect(w.text()).toContain('村口古树')
    expect(w.text()).toContain('走访记录')
    expect(w.text()).toContain('文化挖掘')
    expect(w.text()).toContain('2026-07-03')
    expect(w.findAll('.tl-item')).toHaveLength(2)
    w.unmount()
  })

  it('renders nothing when items empty', () => {
    const w = mount(TimelineView, { props: { items: [] } })
    expect(w.text()).toBe('')
    w.unmount()
  })
})
