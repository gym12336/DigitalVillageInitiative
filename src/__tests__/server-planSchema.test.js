import { describe, it, expect } from 'vitest'
import { validatePlanShape } from '../../server/lib/planSchema.js'

function buildPhases(overrides = {}) {
  return ['plan', 'track', 'result'].map((s) => ({
    stage: s,
    title: overrides[s]?.title || `阶段:${s}`,
    tasks: overrides[s]?.tasks || [{ text: `${s} 任务一` }],
  }))
}

describe('server/lib/planSchema.validatePlanShape', () => {
  it('合法结构：ok:true 且规范化（补 done、trim、去多余字段）', () => {
    const raw = {
      goal: '  目标  ',
      topic: '产业',
      targetVillage: '陈家铺村',
      expected: '预期',
      metrics: [{ name: '月销售额', unit: '元' }, { name: '  ' /* 空 name */ }],
      background: '背景',
      methods: ['访谈', '', '   ', '问卷'],
      risks: ['雨季'],
      phases: buildPhases({
        plan: { tasks: [{ text: '联系村委', output: '名单' }] },
        track: { tasks: [{ text: '完成访谈', done: true }] },
        result: { tasks: [{ text: '报告' }] },
      }),
      __extra: 'should be dropped', // 未知字段应丢弃
    }
    const r = validatePlanShape(raw)
    expect(r.ok).toBe(true)
    expect(r.plan.goal).toBe('目标')
    expect(r.plan.methods).toEqual(['访谈', '问卷'])
    expect(r.plan.metrics).toEqual([{ name: '月销售额', unit: '元' }])
    expect(r.plan.__extra).toBeUndefined()
    expect(r.plan.phases).toHaveLength(3)
    expect(r.plan.phases.map((p) => p.stage)).toEqual(['plan', 'track', 'result'])
    // done 默认 false，显式 true 保留
    expect(r.plan.phases[0].tasks[0].done).toBe(false)
    expect(r.plan.phases[1].tasks[0].done).toBe(true)
  })

  it('非对象 → ok:false', () => {
    expect(validatePlanShape(null).ok).toBe(false)
    expect(validatePlanShape('foo').ok).toBe(false)
    expect(validatePlanShape(42).ok).toBe(false)
  })

  it('phases 缺失或非数组 → ok:false', () => {
    expect(validatePlanShape({}).ok).toBe(false)
    expect(validatePlanShape({ phases: 'nope' }).ok).toBe(false)
  })

  it('phases 少一段 → ok:false', () => {
    const raw = {
      phases: [
        { stage: 'plan', tasks: [{ text: 'a' }] },
        { stage: 'track', tasks: [{ text: 'b' }] },
        // 缺 result
      ],
    }
    const r = validatePlanShape(raw)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/result/)
  })

  it('某段 tasks 非数组 → 视作该段缺失 → ok:false', () => {
    const raw = {
      phases: [
        { stage: 'plan', tasks: 'oops' },
        { stage: 'track', tasks: [{ text: 'b' }] },
        { stage: 'result', tasks: [{ text: 'c' }] },
      ],
    }
    expect(validatePlanShape(raw).ok).toBe(false)
  })

  it('task 缺 text 被剔除，段仍存在则合法（tasks 可能为空数组）', () => {
    const raw = {
      phases: [
        { stage: 'plan', tasks: [{ output: '没 text' }, { text: '' }] },
        { stage: 'track', tasks: [{ text: '有效任务' }] },
        { stage: 'result', tasks: [{ text: '写报告' }] },
      ],
    }
    const r = validatePlanShape(raw)
    expect(r.ok).toBe(true)
    expect(r.plan.phases[0].tasks).toEqual([]) // 无效任务被剔除
    expect(r.plan.phases[1].tasks).toHaveLength(1)
  })

  it('未知 stage 段被忽略（如仍能覆盖三段则合法，否则不合法）', () => {
    const raw = {
      phases: [
        { stage: 'plan', tasks: [{ text: 'a' }] },
        { stage: 'unknown', tasks: [{ text: 'x' }] },
        { stage: 'track', tasks: [{ text: 'b' }] },
        { stage: 'result', tasks: [{ text: 'c' }] },
      ],
    }
    const r = validatePlanShape(raw)
    expect(r.ok).toBe(true)
    expect(r.plan.phases.map((p) => p.stage)).toEqual(['plan', 'track', 'result'])
  })

  it('title 缺失则用默认标题', () => {
    const raw = {
      phases: [
        { stage: 'plan', tasks: [{ text: 'a' }] },
        { stage: 'track', tasks: [{ text: 'b' }] },
        { stage: 'result', tasks: [{ text: 'c' }] },
      ],
    }
    const r = validatePlanShape(raw)
    expect(r.ok).toBe(true)
    expect(r.plan.phases[0].title).toBe('实践前准备')
  })

  it('metrics/methods/risks 非数组时降级为空数组', () => {
    const raw = {
      metrics: 'nope',
      methods: null,
      risks: 42,
      phases: buildPhases(),
    }
    const r = validatePlanShape(raw)
    expect(r.ok).toBe(true)
    expect(r.plan.metrics).toEqual([])
    expect(r.plan.methods).toEqual([])
    expect(r.plan.risks).toEqual([])
  })
})
