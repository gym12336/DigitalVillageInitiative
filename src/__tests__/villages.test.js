import { describe, it, expect } from 'vitest'
import villages from '@/data/villages.json'
import { validateVillages, toScatterPoints, filterByRegion } from '@/lib/villages.js'

const CORE = ['id', 'name', 'fullName', 'province', 'city', 'district', 'adcode', 'coord', 'type', 'summary', 'status']

describe('villages 数据与库函数', () => {
  it('示例数据每条含全部核心字段且 coord 为 [lng,lat]', () => {
    const errors = validateVillages(villages, CORE)
    expect(errors).toEqual([])
  })

  it('id 唯一', () => {
    const ids = villages.map((v) => v.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('toScatterPoints 生成 {name,value:[lng,lat],id} 数组，跳过缺 coord 的村', () => {
    const pts = toScatterPoints([
      { id: 'a', name: 'A', coord: [100, 30] },
      { id: 'b', name: 'B', coord: null },
    ])
    expect(pts).toEqual([{ name: 'A', value: [100, 30], id: 'a' }])
  })

  it('filterByRegion 按 province 过滤', () => {
    const out = filterByRegion(villages, { level: 'province', name: '湖北省' })
    expect(out.length).toBe(villages.length)
    expect(filterByRegion(villages, { level: 'province', name: '河南省' })).toEqual([])
  })

  it('filterByRegion level=country 返回全部', () => {
    expect(filterByRegion(villages, { level: 'country' }).length).toBe(villages.length)
  })
})
