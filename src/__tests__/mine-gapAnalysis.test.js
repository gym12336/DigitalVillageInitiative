import { describe, it, expect } from 'vitest'
import { analyzeGaps } from '@/modules/practice/mine/gapAnalysis'

function makeDossier(over = {}) {
  return {
    plan: { topic: '非遗文化挖掘', metrics: [{ name: '受访手艺人数', unit: '人' }] },
    collected: { metricValues: [], materials: [], people: [] },
    ...over,
  }
}

describe('analyzeGaps', () => {
  it('缺指标数据 → 产出 metric-missing', () => {
    const { gaps } = analyzeGaps(makeDossier())
    expect(gaps.some((g) => g.type === 'metric-missing')).toBe(true)
  })

  it('指标只填一半 → 产出 metric-partial', () => {
    const d = makeDossier({
      collected: { metricValues: [{ name: '受访手艺人数', before: '3', after: '' }], materials: [], people: [] },
    })
    const { gaps } = analyzeGaps(d)
    expect(gaps.some((g) => g.type === 'metric-partial')).toBe(true)
  })

  it('材料偏少 → 产出 material-few', () => {
    const { gaps } = analyzeGaps(makeDossier())
    expect(gaps.some((g) => g.type === 'material-few')).toBe(true)
  })

  it('人物偏少 → 产出 people-few', () => {
    const { gaps } = analyzeGaps(makeDossier())
    expect(gaps.some((g) => g.type === 'people-few')).toBe(true)
  })

  it('无方案 → 产出 no-plan', () => {
    const d = makeDossier({ plan: { topic: '', metrics: [] } })
    const { gaps } = analyzeGaps(d)
    expect(gaps.some((g) => g.type === 'no-plan')).toBe(true)
  })

  it('完整档案 → 无 warn 级缺口，complete 为真', () => {
    const d = makeDossier({
      collected: {
        metricValues: [{ name: '受访手艺人数', before: '2', after: '8' }],
        materials: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
        people: [{ name: '甲' }, { name: '乙' }],
      },
    })
    const { gaps, complete } = analyzeGaps(d)
    expect(complete).toBe(true)
    expect(gaps.filter((g) => g.level === 'warn')).toHaveLength(0)
  })

  it('before=0 视为已填', () => {
    const d = makeDossier({
      collected: {
        metricValues: [{ name: '受访手艺人数', before: 0, after: 8 }],
        materials: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
        people: [{ name: '甲' }, { name: '乙' }],
      },
    })
    const { complete } = analyzeGaps(d)
    expect(complete).toBe(true)
  })

  it('空档案不报错', () => {
    expect(() => analyzeGaps(null)).not.toThrow()
    expect(analyzeGaps(null).complete).toBe(false)
  })

  it('时段过半但进度不足 → 产出 pace-slow(warn)', () => {
    const d = makeDossier({
      startDate: '2026-07-01',
      endDate: '2026-07-11',
      plan: {
        topic: '非遗文化挖掘',
        metrics: [{ name: '受访手艺人数', unit: '人' }],
        phases: [{ stage: 'track', tasks: [{ text: 'a', done: false }, { text: 'b', done: false }] }],
      },
      collected: { metricValues: [], materials: [], people: [] },
    })
    // now = 7/09，10 天里已过 8 天（>50%），但完成度为 0
    const { gaps } = analyzeGaps(d, new Date('2026-07-09').getTime())
    expect(gaps.some((g) => g.type === 'pace-slow' && g.level === 'warn')).toBe(true)
  })

  it('时段刚开始 → 不报 pace-slow', () => {
    const d = makeDossier({
      startDate: '2026-07-01',
      endDate: '2026-07-11',
      collected: { metricValues: [], materials: [], people: [] },
    })
    const { gaps } = analyzeGaps(d, new Date('2026-07-02').getTime())
    expect(gaps.some((g) => g.type === 'pace-slow')).toBe(false)
  })

  it('无时段信息 → 不报 pace-slow', () => {
    const { gaps } = analyzeGaps(makeDossier())
    expect(gaps.some((g) => g.type === 'pace-slow')).toBe(false)
  })
})
