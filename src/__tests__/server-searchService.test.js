import { describe, it, expect, vi } from 'vitest'
import { searchVillage } from '../../server/services/searchService.js'

const API_KEY = 'test-key'

function bingResult(items) {
  return items.map(([title, url, snippet]) => ({ title, url, snippet }))
}

describe('server/services/searchService.searchVillage', () => {
  it('四个维度并发搜索，合并去重结果', async () => {
    // 每个维度的 mock 返回不同结果
    const mockSearchBing = vi.fn()
      .mockResolvedValueOnce(bingResult([
        ['陈家铺村概况', 'https://a.com/1', '位于浙江...'],
        ['陈家铺村人口', 'https://a.com/2', '人口约...'],
      ])) // overview
      .mockResolvedValueOnce(bingResult([
        ['陈家铺村发展困难', 'https://b.com/1', '交通不便...'],
      ])) // painPoints
      .mockResolvedValueOnce(bingResult([
        ['大学生帮扶陈家铺', 'https://c.com/1', '此前有...'],
      ])) // existingPractices
      .mockResolvedValueOnce(bingResult([
        ['陈家铺竹编非遗', 'https://d.com/1', '传统竹编...'],
        ['陈家铺村概况', 'https://a.com/1', '位于浙江...'], // 重复 URL → 应去重
      ])) // resources

    const { results } = await searchVillage({
      village: '陈家铺村',
      idea: '帮村民把竹编卖出去',
      apiKey: API_KEY,
      searchBingImpl: mockSearchBing,
    })

    // 4 个维度都调了 searchBing
    expect(mockSearchBing).toHaveBeenCalledTimes(4)

    // 去重后应有 5 条（resources 里重复那条被去掉）
    expect(results.length).toBeGreaterThanOrEqual(4)
    expect(results.length).toBeLessThanOrEqual(5)

    // 每条都有 dimension + relevance
    for (const r of results) {
      expect(r).toHaveProperty('title')
      expect(r).toHaveProperty('url')
      expect(r).toHaveProperty('snippet')
      expect(r).toHaveProperty('dimension')
      expect(['overview', 'painPoints', 'existingPractices', 'resources']).toContain(r.dimension)
      expect(['high', 'medium', 'low']).toContain(r.relevance)
    }

    // 标题含"陈家铺村" → relevance: high
    const highItems = results.filter((r) => r.relevance === 'high')
    expect(highItems.length).toBeGreaterThan(0)
    for (const r of highItems) {
      expect(r.title).toContain('陈家铺村')
    }
  })

  it('某维度失败（返回空数组）不影响其他维度', async () => {
    const mockSearchBing = vi.fn()
      .mockResolvedValueOnce(bingResult([['A', 'https://a.com', '...']])) // overview 成功
      .mockResolvedValueOnce([]) // painPoints 无结果
      .mockResolvedValueOnce(bingResult([['B', 'https://b.com', '...']])) // existingPractices 成功
      .mockResolvedValueOnce([]) // resources 无结果

    const { results } = await searchVillage({
      village: '陈家铺村',
      searchBingImpl: mockSearchBing,
    })

    // 成功维度的结果正常返回
    expect(results.length).toBe(2)
  })

  it('所有维度均无结果 → 返回 { results: [] }', async () => {
    const mockSearchBing = vi.fn().mockResolvedValue([])

    const { results } = await searchVillage({
      village: '无人村',
      searchBingImpl: mockSearchBing,
    })

    expect(results).toEqual([])
  })

  it('每维度截断 top 3', async () => {
    // overview 返回 5 条 → 只保留前 3
    const five = bingResult([
      ['1', 'https://a.com/1', ''], ['2', 'https://a.com/2', ''],
      ['3', 'https://a.com/3', ''], ['4', 'https://a.com/4', ''],
      ['5', 'https://a.com/5', ''],
    ])
    const mockSearchBing = vi.fn()
      .mockResolvedValueOnce(five) // overview: 5 条
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const { results } = await searchVillage({
      village: '测试村',
      searchBingImpl: mockSearchBing,
    })

    const overviewResults = results.filter((r) => r.dimension === 'overview')
    expect(overviewResults.length).toBeLessThanOrEqual(3)
  })

  it('搜索词中包含 idea 前 20 字', async () => {
    const mockSearchBing = vi.fn().mockResolvedValue([])

    await searchVillage({
      village: '陈家铺村',
      idea: '帮村民把竹编手工艺品卖到全国各地去增加收入改善生活',
      searchBingImpl: mockSearchBing,
    })

    // 至少一个维度的搜索词含 idea 片段
    const allQueries = mockSearchBing.mock.calls.map((c) => c[0])
    const hasIdeaFragment = allQueries.some((q) => q.includes('帮村民把竹编手工艺品卖到全国各地') || q.includes('竹编'))
    expect(hasIdeaFragment).toBe(true)
  })
})
