import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PracticeView from '@/modules/practice/PracticeView.vue'

const stubs = { CountUp: { props: ['value'], template: '<span>{{ value }}</span>' } }

describe('PracticeView 冒烟', () => {
  it('渲染标题、人物卡、成果卡、视频卡', () => {
    const w = mount(PracticeView, { global: { stubs } })
    expect(w.text()).toContain('乡村实践 —— 用脚步丈量，用实践记录')
    expect(w.findAll('.person-card')).toHaveLength(8)
    expect(w.findAll('.result-card')).toHaveLength(12)
    expect(w.findAll('.video-card')).toHaveLength(4)
    w.unmount()
  })

  it('人物标签筛选生效', async () => {
    const w = mount(PracticeView, { global: { stubs } })
    const chips = w.findAll('.people .chips .chip')
    const teacherChip = chips.find((c) => c.text() === '乡村教师')
    await teacherChip.trigger('click')
    const cards = w.findAll('.person-card')
    expect(cards.length).toBeGreaterThan(0)
    expect(cards.length).toBeLessThan(8)
    expect(w.text()).toContain('刘老师')
    w.unmount()
  })

  it('点人物卡打开采访弹窗', async () => {
    const w = mount(PracticeView, { global: { stubs }, attachTo: document.body })
    await w.find('.person-card').trigger('click')
    await w.vm.$nextTick()
    expect(document.body.textContent).toContain('采访故事')
    w.unmount()
  })

  it('点成果卡触发 Toast「详情页即将上线」', async () => {
    const w = mount(PracticeView, { global: { stubs }, attachTo: document.body })
    await w.find('.result-card').trigger('click')
    await w.vm.$nextTick()
    expect(document.body.textContent).toContain('详情页即将上线')
    w.unmount()
  })
})
