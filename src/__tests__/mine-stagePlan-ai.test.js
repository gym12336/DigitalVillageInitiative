import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// mock planGen 以隔离网络，便于观察 loading 态与来源提示。
vi.mock('@/modules/practice/mine/planGen.js', () => ({
  generatePlan: vi.fn(),
  localTemplatePlan: vi.fn(),
}))
// mock 检索源，隔离其内部对 /api/villages 的网络请求（jsdom 不接受相对 URL）。
vi.mock('@/modules/practice/mine/sources.js', () => ({
  getRetrievalSources: vi.fn().mockResolvedValue({ villages: [], results: [], demands: [], guide: {} }),
}))

import StagePlan from '@/modules/practice/mine/StagePlan.vue'
import * as planGen from '@/modules/practice/mine/planGen.js'

const stubs = {
  'router-link': { props: ['to'], template: '<a><slot /></a>' },
}
const globalOpts = { stubs, mocks: { $router: { push: vi.fn() } } }

function fullDossier(overrides = {}) {
  return {
    id: 'd',
    title: 'T',
    idea: '',
    village: '',
    plan: {
      goal: '', topic: '', targetVillage: '', metrics: [], expected: '',
      background: '', methods: [], risks: [], phases: [], source: '',
    },
    refs: [],
    collected: { metricValues: [], materials: [], people: [] },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('StagePlan loading 与来源提示', () => {
  it('生成中按钮进 loading 态（禁用 + 文案），完成后恢复', async () => {
    // 用可解开的 promise 卡住生成过程
    let resolve
    planGen.generatePlan.mockReturnValue(new Promise((r) => { resolve = r }))

    const w = mount(StagePlan, { props: { dossier: fullDossier({ idea: '去村里' }) }, global: globalOpts })
    // 找到「生成方案初稿」按钮（第一个 primary 按钮里含此文案）
    const btn = w.findAll('button').find((b) => /生成方案|重新生成/.test(b.text()))
    expect(btn).toBeTruthy()
    await btn.trigger('click')
    // loading 态
    expect(btn.text()).toContain('AI 生成中')
    expect(btn.attributes('disabled')).toBeDefined()

    resolve({
      source: 'ai',
      goal: '', topic: 'X', targetVillage: '', expected: '',
      background: '', metrics: [], methods: [], risks: [],
      phases: [
        { stage: 'plan', title: 'p', tasks: [{ text: 'a', done: false }] },
        { stage: 'track', title: 't', tasks: [{ text: 'b', done: false }] },
        { stage: 'result', title: 'r', tasks: [{ text: 'c', done: false }] },
      ],
    })
    await flushPromises()
    // 恢复态
    expect(btn.text()).not.toContain('AI 生成中')
  })

  it('plan.source === template → 显示离线模板提示', () => {
    const dossier = fullDossier({
      plan: {
        goal: '', topic: 'x', targetVillage: '', metrics: [], expected: '',
        background: '', methods: [], risks: [], source: 'template',
        phases: [
          { stage: 'plan', tasks: [] },
          { stage: 'track', tasks: [] },
          { stage: 'result', tasks: [] },
        ],
      },
    })
    const w = mount(StagePlan, { props: { dossier }, global: globalOpts })
    const hint = w.find('.src-hint')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toContain('本次用了离线模板')
    expect(hint.classes()).not.toContain('src-ai')
  })

  it('plan.source === ai → 显示 AI 版方案标签', () => {
    const dossier = fullDossier({
      plan: {
        goal: '', topic: 'x', targetVillage: '', metrics: [], expected: '',
        background: '', methods: [], risks: [], source: 'ai',
        phases: [
          { stage: 'plan', tasks: [] },
          { stage: 'track', tasks: [] },
          { stage: 'result', tasks: [] },
        ],
      },
    })
    const w = mount(StagePlan, { props: { dossier }, global: globalOpts })
    const hint = w.find('.src-hint')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toContain('AI 版方案')
    expect(hint.classes()).toContain('src-ai')
  })
})
