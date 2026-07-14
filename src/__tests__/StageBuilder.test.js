import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StageBuilder from '@/modules/practice/mine/StageBuilder.vue'

const stubs = { BuilderCards: { props: ['dossierId'], template: '<div class="builder-cards-stub">cards</div>' } }

describe('StageBuilder', () => {
  it('renders builder heading and cards', () => {
    const dossier = { id: 'd1', plan: { targetVillage: '小朱湾村' } }
    const w = mount(StageBuilder, { props: { dossier }, global: { stubs } })
    expect(w.text()).toContain('成果搭建台')
    expect(w.text()).toContain('小朱湾村')
    expect(w.text()).toContain('cards')
    w.unmount()
  })

  it('works without target village', () => {
    const dossier = { id: 'd2', plan: {} }
    const w = mount(StageBuilder, { props: { dossier }, global: { stubs } })
    expect(w.text()).toContain('成果搭建台')
    expect(w.text()).not.toContain('目标村')
    w.unmount()
  })
})
