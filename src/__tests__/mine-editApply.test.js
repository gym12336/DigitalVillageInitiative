import { describe, it, expect } from 'vitest'
import { applyEditOp, describeOp } from '../modules/practice/mine/editApply.js'

function sample() {
  return {
    people: [
      { name: '王秀兰', role: '电商', quote: '回来才觉得自己是个人', category: '村民' },
      { name: '李书记', role: '村支书', quote: '', category: '村干部' },
    ],
    metricValues: [
      { name: '茶园面积', before: '120', after: '300', unit: '亩', category: '产业' },
      { name: '游客量', before: '300', after: '2100', unit: '人次', category: '产业' },
    ],
    places: [{ name: '上屋祠堂', date: '7/5', event: '测绘', category: '建筑遗存' }],
    materials: [{ name: '古建测绘报告', summary: '', theme: '古建保护' }],
  }
}

describe('applyEditOp', () => {
  it('update：改白名单字段成功', () => {
    const c = sample()
    const r = applyEditOp(c, { op: 'update', bucket: 'people', target: '王秀兰', field: 'category', value: '返乡青年' })
    expect(r.ok).toBe(true)
    expect(c.people[0].category).toBe('返乡青年')
  })

  it('update：字段不在白名单 → ok:false，不改', () => {
    const c = sample()
    const r = applyEditOp(c, { op: 'update', bucket: 'people', target: '王秀兰', field: 'confidence', value: '9' })
    expect(r.ok).toBe(false)
    expect(c.people[0].confidence).toBeUndefined()
  })

  it('update：target 匹配不到 → ok:false', () => {
    const c = sample()
    const r = applyEditOp(c, { op: 'update', bucket: 'people', target: '不存在', field: 'role', value: 'x' })
    expect(r.ok).toBe(false)
  })

  it('delete：按 name 删除', () => {
    const c = sample()
    const r = applyEditOp(c, { op: 'delete', bucket: 'metrics', target: '游客量' })
    expect(r.ok).toBe(true)
    expect(c.metricValues.map((m) => m.name)).toEqual(['茶园面积'])
  })

  it('merge_category：把源分类下所有项归入目标分类', () => {
    const c = sample()
    const r = applyEditOp(c, { op: 'merge_category', bucket: 'people', target: '村民', value: '村干部' })
    expect(r.ok).toBe(true)
    expect(c.people.every((p) => p.category === '村干部')).toBe(true)
  })

  it('merge_category：没有匹配分类 → ok:false', () => {
    const c = sample()
    const r = applyEditOp(c, { op: 'merge_category', bucket: 'people', target: '外星人', value: '村民' })
    expect(r.ok).toBe(false)
  })

  it('metrics 桶映射到 metricValues 数组', () => {
    const c = sample()
    const r = applyEditOp(c, { op: 'update', bucket: 'metrics', target: '茶园面积', field: 'after', value: '350' })
    expect(r.ok).toBe(true)
    expect(c.metricValues[0].after).toBe('350')
  })

  it('未知桶 → ok:false', () => {
    const r = applyEditOp(sample(), { op: 'update', bucket: 'summary', target: 'x', field: 'name', value: 'y' })
    expect(r.ok).toBe(false)
  })
})

describe('describeOp', () => {
  it('update 生成改前→改后预览', () => {
    const d = describeOp(sample(), { op: 'update', bucket: 'people', target: '王秀兰', field: 'category', value: '返乡青年' })
    expect(d.label).toBe('人物')
    expect(d.action).toBe('修改')
    expect(d.text).toContain('村民')
    expect(d.text).toContain('返乡青年')
  })

  it('delete/merge_category 生成描述', () => {
    expect(describeOp(sample(), { op: 'delete', bucket: 'metrics', target: '游客量' }).action).toBe('删除')
    expect(describeOp(sample(), { op: 'merge_category', bucket: 'people', target: '村民', value: '村干部' }).action).toBe('合并分类')
  })
})
