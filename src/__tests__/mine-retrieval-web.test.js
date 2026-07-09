import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/modules/practice/mine/api.js', () => ({
  apiSearchWeb: vi.fn(),
}))

import { apiSearchWeb } from '@/modules/practice/mine/api.js'
import { searchWeb } from '@/modules/practice/mine/retrieval.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('retrieval.searchWeb', () => {
  it('api 返回 results + overview → 格式化为 { cards, overview }', async () => {
    apiSearchWeb.mockResolvedValue({
      results: [
        { title: '陈家铺村概况', url: 'https://a.com/1', snippet: '位于浙江...', dimension: 'overview', relevance: 'high' },
      ],
      overview: {
        answer: '陈家铺村位于浙江省松阳县……',
        references: [{ title: '源1', url: 'https://r.com', snippet: '...' }],
      },
    })

    const { cards, overview } = await searchWeb('陈家铺村', '帮村民卖竹编')

    expect(cards).toHaveLength(1)
    expect(cards[0].source).toBe('web')
    expect(cards[0].title).toBe('陈家铺村概况')
    expect(overview).not.toBeNull()
    expect(overview.answer).toContain('陈家铺村位于')
    expect(overview.references).toHaveLength(1)
  })

  it('api 返回空 results + overview=null → { cards: [], overview: null }', async () => {
    apiSearchWeb.mockResolvedValue({ results: [], overview: null })
    const { cards, overview } = await searchWeb('陈家铺村', '')
    expect(cards).toEqual([])
    expect(overview).toBeNull()
  })

  it('api 抛错 → { cards: [], overview: null }', async () => {
    apiSearchWeb.mockRejectedValue(new Error('网络错误'))
    const { cards, overview } = await searchWeb('陈家铺村', '')
    expect(cards).toEqual([])
    expect(overview).toBeNull()
  })
})
