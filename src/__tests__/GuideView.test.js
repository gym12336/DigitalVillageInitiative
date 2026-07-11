import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GuideView from '@/modules/guide/GuideView.vue'

const global = {
  stubs: {
    RouterLink: {
      props: ['to'],
      template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
    },
    Teleport: true,
  },
}

describe('GuideView', () => {
  it('渲染社会化方法手册、角色入口和四阶段路线', () => {
    const w = mount(GuideView, { global })

    expect(w.text()).toContain('数乡实践方法手册')
    expect(w.text()).toContain('学生团队')
    expect(w.text()).toContain('乡镇与村庄')
    expect(w.findAll('.stage-card')).toHaveLength(4)
    expect(w.text()).toContain('出发前')
    expect(w.text()).toContain('形成成果')

    w.unmount()
  })

  it('支持按关键词筛选工具资源', async () => {
    const w = mount(GuideView, { global })

    await w.find('.search-input').setValue('访谈')
    const resources = w.findAll('.resource-card')

    expect(resources.length).toBeGreaterThan(0)
    expect(resources.every((card) => card.text().includes('访谈'))).toBe(true)

    w.unmount()
  })
})
