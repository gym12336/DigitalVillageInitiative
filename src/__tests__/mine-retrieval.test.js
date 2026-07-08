import { describe, it, expect } from 'vitest'
import { retrieve, extractKeywords } from '@/modules/practice/mine/retrieval'

const sources = {
  villages: [
    {
      id: 'chenjiapu',
      name: '陈家铺村',
      summary: '悬崖上的古村落，非遗竹编之乡',
      fullName: '浙江省丽水市松阳县四都乡陈家铺村',
      tags: { 文化类: ['非遗文化', '传统技艺'], 产业类: ['手工艺之乡'] },
    },
    { id: 'zhagana', name: '扎尕那村', summary: '石匣子里的生态秘境', tags: { 自然类: ['雪山', '森林'] } },
  ],
  results: [
    { id: 'r1', title: '陈家铺村非遗竹编传承与产业化调研', school: '浙江大学', team: '浙大团', village: '陈家铺村', type: '文化挖掘' },
    { id: 'r2', title: '扎尕那生态旅游研究', school: '兰州大学', team: '兰大团', village: '扎尕那村', type: '乡村规划' },
  ],
  demands: [
    { id: 'v1', title: '陈家铺村非遗竹编品牌设计需求', town: '四都乡', village: '陈家铺村', type: '文化挖掘', majors: ['设计类'], desc: '竹编品牌VI设计' },
  ],
  guide: {
    categories: [
      { id: 'tools', name: '调研工具', items: [{ name: '田野调查方法手册', desc: '访谈与问卷设计' }] },
    ],
  },
}

describe('extractKeywords', () => {
  it('中文 n-gram 切词，含关键片段', () => {
    const kw = extractKeywords('去陈家铺村帮村民把竹编卖出去')
    // n-gram 会产出「陈家」「家铺」「竹编」等 2/3 字片段，供子串命中
    expect(kw).toContain('竹编')
    expect(kw).toContain('陈家')
    expect(kw.some((w) => w.length >= 2)).toBe(true)
  })
  it('空 idea 返回空数组', () => {
    expect(extractKeywords('')).toEqual([])
    expect(extractKeywords('   ')).toEqual([])
  })
})

describe('retrieve', () => {
  it('竹编/文化 idea 命中 village/result/demand 三来源', () => {
    const cards = retrieve('去陈家铺村帮村民把竹编卖出去', sources)
    const bySource = new Set(cards.map((c) => c.source))
    expect(bySource.has('village')).toBe(true)
    expect(bySource.has('result')).toBe(true)
    expect(bySource.has('demand')).toBe(true)
  })

  it('村庄名精确命中排序靠前（陈家铺村档案居首）', () => {
    const cards = retrieve('去陈家铺村帮村民把竹编卖出去', sources)
    expect(cards[0].source).toBe('village')
    expect(cards[0].title).toBe('陈家铺村')
    // 不应命中不相关的扎尕那村
    expect(cards.find((c) => c.title === '扎尕那村')).toBeUndefined()
  })

  it('无关 idea 返回空或低命中', () => {
    const cards = retrieve('今天天气不错适合散步', sources)
    expect(cards.length).toBe(0)
  })

  it('每张卡片含统一契约字段与可跳转 path', () => {
    const cards = retrieve('陈家铺村竹编', sources)
    const v = cards.find((c) => c.source === 'village')
    expect(v.path).toBe('/villages/chenjiapu')
    const r = cards.find((c) => c.source === 'result')
    expect(r.path).toBe('/practice')
    const d = cards.find((c) => c.source === 'demand')
    expect(d.path).toBe('/voice')
    for (const c of cards) {
      expect(c).toHaveProperty('source')
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('title')
      expect(c).toHaveProperty('path')
      expect(typeof c.score).toBe('number')
    }
  })

  it('空数据源不报错', () => {
    expect(retrieve('竹编', {})).toEqual([])
  })

  it('topic 参与打分：无关 idea + 文化主题命中文化类来源', () => {
    const cards = retrieve('今天天气不错', sources, { topic: '文化挖掘' })
    const bySource = new Set(cards.map((c) => c.source))
    expect(cards.length).toBeGreaterThan(0)
    expect(bySource.has('result') || bySource.has('demand') || bySource.has('village')).toBe(true)
  })

  it('village 显式精确加权：目标村置顶其来源', () => {
    const cards = retrieve('生态旅游', sources, { village: '扎尕那村' })
    const firstVillage = cards.find((c) => c.source === 'village')
    expect(firstVillage.title).toBe('扎尕那村')
  })

  it('不传 topic/village 时与旧签名结果一致（向后兼容）', () => {
    const a = retrieve('陈家铺村竹编', sources)
    const b = retrieve('陈家铺村竹编', sources, {})
    expect(b).toEqual(a)
  })

  it('idea 空但 topic 非空也能出结果', () => {
    const cards = retrieve('', sources, { topic: '竹编' })
    expect(cards.length).toBeGreaterThan(0)
  })
})
