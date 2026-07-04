import { describe, it, expect } from 'vitest'
import { filterPeople, filterResults, sortResults } from '@/modules/practice/practice-filters'

const people = [
  { id: 'a', name: '陈大爷', role: '非遗竹编传承人', tags: ['非遗传承人', '竹编', '老村民'] },
  { id: 'b', name: '王村长', role: '村委会主任', tags: ['村干部', '乡村治理'] },
  { id: 'c', name: '刘老师', role: '乡村教师', tags: ['乡村教师', '教育'] },
]
const results = [
  { id: 'r1', title: '竹编调研', school: '浙江大学', team: '浙大团', village: '陈家铺村', type: '文化挖掘', form: '调研报告', year: 2026, views: 100, likes: 10, downloads: 5 },
  { id: 'r2', title: '古建研究', school: '东南大学', team: '东大团', village: '宏村', type: '乡村规划', form: '设计方案', year: 2025, views: 300, likes: 5, downloads: 50 },
  { id: 'r3', title: '生态旅游', school: '兰州大学', team: '兰大团', village: '扎尕那村', type: '乡村规划', form: '数据可视化', year: 2024, views: 200, likes: 30, downloads: 20 },
]

describe('filterPeople', () => {
  it('全部返回全体', () => expect(filterPeople(people, '全部')).toHaveLength(3))
  it('按标签命中（tags 或 role）', () => {
    expect(filterPeople(people, '竹编').map((p) => p.id)).toEqual(['a'])
    expect(filterPeople(people, '乡村教师').map((p) => p.id)).toEqual(['c'])
  })
  it('不改入参', () => { const c = [...people]; filterPeople(people, '竹编'); expect(people).toEqual(c) })
})

describe('filterResults', () => {
  it('清除筛选（全部）返回全量', () => expect(filterResults(results, {})).toHaveLength(3))
  it('按类型过滤', () => expect(filterResults(results, { type: '乡村规划' }).map((r) => r.id)).toEqual(['r2', 'r3']))
  it('按形式过滤', () => expect(filterResults(results, { form: '调研报告' }).map((r) => r.id)).toEqual(['r1']))
  it('按年份过滤（数字/字符串皆可）', () => expect(filterResults(results, { year: 2026 }).map((r) => r.id)).toEqual(['r1']))
  it('关键词匹配学校/村，大小写不敏感', () => {
    expect(filterResults(results, { keyword: '浙江大学' }).map((r) => r.id)).toEqual(['r1'])
    expect(filterResults(results, { keyword: '宏村' }).map((r) => r.id)).toEqual(['r2'])
  })
  it('多条件叠加', () => expect(filterResults(results, { type: '乡村规划', form: '数据可视化' }).map((r) => r.id)).toEqual(['r3']))
})

describe('sortResults', () => {
  it('latest 按年份降序', () => expect(sortResults(results, 'latest').map((r) => r.year)).toEqual([2026, 2025, 2024]))
  it('views 降序', () => expect(sortResults(results, 'views').map((r) => r.id)).toEqual(['r2', 'r3', 'r1']))
  it('likes 降序', () => expect(sortResults(results, 'likes').map((r) => r.id)).toEqual(['r3', 'r1', 'r2']))
  it('downloads 降序', () => expect(sortResults(results, 'downloads').map((r) => r.id)).toEqual(['r2', 'r3', 'r1']))
  it('不改入参', () => { const c = [...results]; sortResults(results, 'views'); expect(results).toEqual(c) })
})
