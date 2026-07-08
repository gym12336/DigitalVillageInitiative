import { describe, it, expect } from 'vitest'
import { generateTemplatePlan } from '../../server/lib/planTemplate.js'

describe('server/lib/planTemplate', () => {
  it('产出完整新 plan 结构（含 phases/methods/risks/source）', () => {
    const plan = generateTemplatePlan({
      idea: '去陈家铺村帮村民把竹编卖出去',
      refs: [{ source: 'village', title: '陈家铺村', sub: '非遗竹编之乡' }],
      now: 0,
    })
    expect(plan.source).toBe('template')
    expect(plan.generatedAt).toBe(new Date(0).toISOString())
    expect(plan.topic).toBeTruthy()
    expect(plan.expected).toBeTruthy()
    expect(plan.goal).toContain('陈家铺村')
    expect(plan.targetVillage).toBe('陈家铺村')
    expect(plan.metrics.length).toBeGreaterThan(0)
    expect(Array.isArray(plan.methods)).toBe(true)
    expect(Array.isArray(plan.risks)).toBe(true)
  })

  it('phases 恒三段：plan / track / result，每段 tasks 非空且 done 默认 false', () => {
    const plan = generateTemplatePlan({ idea: '去枫树村调研生态旅游' })
    expect(plan.phases).toHaveLength(3)
    expect(plan.phases.map((p) => p.stage)).toEqual(['plan', 'track', 'result'])
    for (const p of plan.phases) {
      expect(p.title).toBeTruthy()
      expect(Array.isArray(p.tasks)).toBe(true)
      expect(p.tasks.length).toBeGreaterThan(0)
      for (const t of p.tasks) {
        expect(typeof t.text).toBe('string')
        expect(t.text.length).toBeGreaterThan(0)
        expect(t.done).toBe(false)
      }
    }
  })

  it('竹编/文化 idea 命中文化选题', () => {
    const p = generateTemplatePlan({ idea: '记录竹编非遗手艺' })
    expect(p.topic).toContain('文化')
  })

  it('产业/销售 idea 命中产业选题', () => {
    const p = generateTemplatePlan({ idea: '帮村里把农产品在电商平台卖出去' })
    expect(p.topic).toContain('产业')
  })

  it('无命中回落默认选题「乡村综合调研」', () => {
    const p = generateTemplatePlan({ idea: '想到村里看看' })
    expect(p.topic).toBe('乡村综合调研')
    expect(p.phases[0].tasks.length).toBeGreaterThan(0)
  })

  it('带起止日期 → background 含时段', () => {
    const p = generateTemplatePlan({
      idea: '去枫树村调研',
      startDate: '2026-07-10',
      endDate: '2026-07-20',
    })
    expect(p.background).toContain('2026-07-10')
    expect(p.background).toContain('2026-07-20')
  })

  it('无村名时 targetVillage 为空但仍产出可用方案', () => {
    const p = generateTemplatePlan({ idea: '帮助乡村做点事情' })
    expect(p.targetVillage).toBe('')
    expect(p.phases.every((ph) => ph.tasks.length > 0)).toBe(true)
  })

  it('从 idea 文本兜底提取村名（排除泛称）', () => {
    const p = generateTemplatePlan({ idea: '去枫树村调研生态旅游' })
    expect(p.targetVillage).toBe('枫树村')
  })

  it('village 卡片优先于 idea 文本', () => {
    const p = generateTemplatePlan({
      idea: '去某村看看',
      refs: [{ source: 'village', title: '桃源村', sub: '' }],
    })
    expect(p.targetVillage).toBe('桃源村')
  })

  it('demand 卡片会进 background', () => {
    const p = generateTemplatePlan({
      idea: '去村里',
      refs: [{ source: 'demand', title: '希望有人帮忙卖笋干', sub: '' }],
    })
    expect(p.background).toContain('希望有人帮忙卖笋干')
  })

  it('topicHint 影响选题挑选', () => {
    const p = generateTemplatePlan({ idea: '去村里', topic: '教育支援' })
    expect(p.topic).toContain('教育')
  })
})
