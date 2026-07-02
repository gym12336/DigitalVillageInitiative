import { describe, it, expect } from 'vitest'
import { summarize, resourceTypeStats, topByResources } from '@/lib/villageResources.js'

describe('villageResources 汇总函数', () => {
  const full = {
    id: 'a', name: 'A', type: '文旅基础',
    extra: {
      history: ['h1', 'h2'],
      people: [{ name: 'p1' }, { name: 'p2' }],
      resources: [{ name: 'r1' }, { name: 'r2' }, { name: 'r3' }],
      media: [{ type: 'photo' }, { type: 'photo' }, { type: 'video' }],
    },
  }
  const empty = { id: 'b', name: 'B', type: '古村落', extra: { history: [], people: [], resources: [], media: [] } }
  const noExtra = { id: 'c', name: 'C', type: '古村落' }

  it('summarize 正确计数各类资源', () => {
    expect(summarize(full)).toEqual({ resources: 3, people: 2, photos: 2, videos: 1, history: 2 })
  })

  it('summarize 空 extra / 无 extra 返回全 0', () => {
    const zero = { resources: 0, people: 0, photos: 0, videos: 0, history: 0 }
    expect(summarize(empty)).toEqual(zero)
    expect(summarize(noExtra)).toEqual(zero)
  })

  it('resourceTypeStats 按 type 分组计数', () => {
    const stats = resourceTypeStats([full, empty, noExtra])
    expect(stats).toContainEqual({ type: '文旅基础', count: 1 })
    expect(stats).toContainEqual({ type: '古村落', count: 2 })
  })

  it('topByResources 按资源数降序取前 N', () => {
    const top = topByResources([empty, full, noExtra], 2)
    expect(top.length).toBe(2)
    expect(top[0]).toEqual({ id: 'a', name: 'A', count: 3 })
  })
})
