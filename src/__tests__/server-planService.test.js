import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generatePlan } from '../../server/services/planService.js'
import { NoKeyError } from '../../server/lib/deepseek.js'

function goodLLMPlan(overrides = {}) {
  return {
    goal: '围绕陈家铺村开展非遗竹编活化',
    topic: '非遗文化挖掘与活化',
    targetVillage: '陈家铺村',
    expected: '一套口述史 + 传播物料',
    background: '乡村之声反映竹编手艺失传',
    metrics: [{ name: '访谈手艺人', unit: '人' }],
    methods: ['半结构化访谈'],
    risks: ['方言沟通'],
    phases: [
      { stage: 'plan', title: '前', tasks: [{ text: '联系村委' }] },
      { stage: 'track', title: '中', tasks: [{ text: '完成访谈' }] },
      { stage: 'result', title: '后', tasks: [{ text: '整理稿件' }] },
    ],
    ...overrides,
  }
}

let warnSpy
beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  warnSpy.mockRestore()
})

describe('server/services/planService.generatePlan', () => {
  it('LLM 返回合法 JSON → source:ai 且透传字段', async () => {
    const chatImpl = vi.fn().mockResolvedValue(goodLLMPlan())
    const plan = await generatePlan(
      { idea: '去陈家铺村帮村民把竹编卖出去' },
      { chatImpl, now: 0 },
    )
    expect(plan.source).toBe('ai')
    expect(plan.topic).toBe('非遗文化挖掘与活化')
    expect(plan.phases).toHaveLength(3)
    expect(plan.phases.map((p) => p.stage)).toEqual(['plan', 'track', 'result'])
    expect(plan.generatedAt).toBe(new Date(0).toISOString())
    // chatImpl 收到含 system/user 的对象
    expect(chatImpl).toHaveBeenCalledTimes(1)
    const arg = chatImpl.mock.calls[0][0]
    expect(arg.system).toContain('大学生乡村实践')
    expect(arg.user).toContain('去陈家铺村')
  })

  it('LLM 返回坏 JSON（缺 phases）→ 回落规则版 source:template', async () => {
    const chatImpl = vi.fn().mockResolvedValue({ goal: '啥都没有' })
    const plan = await generatePlan({ idea: '记录竹编非遗手艺' }, { chatImpl, now: 0 })
    expect(plan.source).toBe('template')
    expect(plan.topic).toContain('文化')
    expect(plan.phases).toHaveLength(3)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('LLM 抛错（超时/限流）→ 回落规则版', async () => {
    const chatImpl = vi.fn().mockRejectedValue(new Error('timeout'))
    const plan = await generatePlan({ idea: '帮村里做电商' }, { chatImpl, now: 0 })
    expect(plan.source).toBe('template')
    expect(plan.topic).toContain('产业')
    expect(warnSpy).toHaveBeenCalled()
  })

  it('无 key（NoKeyError）→ 静默回落规则版，不记 warn', async () => {
    const chatImpl = vi.fn().mockRejectedValue(new NoKeyError())
    const plan = await generatePlan({ idea: '去枫树村调研生态旅游' }, { chatImpl, now: 0 })
    expect(plan.source).toBe('template')
    expect(plan.topic).toContain('生态')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('传 refs → user prompt 含采纳资源', async () => {
    const chatImpl = vi.fn().mockResolvedValue(goodLLMPlan())
    await generatePlan(
      {
        idea: '去村里',
        refs: [
          { source: 'demand', title: '希望有人帮忙卖笋干', sub: '' },
          { source: 'village', title: '陈家铺村', sub: '非遗竹编' },
        ],
      },
      { chatImpl },
    )
    const user = chatImpl.mock.calls[0][0].user
    expect(user).toContain('乡村之声')
    expect(user).toContain('希望有人帮忙卖笋干')
    expect(user).toContain('陈家铺村')
  })

  it('idea 超长会截断（避免撑爆 prompt）', async () => {
    const chatImpl = vi.fn().mockResolvedValue(goodLLMPlan())
    const longIdea = '甲'.repeat(1000)
    await generatePlan({ idea: longIdea }, { chatImpl })
    const user = chatImpl.mock.calls[0][0].user
    // 用户提示里不会出现全长 idea（应带截断标记）
    expect(user).toContain('…')
    expect(user.length).toBeLessThan(longIdea.length + 500)
  })

  it('LLM 输出 phases 少一段 → 回落规则版', async () => {
    const chatImpl = vi.fn().mockResolvedValue({
      ...goodLLMPlan(),
      phases: [
        { stage: 'plan', tasks: [{ text: 'a' }] },
        { stage: 'track', tasks: [{ text: 'b' }] },
        // 缺 result
      ],
    })
    const plan = await generatePlan({ idea: '记录竹编' }, { chatImpl })
    expect(plan.source).toBe('template')
    expect(plan.phases).toHaveLength(3)
  })

  it('回落时保留原始输入的目标村（village 参数）', async () => {
    const chatImpl = vi.fn().mockRejectedValue(new Error('boom'))
    const plan = await generatePlan(
      { idea: '做点什么', village: '桃源村' },
      { chatImpl },
    )
    expect(plan.source).toBe('template')
    expect(plan.targetVillage).toBe('桃源村')
  })
})
