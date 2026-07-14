import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KpiGrid from '@/modules/practice/mine/KpiGrid.vue'

describe('KpiGrid', () => {
  it('renders KPI cards for each item', () => {
    const items = [
      { name: '月销量', value: 420, unit: '件', isHighlight: false },
      { name: '满意度', value: 85, unit: '%', isHighlight: true },
    ]
    const w = mount(KpiGrid, { props: { items } })
    expect(w.text()).toContain('关键指标')
    expect(w.text()).toContain('420')
    expect(w.text()).toContain('月销量')
    expect(w.text()).toContain('85')
    expect(w.findAll('.kpi')).toHaveLength(2)
    expect(w.findAll('.kpi.hi')).toHaveLength(1)
    w.unmount()
  })

  it('renders nothing when items empty', () => {
    const w = mount(KpiGrid, { props: { items: [] } })
    expect(w.text()).toBe('')
    w.unmount()
  })
})
