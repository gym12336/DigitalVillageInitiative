import { describe, it, expect } from 'vitest'
import { localExtract } from '../modules/practice/mine/extract.js'

describe('extract.localExtract（离线兜底）', () => {
  it('空文本 → source:empty', () => {
    const r = localExtract('   ')
    expect(r.source).toBe('empty')
    expect(r.people).toEqual([])
  })

  it('从「X说：…」抽人物与引语', () => {
    const r = localExtract('李伯说这门竹编手艺不能断，要传下去。')
    expect(r.source).toBe('template')
    expect(r.people.length).toBeGreaterThanOrEqual(1)
    expect(r.people[0].name).toBe('李伯')
    expect(r.people[0].quote).toContain('竹编')
    expect(r.people[0].source).toBe('auto')
  })

  it('从「指标 数值 单位」抽指标', () => {
    const r = localExtract('走访后月销售额5000元，合作农户12户。')
    const names = r.metrics.map((m) => m.name)
    expect(names.some((n) => n.includes('销售'))).toBe(true)
    const sale = r.metrics.find((m) => m.name.includes('销售'))
    expect(sale.value).toBe('5000')
    expect(sale.unit).toBe('元')
  })

  it('同名人物去重', () => {
    const r = localExtract('王姐说今年收成好。王姐提到明年想扩种。')
    const wang = r.people.filter((p) => p.name === '王姐')
    expect(wang.length).toBe(1)
  })
})
