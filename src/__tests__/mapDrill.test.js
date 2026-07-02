import { describe, it, expect } from 'vitest'
import { createDrill, drillDown, drillUp, goToDepth, breadcrumb, canDrill } from '@/lib/mapDrill.js'

describe('mapDrill 下钻状态机', () => {
  it('初始为全国单层', () => {
    const s = createDrill()
    expect(s.stack).toEqual([{ level: 'country', adcode: '100000', name: '全国' }])
    expect(breadcrumb(s)).toEqual(['全国'])
  })

  it('drillDown 逐级压栈 country→province→city→district', () => {
    let s = createDrill()
    s = drillDown(s, { adcode: '420000', name: '湖北省' })
    expect(s.stack.at(-1)).toEqual({ level: 'province', adcode: '420000', name: '湖北省' })
    s = drillDown(s, { adcode: '420100', name: '武汉市' })
    expect(s.stack.at(-1).level).toBe('city')
    s = drillDown(s, { adcode: '420115', name: '江夏区' })
    expect(s.stack.at(-1).level).toBe('district')
    expect(breadcrumb(s)).toEqual(['全国', '湖北省', '武汉市', '江夏区'])
  })

  it('canDrill 在区县末级为 false', () => {
    let s = createDrill()
    s = drillDown(s, { adcode: '420000', name: '湖北省' })
    s = drillDown(s, { adcode: '420100', name: '武汉市' })
    expect(canDrill(s)).toBe(true)
    s = drillDown(s, { adcode: '420115', name: '江夏区' })
    expect(canDrill(s)).toBe(false)
  })

  it('区县末级再 drillDown 不变（不越界）', () => {
    let s = createDrill()
    s = drillDown(s, { adcode: '420000', name: '湖北省' })
    s = drillDown(s, { adcode: '420100', name: '武汉市' })
    s = drillDown(s, { adcode: '420115', name: '江夏区' })
    const before = s.stack.length
    s = drillDown(s, { adcode: '999999', name: '越界' })
    expect(s.stack.length).toBe(before)
  })

  it('drillUp 出栈，全国层再 up 不变', () => {
    let s = createDrill()
    s = drillDown(s, { adcode: '420000', name: '湖北省' })
    s = drillUp(s)
    expect(breadcrumb(s)).toEqual(['全国'])
    s = drillUp(s)
    expect(breadcrumb(s)).toEqual(['全国'])
  })

  it('goToDepth 跳回指定深度（面包屑点击）', () => {
    let s = createDrill()
    s = drillDown(s, { adcode: '420000', name: '湖北省' })
    s = drillDown(s, { adcode: '420100', name: '武汉市' })
    s = goToDepth(s, 1)
    expect(breadcrumb(s)).toEqual(['全国', '湖北省'])
  })

  it('createDrill/drillDown 不修改原状态（不可变）', () => {
    const s0 = createDrill()
    const s1 = drillDown(s0, { adcode: '420000', name: '湖北省' })
    expect(s0.stack.length).toBe(1)
    expect(s1.stack.length).toBe(2)
  })
})
