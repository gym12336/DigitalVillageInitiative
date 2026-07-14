import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PeopleWall from '@/modules/practice/mine/PeopleWall.vue'

describe('PeopleWall', () => {
  it('renders people cards with name and role', () => {
    const items = [
      { name: '张三', role: '村支书', quote: '竹编是村的根', story: '', highlight: '' },
      { name: '李四', role: '', quote: '', story: '返乡创业故事', highlight: '返乡青年' },
    ]
    const w = mount(PeopleWall, { props: { items } })
    expect(w.text()).toContain('人物故事墙')
    expect(w.text()).toContain('张三')
    expect(w.text()).toContain('村支书')
    expect(w.text()).toContain('竹编是村的根')
    expect(w.text()).toContain('李四')
    expect(w.text()).toContain('返乡创业故事')
    expect(w.text()).toContain('返乡青年')
    expect(w.findAll('.person')).toHaveLength(2)
    w.unmount()
  })

  it('shows avatar initial', () => {
    const items = [{ name: '张三', role: '', quote: '', story: '', highlight: '' }]
    const w = mount(PeopleWall, { props: { items } })
    expect(w.text()).toContain('张')
    w.unmount()
  })

  it('renders nothing when items empty', () => {
    const w = mount(PeopleWall, { props: { items: [] } })
    expect(w.text()).toBe('')
    w.unmount()
  })
})
