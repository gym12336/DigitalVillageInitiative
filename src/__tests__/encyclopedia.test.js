import { describe, it, expect } from 'vitest'
import { buildRegionTree, filterVillages, sortVillages, allHonors } from '@/lib/encyclopedia.js'

const sample = [
  { id: 'a', name: '陈家铺村', fullName: '浙江省丽水市松阳县四都乡陈家铺村', province: '浙江省', city: '丽水市', district: '松阳县', summary: '竹编之乡', honors: ['中国传统村落'], tags: { 文化类: ['非遗文化'] }, stats: { views: 100, favorites: 10, practices: 6 } },
  { id: 'b', name: '西递村', fullName: '安徽省黄山市黟县西递镇西递村', province: '安徽省', city: '黄山市', district: '黟县', summary: '徽派典范', honors: ['中国历史文化名村', '世界文化遗产'], tags: { 文化类: ['古建筑群'] }, stats: { views: 300, favorites: 5, practices: 5 } },
  { id: 'c', name: '宏村', fullName: '安徽省黄山市黟县宏村镇宏村', province: '安徽省', city: '黄山市', district: '黟县', summary: '画里乡村', honors: ['中国历史文化名村', '世界文化遗产'], tags: { 自然类: ['山水画卷'] }, stats: { views: 200, favorites: 30, practices: 7 } },
]

describe('buildRegionTree', () => {
  it('构建 省>市>区县>村 三级树', () => {
    const tree = buildRegionTree(sample)
    expect(Object.keys(tree)).toEqual(['浙江省', '安徽省'])
    expect(Object.keys(tree['安徽省']['黄山市'])).toEqual(['黟县'])
    expect(tree['安徽省']['黄山市']['黟县'].map((v) => v.id)).toEqual(['b', 'c'])
  })
})

describe('filterVillages', () => {
  it('无条件返回全部', () => expect(filterVillages(sample, {})).toHaveLength(3))
  it('按省过滤', () => expect(filterVillages(sample, { province: '安徽省' }).map((v) => v.id)).toEqual(['b', 'c']))
  it('按省+市+区县逐级过滤', () => expect(filterVillages(sample, { province: '安徽省', city: '黄山市', district: '黟县' })).toHaveLength(2))
  it('按荣誉过滤', () => expect(filterVillages(sample, { honor: '世界文化遗产' }).map((v) => v.id)).toEqual(['b', 'c']))
  it('关键词匹配村名/简介/标签，大小写不敏感', () => {
    expect(filterVillages(sample, { keyword: '竹编' }).map((v) => v.id)).toEqual(['a'])
    expect(filterVillages(sample, { keyword: '古建筑群' }).map((v) => v.id)).toEqual(['b'])
  })
  it('多条件叠加', () => expect(filterVillages(sample, { province: '安徽省', keyword: '画里' }).map((v) => v.id)).toEqual(['c']))
  it('不改入参', () => { const c = [...sample]; filterVillages(sample, { province: '安徽省' }); expect(sample).toEqual(c) })
})

describe('sortVillages', () => {
  it('latest 保持原序', () => expect(sortVillages(sample, 'latest').map((v) => v.id)).toEqual(['a', 'b', 'c']))
  it('views 降序', () => expect(sortVillages(sample, 'views').map((v) => v.id)).toEqual(['b', 'c', 'a']))
  it('favorites 降序', () => expect(sortVillages(sample, 'favorites').map((v) => v.id)).toEqual(['c', 'a', 'b']))
  it('practices 降序', () => expect(sortVillages(sample, 'practices').map((v) => v.id)).toEqual(['c', 'a', 'b']))
  it('不改入参', () => { const c = [...sample]; sortVillages(sample, 'views'); expect(sample).toEqual(c) })
})

describe('allHonors', () => {
  it('去重并计数，按计数降序', () => {
    expect(allHonors(sample)).toEqual([
      { honor: '中国历史文化名村', count: 2 },
      { honor: '世界文化遗产', count: 2 },
      { honor: '中国传统村落', count: 1 },
    ])
  })
})
