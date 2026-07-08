import { describe, it, expect, vi, beforeEach } from 'vitest'

// planGen 已改 async：主路径调后端 apiGeneratePlan，失败兜到本地 localTemplatePlan。
// mock api.js 以隔离网络。
vi.mock('@/modules/practice/mine/api.js', () => ({
  apiGeneratePlan: vi.fn(),
}))

import { generatePlan, localTemplatePlan } from '@/modules/practice/mine/planGen'
import * as api from '@/modules/practice/mine/api.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('generatePlan async 主路径', () => {
  it('后端 AI 成功 → 透传 AI plan', async () => {
    api.apiGeneratePlan.mockResolvedValue({
      source: 'ai',
      topic: '非遗文化挖掘与活化',
      phases: [
        { stage: 'plan', tasks: [{ text: 'a' }] },
        { stage: 'track', tasks: [{ text: 'b' }] },
        { stage: 'result', tasks: [{ text: 'c' }] },
      ],
      metrics: [],
      methods: [],
      risks: [],
    })
    const p = await generatePlan('去陈家铺村帮村民把竹编卖出去', [
      { source: 'village', title: '陈家铺村', sub: '非遗竹编之乡' },
    ])
    expect(p.source).toBe('ai')
    expect(p.topic).toBe('非遗文化挖掘与活化')
    expect(api.apiGeneratePlan).toHaveBeenCalledTimes(1)
    const arg = api.apiGeneratePlan.mock.calls[0][0]
    expect(arg.idea).toContain('陈家铺村')
    expect(arg.refs).toHaveLength(1)
  })

  it('后端接口 reject → 走本地 localTemplatePlan（source:template）', async () => {
    api.apiGeneratePlan.mockRejectedValue(new Error('down'))
    const p = await generatePlan('记录竹编非遗手艺', [])
    expect(p.source).toBe('template')
    expect(p.topic).toContain('文化')
    expect(p.phases).toHaveLength(3)
  })

  it('后端返回残缺 plan（无 phases）→ 走本地兜底', async () => {
    api.apiGeneratePlan.mockResolvedValue({ source: 'ai', topic: 'X' })
    const p = await generatePlan('帮村里做电商', [])
    expect(p.source).toBe('template')
    expect(p.topic).toContain('产业')
  })

  it('透传 opts 到后端（village/topic/日期）', async () => {
    api.apiGeneratePlan.mockResolvedValue({
      source: 'ai',
      phases: [
        { stage: 'plan', tasks: [] },
        { stage: 'track', tasks: [] },
        { stage: 'result', tasks: [] },
      ],
    })
    await generatePlan('idea', [], {
      village: '桃源村',
      topic: '产业',
      startDate: '2026-07-10',
      endDate: '2026-07-20',
    })
    const arg = api.apiGeneratePlan.mock.calls[0][0]
    expect(arg.village).toBe('桃源村')
    expect(arg.topic).toBe('产业')
    expect(arg.startDate).toBe('2026-07-10')
    expect(arg.endDate).toBe('2026-07-20')
  })
})

describe('localTemplatePlan 前端兜底', () => {
  it('产出完整新结构（含 phases 三段、methods、risks、source:template）', () => {
    const p = localTemplatePlan('去陈家铺村帮村民把竹编卖出去', [
      { source: 'village', title: '陈家铺村', sub: '非遗竹编之乡' },
    ])
    expect(p.source).toBe('template')
    expect(p.targetVillage).toBe('陈家铺村')
    expect(p.topic).toContain('文化')
    expect(p.phases).toHaveLength(3)
    expect(p.phases.map((x) => x.stage)).toEqual(['plan', 'track', 'result'])
    for (const ph of p.phases) {
      expect(Array.isArray(ph.tasks)).toBe(true)
      expect(ph.tasks.length).toBeGreaterThan(0)
      for (const t of ph.tasks) {
        expect(t.text).toBeTruthy()
        expect(t.done).toBe(false)
      }
    }
    expect(Array.isArray(p.methods)).toBe(true)
    expect(Array.isArray(p.risks)).toBe(true)
  })

  it('产业/销售 idea 命中产业选题', () => {
    expect(localTemplatePlan('帮村里把农产品在电商平台卖出去', []).topic).toContain('产业')
  })

  it('无命中回落默认选题「乡村综合调研」', () => {
    expect(localTemplatePlan('想到村里看看', []).topic).toBe('乡村综合调研')
  })

  it('无村名时 targetVillage 为空但仍产出可用方案', () => {
    const p = localTemplatePlan('帮助乡村做点事情', [])
    expect(p.targetVillage).toBe('')
    expect(p.phases.every((ph) => ph.tasks.length > 0)).toBe(true)
  })

  it('从 idea 文本兜底提取村名', () => {
    expect(localTemplatePlan('去枫树村调研生态旅游', []).targetVillage).toBe('枫树村')
  })
})
