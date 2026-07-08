import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StagePlan from '@/modules/practice/mine/StagePlan.vue'

// 复现 bug：迁移导入或不完整的档案缺 refs/plan/collected 字段。
// 打开时 StagePlan 若直接读 dossier.refs.length 会抛 TypeError，
// 导致整个工作台子树（含返回按钮）渲染失败 → 空白页且无法返回。
const stubs = {
  'router-link': { props: ['to'], template: '<a><slot /></a>' },
}

describe('StagePlan 对不完整档案的容错', () => {
  it('缺 refs/plan 的档案（迁移导入）不应导致渲染崩溃', () => {
    const thin = { id: 'dmig', title: 'A', migratedFrom: 'old-a' } // 无 refs/plan/collected
    expect(() =>
      mount(StagePlan, {
        props: { dossier: thin },
        global: { stubs, mocks: { $router: { push: vi.fn() } } },
      }),
    ).not.toThrow()
  })

  it('完整档案照常渲染（回归保护）', () => {
    const full = {
      id: 'dfull',
      title: 'T',
      idea: '',
      village: '',
      plan: { goal: '', topic: '', targetVillage: '', metrics: [], expected: '' },
      refs: [],
      collected: { metricValues: [], materials: [], people: [] },
    }
    const w = mount(StagePlan, {
      props: { dossier: full },
      global: { stubs, mocks: { $router: { push: vi.fn() } } },
    })
    expect(w.text()).toContain('说出你的 idea')
  })
})
