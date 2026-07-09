// src/__tests__/server-webSearch.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { searchBocha, searchBochaAI, clearSearchCache } from '../../server/lib/webSearch.js'

const API_KEY = 'test-bocha-key'

function bochaResponse(value) {
  return { code: 200, data: { webPages: { value } } }
}

describe('server/lib/webSearch.searchBocha', () => {
  beforeEach(() => {
    clearSearchCache()
  })
  afterEach(() => {
    clearSearchCache()
  })

  it('无 key（apiKey 为空串）→ 返回空数组', async () => {
    const results = await searchBocha('测试村 乡村振兴', '')
    expect(results).toEqual([])
  })

  it('无 key（apiKey 为 undefined 且 env 未配）→ 返回空数组', async () => {
    const results = await searchBocha('测试村', undefined)
    expect(results).toEqual([])
  })

  it('正常响应 → 解析并返回 { title, url, snippet } 数组', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => bochaResponse([
        { name: '陈家铺村概况', url: 'https://example.com/1', snippet: '陈家铺村位于...' },
        { name: '陈家铺产业', url: 'https://example.com/2', snippet: '竹编产业...' },
      ]),
    })
    const results = await searchBocha('陈家铺村 乡村振兴', API_KEY, mockFetch)
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      title: '陈家铺村概况',
      url: 'https://example.com/1',
      snippet: '陈家铺村位于...',
    })
    // 校验 fetch 参数：POST 到博查AI，带 JSON body
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.bochaai.com/v1/web-search')
    expect(opts.method).toBe('POST')
    expect(opts.headers).toHaveProperty('Content-Type', 'application/json')
    expect(opts.headers).toHaveProperty('Authorization', `Bearer ${API_KEY}`)
    const body = JSON.parse(opts.body)
    expect(body.query).toBe('陈家铺村 乡村振兴')
    expect(body.count).toBe(5)
  })

  it('博查AI API 返回非 ok HTTP 状态（403）→ 返回空数组', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    })
    const results = await searchBocha('test', API_KEY, mockFetch)
    expect(results).toEqual([])
  })

  it('博查AI API 返回 code !== 200 → 返回空数组', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 500, msg: 'Internal error', data: null }),
    })
    const results = await searchBocha('test', API_KEY, mockFetch)
    expect(results).toEqual([])
  })

  it('fetch 抛错（网络不可达）→ 返回空数组', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('网络错误'))
    const results = await searchBocha('test', API_KEY, mockFetch)
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
    const results = await searchBocha('test', API_KEY, mockFetch)
    expect(results).toEqual([])
  }, 10000)

  it('无 data.webPages 字段也不崩 → 返回空数组', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 200, data: {} }),
    })
    const results = await searchBocha('test', API_KEY, mockFetch)
    expect(results).toEqual([])
  })

  it('相同 query 24h 内命中缓存，不重复调用 fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => bochaResponse([{ name: 'X', url: 'https://x.com', snippet: '...' }]),
    })
    await searchBocha('陈家铺村', API_KEY, mockFetch)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    // 第二次：命中缓存，不再调 fetch
    await searchBocha('陈家铺村', API_KEY, mockFetch)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('缓存过期后（>24h）重新调 fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => bochaResponse([{ name: 'X', url: 'https://x.com', snippet: '...' }]),
    })
    const realNow = Date.now
    let fakeNow = 0
    globalThis.Date.now = () => fakeNow

    try {
      await searchBocha('陈家铺村', API_KEY, mockFetch)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      // 快进 25 小时 → 缓存过期
      fakeNow = 25 * 3600 * 1000
      await searchBocha('陈家铺村', API_KEY, mockFetch)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    } finally {
      globalThis.Date.now = realNow
    }
  })

  it('同一 query 的并发请求共享一个 in-flight Promise', async () => {
    let resolve
    const mockFetch = vi.fn().mockReturnValue(new Promise((r) => { resolve = r }))
    // 同时发起 3 个相同 query
    const p1 = searchBocha('并发村', API_KEY, mockFetch)
    const p2 = searchBocha('并发村', API_KEY, mockFetch)
    const p3 = searchBocha('并发村', API_KEY, mockFetch)
    // fetch 只被调用一次
    expect(mockFetch).toHaveBeenCalledTimes(1)
    resolve({
      ok: true,
      json: async () => bochaResponse([{ name: 'X', url: 'https://x.com', snippet: '...' }]),
    })
    await Promise.all([p1, p2, p3])
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

const AI_API_KEY = 'test-bocha-key'

function aiSearchResponse(answer, webpages) {
  const messages = []
  if (webpages && webpages.length) {
    messages.push({
      role: 'assistant', type: 'source', content_type: 'webpage',
      content: JSON.stringify({ webSearchUrl: '', value: webpages }),
    })
  }
  if (answer) {
    messages.push({
      role: 'assistant', type: 'answer', content_type: 'text',
      content: answer,
    })
  }
  return { code: 200, messages }
}

describe('server/lib/webSearch.searchBochaAI', () => {
  it('正常响应 → 解析 answer + references', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => aiSearchResponse(
        '陈家铺村位于浙江省松阳县，海拔800余米……',
        [
          { name: '陈家铺村概况', url: 'https://a.com/1', snippet: '位于浙江...' },
          { name: '陈家铺产业', url: 'https://a.com/2', snippet: '竹编...' },
        ],
      ),
    })

    const { answer, references } = await searchBochaAI('陈家铺村 基本概况', AI_API_KEY, mockFetch)

    expect(answer).toContain('陈家铺村位于浙江省松阳县')
    expect(references).toHaveLength(2)
    expect(references[0]).toEqual({
      title: '陈家铺村概况',
      url: 'https://a.com/1',
      snippet: '位于浙江...',
    })

    // 校验 fetch 参数
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.bochaai.com/v1/ai-search')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.query).toBe('陈家铺村 基本概况')
    expect(body.answer).toBe(true)
  })

  it('无 key → 返回空 { answer: \'\', references: [] }', async () => {
    const { answer, references } = await searchBochaAI('测试', '')
    expect(answer).toBe('')
    expect(references).toEqual([])
  })

  it('HTTP 非 ok → 返回空', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 403 })
    const { answer, references } = await searchBochaAI('test', AI_API_KEY, mockFetch)
    expect(answer).toBe('')
    expect(references).toEqual([])
  })

  it('响应 code !== 200 → 返回空', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 500, messages: [] }),
    })
    const { answer, references } = await searchBochaAI('test', AI_API_KEY, mockFetch)
    expect(answer).toBe('')
    expect(references).toEqual([])
  })

  it('超时 → 返回空', async () => {
    const mockFetch = vi.fn().mockImplementation((_url, { signal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })
    const { answer, references } = await searchBochaAI('test', AI_API_KEY, mockFetch)
    expect(answer).toBe('')
    expect(references).toEqual([])
  }, 20000)

  it('messages 中无 answer 类型 → answer 为空字符串', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => aiSearchResponse(null, [
        { name: 'X', url: 'https://x.com', snippet: '...' },
      ]),
    })
    const { answer, references } = await searchBochaAI('test', AI_API_KEY, mockFetch)
    expect(answer).toBe('')
    expect(references).toHaveLength(1) // references 仍能解析
  })
})
