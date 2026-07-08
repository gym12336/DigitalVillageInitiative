import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StageTrack from '@/modules/practice/mine/StageTrack.vue'

function makeDossier(overrides = {}) {
  return {
    id: 'd1',
    title: 'T',
    idea: '',
    village: '',
    plan: {
      goal: '',
      topic: '',
      targetVillage: '',
      metrics: [],
      expected: '',
      background: '',
      methods: [],
      risks: [],
      phases: [
        { stage: 'plan', title: '前', tasks: [{ text: '联系村委', output: '名单', done: false }] },
        {
          stage: 'track',
          title: '中',
          tasks: [
            { text: '访谈手艺人', output: '录音', done: false },
            { text: '拍摄工艺流程', output: '影像', done: true },
            { text: '整理田野笔记', output: '笔记', done: false },
          ],
        },
        { stage: 'result', title: '后', tasks: [{ text: '写报告', output: '报告', done: false }] },
      ],
      source: 'ai',
    },
    refs: [],
    collected: { metricValues: [], materials: [], people: [] },
    ...overrides,
  }
}

describe('StageTrack 任务勾选块', () => {
  it('渲染 track 段任务与进度（3 中 1 已完成 → 33%）', () => {
    const w = mount(StageTrack, { props: { dossier: makeDossier() } })
    expect(w.text()).toContain('本阶段任务')
    expect(w.text()).toContain('1/3 已完成')
    // 只渲染 track 段的任务，不渲染 plan/result 段
    expect(w.text()).toContain('访谈手艺人')
    expect(w.text()).not.toContain('联系村委')
    expect(w.text()).not.toContain('写报告')
  })

  it('勾选任务 → emit update 携带整段更新后的 phases', async () => {
    const w = mount(StageTrack, { props: { dossier: makeDossier() } })
    const boxes = w.findAll('input[type="checkbox"]')
    expect(boxes.length).toBe(3)
    // 勾选第一个（未完成 → 完成）
    await boxes[0].setValue(true)
    const emissions = w.emitted('update')
    expect(emissions).toBeTruthy()
    const payload = emissions[0][0]
    expect(payload.plan.phases).toBeTruthy()
    const track = payload.plan.phases.find((p) => p.stage === 'track')
    expect(track.tasks[0].done).toBe(true)
    expect(track.tasks[1].done).toBe(true) // 已勾的保留
    // 未动其他阶段
    const planPhase = payload.plan.phases.find((p) => p.stage === 'plan')
    expect(planPhase.tasks[0].done).toBe(false)
  })

  it('plan.phases 为空/无 track 段 → 不渲染任务块，其他仍可用', () => {
    const dossier = makeDossier({
      plan: {
        goal: '', topic: '', targetVillage: '', metrics: [], expected: '',
        background: '', methods: [], risks: [], phases: [],
      },
    })
    const w = mount(StageTrack, { props: { dossier } })
    expect(w.text()).not.toContain('本阶段任务')
    expect(w.text()).toContain('指标采集')
  })
})
