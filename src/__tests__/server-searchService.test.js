import { describe, it, expect, vi } from 'vitest'
import { searchVillage } from '../../server/services/searchService.js'

const API_KEY = 'test-key'

function bochaResult(items) {
  return items.map(([title, url, snippet]) => ({ title, url, snippet }))
}

describe('server/services/searchService.searchVillage', () => {
  it('五个维度并发搜索，合并去重结果 + overview', async () => {
    const mockSearchBocha = vi.fn()
      .mockResolvedValueOnce(bochaResult([
        ['陈家铺村概况', 'https://a.com/1', '位于浙江...'],
        ['陈家铺村人口', 'https://a.com/2', '人口约...'],
      ])) // overview
      .mockResolvedValueOnce(bochaResult([
        ['陈家铺村发展困难', 'https://b.com/1', '交通不便...'],
      ])) // painPoints
      .mockResolvedValueOnce(bochaResult([
        ['大学生帮扶陈家铺', 'https://c.com/1', '此前有...'],
      ])) // existingPractices
      .mockResolvedValueOnce(bochaResult([
        ['陈家铺竹编非遗', 'https://d.com/1', '传统竹编...'],
        ['陈家铺村概况', 'https://a.com/1', '位于浙江...'], // 重复 URL → 应去重
      ])) // resources

    const mockSearchBochaAI = vi.fn().mockResolvedValue({
      answer: '陈家铺村位于浙江省松阳县……',
      references: [
        { title: '陈家铺村百科', url: 'https://r.com/1', snippet: '...' },
      ],
    })

    const { results, overview } = await searchVillage({
      village: '陈家铺村',
      idea: '帮村民把竹编卖出去',
      apiKey: API_KEY,
      searchBochaImpl: mockSearchBocha,
      searchBochaAIImpl: mockSearchBochaAI,
    })

    // 4 个 Web Search 维度 + 1 个 AI Search 维度
    expect(mockSearchBocha).toHaveBeenCalledTimes(4)
    expect(mockSearchBochaAI).toHaveBeenCalledTimes(1)
    expect(mockSearchBochaAI).toHaveBeenCalledWith('陈家铺村 基本概况 地理位置 人口 产业 文化特色', API_KEY)

    // overview 非 null
    expect(overview).not.toBeNull()
    expect(overview.answer).toContain('陈家铺村位于')
    expect(overview.references).toHaveLength(1)

    // results 照旧
    expect(results.length).toBeGreaterThanOrEqual(4)

    for (const r of results) {
      expect(r).toHaveProperty('dimension')
      expect(['overview', 'painPoints', 'existingPractices', 'resources']).toContain(r.dimension)
    }
  })

  it('AI Search 失败 → overview 为 null，results 不受影响', async () => {
    const mockSearchBocha = vi.fn()
      .mockResolvedValueOnce(bochaResult([['A', 'https://a.com', '...']]))
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const mockSearchBochaAI = vi.fn().mockResolvedValue({ answer: '', references: [] })

    const { results, overview } = await searchVillage({
      village: '陈家铺村',
      searchBochaImpl: mockSearchBocha,
      searchBochaAIImpl: mockSearchBochaAI,
    })

    expect(results.length).toBe(1) // Web Search 维度正常
    expect(overview).toBeNull()    // 空 answer → null
  })

  it('village 为空 → 不触发 AI Search 维度', async () => {
    const mockSearchBocha = vi.fn().mockResolvedValue([])
    const mockSearchBochaAI = vi.fn()

    const { overview } = await searchVillage({
      village: '',
      searchBochaImpl: mockSearchBocha,
      searchBochaAIImpl: mockSearchBochaAI,
    })

    expect(mockSearchBochaAI).not.toHaveBeenCalled()
    expect(overview).toBeNull()
  })

  it('所有维度均无结果 → 返回 { results: [], overview: null }', async () => {
    const mockSearchBocha = vi.fn().mockResolvedValue([])
    const mockSearchBochaAI = vi.fn().mockResolvedValue({ answer: '', references: [] })

    const { results, overview } = await searchVillage({
      village: '无人村',
      searchBochaImpl: mockSearchBocha,
      searchBochaAIImpl: mockSearchBochaAI,
    })

    expect(results).toEqual([])
    expect(overview).toBeNull()
  })
})
