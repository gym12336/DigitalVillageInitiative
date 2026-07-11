import { describe, it, expect } from 'vitest'
import { relatedDemands } from '@/modules/voice/related.js'

const all = [
  { id: 'a', town: '四都乡', type: '文化挖掘', majors: ['设计类', '传媒类'], views: 100 },
  { id: 'b', town: '四都乡', type: '产业帮扶', majors: ['电商类'], views: 50 },        // 同乡镇 +3
  { id: 'c', town: '西递镇', type: '文化挖掘', majors: ['设计类'], views: 80 },        // 同类型 +2 + 共同专业设计类 +1 = 3
  { id: 'd', town: '西递镇', type: '乡村规划', majors: ['传媒类'], views: 200 },        // 共同专业传媒类 +1
  { id: 'e', town: '别处', type: '别的', majors: ['环境类'], views: 999 },              // 0 分,不入选
]
const current = all[0] // a

describe('relatedDemands', () => {
  it('按分数排序(b=3 同乡镇, c=3 同类型+专业, d=1 单专业),同分按浏览量,排除自身', () => {
    // b(town+3, views50) 与 c(type+2+major+1=3, views80) 同分,c 浏览更高排前 → c,b,d
    const result = relatedDemands(current, all, 3)
    expect(result.map((d) => d.id)).toEqual(['c', 'b', 'd'])
    expect(result.find((d) => d.id === 'a')).toBeUndefined()
  })

  it('排除 0 分项(无任何共同维度)', () => {
    const result = relatedDemands(current, all, 10)
    expect(result.find((d) => d.id === 'e')).toBeUndefined()
  })

  it('限制返回不超过 n 条', () => {
    expect(relatedDemands(current, all, 1)).toHaveLength(1)
    expect(relatedDemands(current, all, 2)).toHaveLength(2)
  })

  it('同分时按浏览量降序', () => {
    const items = [
      { id: 'x', town: '甲', type: 't', majors: [], views: 10 },
      { id: 'lo', town: '甲', type: 'o', majors: [], views: 5 },   // 同乡镇 +3
      { id: 'hi', town: '甲', type: 'o', majors: [], views: 30 },  // 同乡镇 +3,浏览更高
    ]
    const result = relatedDemands(items[0], items, 2)
    expect(result.map((d) => d.id)).toEqual(['hi', 'lo'])
  })

  it('边界:current 为空或 all 非数组返回 []', () => {
    expect(relatedDemands(null, all)).toEqual([])
    expect(relatedDemands(current, null)).toEqual([])
  })
})

