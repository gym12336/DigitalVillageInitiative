import { describe, it, expect } from 'vitest'
import { renderTimelineMarkup } from '../modules/builder/editor/timelineRenderer.js'

describe('renderTimelineMarkup', () => {
  const makeComponent = (overrides = {}) => ({
    type: 'timeline',
    width: 600,
    height: 360,
    props: {
      title: '发展历程',
      events: [
        { date: '2020-03', title: '驻村工作队进驻', description: '3名队员入驻' },
        { date: '2021-06', title: '茶叶合作社成立', description: '带动86户农户' },
      ],
      ...overrides,
    },
  })

  it('returns HTML with timeline structure', () => {
    const html = renderTimelineMarkup(makeComponent())
    expect(html).toContain('发展历程')
    expect(html).toContain('驻村工作队进驻')
    expect(html).toContain('3名队员入驻')
    expect(html).toContain('茶叶合作社成立')
    expect(html).toContain('2020-03')
    expect(html).toContain('2021-06')
  })

  it('renders event cards with alternating positions', () => {
    const html = renderTimelineMarkup(makeComponent())
    // Should have event container elements
    expect(html.match(/timeline-event/g).length).toBeGreaterThanOrEqual(2)
  })

  it('handles empty events gracefully', () => {
    const comp = makeComponent({ events: [] })
    const html = renderTimelineMarkup(comp)
    expect(html).toContain('暂无事件')
  })

  it('handles single event', () => {
    const comp = makeComponent({
      events: [{ date: '2020-03', title: '唯一事件', description: '描述' }],
    })
    const html = renderTimelineMarkup(comp)
    expect(html).toContain('唯一事件')
  })
})
