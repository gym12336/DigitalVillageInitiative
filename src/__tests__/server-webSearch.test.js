// src/__tests__/server-webSearch.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { searchBing, clearSearchCache } from '../../server/lib/webSearch.js'

const API_KEY = 'test-bing-key'

describe('server/lib/webSearch.searchBing', () => {
  beforeEach(() => {
    clearSearchCache()
  })
  afterEach(() => {
    clearSearchCache()
  })

  it('无 key（apiKey 为空串）→ 返回空数组', async () => {
    const results = await searchBing('测试村 乡村振兴', '')
    expect(results).toEqual([])
  })

  it('无 key（apiKey 为 undefined 且 env 未配）→ 返回空数组', async () => {
    const results = await searchBing('测试村', undefined)
    expect(results).toEqual([])
  })

  it('正常响应 → 解析并返回 { title, url, snippet } 数组', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        webPages: {
          value: [
            { name: '陈家铺村概况', url: 'https://example.com/1', snippet: '陈家铺村位于...' },
            { name: '陈家铺产业', url: 'https://example.com/2', snippet: '竹编产业...' },
          ],
        },
      }),
    })
    const results = await searchBing('陈家铺村 乡村振兴', API_KEY, mockFetch)
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      title: '陈家铺村概况',
      url: 'https://example.com/1',
      snippet: '陈家铺村位于...',
    })
    // 校验 fetch 参数
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const arg = mockFetch.mock.calls[0][0]
    expect(arg).toContain('api.bing.microsoft.com')
    expect(arg).toContain('q=')
    expect(arg).toContain('mkt=zh-CN')
  })

  it('Bing API 返回非 ok（401/403/429）→ 返回空数组', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    })
    const results = await searchBing('test', API_KEY, mockFetch)
    expect(results).toEqual([])
  })

  it('fetch 抛错（网络不可达）→ 返回空数组', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('网络错误'))
    const results = await searchBing('test', API_KEY, mockFetch)
    expect(results).toEqual([])
  })

  it('AbortController 超时 → 返回空数组', async () => {
    // 模拟一个会监听 abort signal 的 fetch（触发 AbortController 5s 超时）
    const mockFetch = vi.fn().mockImplementation((_url, { signal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })
    const results = await searchBing('test', API_KEY, mockFetch)
    expect(results).toEqual([])
  }, 10000)

  it('无 webPages 字段也不崩 → 返回空数组', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    const results = await searchBing('test', API_KEY, mockFetch)
    expect(results).toEqual([])
  })

  it('相同 query 24h 内命中缓存，不重复调用 fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        webPages: { value: [{ name: 'X', url: 'https://x.com', snippet: '...' }] },
      }),
    })
    await searchBing('陈家铺村', API_KEY, mockFetch)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    // 第二次：命中缓存，不再调 fetch
    await searchBing('陈家铺村', API_KEY, mockFetch)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('缓存过期后（>24h）重新调 fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        webPages: { value: [{ name: 'X', url: 'https://x.com', snippet: '...' }] },
      }),
    })
    const realNow = Date.now
    let fakeNow = 0
    globalThis.Date.now = () => fakeNow

    try {
      await searchBing('陈家铺村', API_KEY, mockFetch)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      // 快进 25 小时 → 缓存过期
      fakeNow = 25 * 3600 * 1000
      await searchBing('陈家铺村', API_KEY, mockFetch)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    } finally {
      globalThis.Date.now = realNow
    }
  })

  it('同一 query 的并发请求共享一个 in-flight Promise', async () => {
    let resolve
    const mockFetch = vi.fn().mockReturnValue(new Promise((r) => { resolve = r }))
    // 同时发起 3 个相同 query
    const p1 = searchBing('并发村', API_KEY, mockFetch)
    const p2 = searchBing('并发村', API_KEY, mockFetch)
    const p3 = searchBing('并发村', API_KEY, mockFetch)
    // fetch 只被调用一次
    expect(mockFetch).toHaveBeenCalledTimes(1)
    resolve({
      ok: true,
      json: async () => ({ webPages: { value: [{ name: 'X', url: 'https://x.com', snippet: '...' }] } }),
    })
    await Promise.all([p1, p2, p3])
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
