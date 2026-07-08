import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock api.js
vi.mock('@/modules/practice/mine/api.js', () => ({
  apiSearchWeb: vi.fn(),
}))

import { apiSearchWeb } from '@/modules/practice/mine/api.js'
import { searchWeb } from '@/modules/practice/mine/retrieval.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('retrieval.searchWeb', () => {
  it('api 返回结果 → 格式化为检索卡片（source: web）', async () => {
    apiSearchWeb.mockResolvedValue([
      { title: '陈家铺村概况', url: 'https://a.com/1', snippet: '位于浙江...', dimension: 'overview', relevance: 'high' },
      { title: '竹编产业', url: 'https://b.com/1', snippet: '竹编是...', dimension: 'resources', relevance: 'medium' },
    ])

    const cards = await searchWeb('陈家铺村', '帮村民卖竹编')

    expect(cards).toHaveLength(2)
    expect(cards[0]).toEqual({
      source: 'web',
      id: 'https://a.com/1',
      title: '陈家铺村概况',
      sub: '位于浙江...',
      path: 'https://a.com/1',
      dimension: 'overview',
      relevance: 'high',
    })
    expect(cards[1].source).toBe('web')
    expect(cards[1].id).toBe('https://b.com/1')
  })

  it('api 返回空数组 → 返回空数组', async () => {
    apiSearchWeb.mockResolvedValue([])
    const cards = await searchWeb('陈家铺村', '')
    expect(cards).toEqual([])
  })

  it('api 抛错 → 返回空数组（吞错）', async () => {
    apiSearchWeb.mockRejectedValue(new Error('网络错误'))
    const cards = await searchWeb('陈家铺村', '')
    expect(cards).toEqual([])
  })
})
