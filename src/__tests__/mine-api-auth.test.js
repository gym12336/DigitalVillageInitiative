import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  getToken,
  setToken,
  apiLogin,
  apiListDossiers,
  apiCreateDossier,
  apiGeneratePlan,
  apiSearchWeb,
} from '@/modules/practice/mine/api.js'

// 每例给一个可控的 fetch mock。
function mockFetch(status, bodyObj) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (bodyObj === undefined ? '' : JSON.stringify(bodyObj)),
  })
}

beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear()
  setToken('')
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('api.js token 存取', () => {
  it('setToken/getToken 往返，空串清除', () => {
    setToken('abc')
    expect(getToken()).toBe('abc')
    setToken('')
    expect(getToken()).toBe('')
  })
})

describe('api.js request 封装', () => {
  it('带 token 时自动加 Authorization 头', async () => {
    setToken('tok123')
    const f = mockFetch(200, { dossiers: [] })
    vi.stubGlobal('fetch', f)
    await apiListDossiers()
    const [, opts] = f.mock.calls[0]
    expect(opts.headers.Authorization).toBe('Bearer tok123')
  })

  it('POST 带 body 时序列化并设 Content-Type', async () => {
    const f = mockFetch(200, { user: { id: 1 } })
    vi.stubGlobal('fetch', f)
    await apiLogin({ username: 'a', password: 'b' })
    const [url, opts] = f.mock.calls[0]
    expect(url).toBe('/api/auth/login')
    expect(opts.method).toBe('POST')
    expect(opts.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opts.body)).toEqual({ username: 'a', password: 'b' })
  })

  it('非 2xx 抛带 status 与后端 error 消息的错误', async () => {
    vi.stubGlobal('fetch', mockFetch(403, { error: '你不是该队成员' }))
    await expect(apiCreateDossier(1, { id: 'x' })).rejects.toMatchObject({
      status: 403,
      message: '你不是该队成员',
    })
  })

  it('网络层失败 → status 0 + 可读消息', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
    await expect(apiListDossiers(1)).rejects.toMatchObject({ status: 0 })
  })

  it('列表接口带 teamId 查询参数并解包 dossiers 数组', async () => {
    const f = mockFetch(200, { dossiers: [{ id: 'a' }] })
    vi.stubGlobal('fetch', f)
    expect(await apiListDossiers(7)).toEqual([{ id: 'a' }])
    expect(f.mock.calls[0][0]).toContain('teamId=7')
  })

  it('建档把 teamId 合进 body', async () => {
    const f = mockFetch(201, { dossier: { id: 'x' } })
    vi.stubGlobal('fetch', f)
    await apiCreateDossier(4, { id: 'x', title: 'T' })
    const [url, opts] = f.mock.calls[0]
    expect(url).toBe('/api/dossiers')
    expect(JSON.parse(opts.body)).toEqual({ id: 'x', title: 'T', teamId: 4 })
  })

  it('apiGeneratePlan POST 到 /api/plan/generate 并解包 plan', async () => {
    const f = mockFetch(200, { plan: { source: 'ai', topic: 'X', phases: [] } })
    vi.stubGlobal('fetch', f)
    const plan = await apiGeneratePlan({
      idea: '去村里',
      refs: [{ source: 'village', id: 'v1' }],
      village: '陈家铺村',
      topic: '产业',
      startDate: '2026-07-10',
      endDate: '2026-07-20',
    })
    expect(plan.source).toBe('ai')
    const [url, opts] = f.mock.calls[0]
    expect(url).toBe('/api/plan/generate')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({
      idea: '去村里',
      refs: [{ source: 'village', id: 'v1' }],
      village: '陈家铺村',
      topic: '产业',
      startDate: '2026-07-10',
      endDate: '2026-07-20',
    })
  })
})

/** 模拟一个 200 响应。 */
function okJson(bodyObj) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(bodyObj),
  }
}

describe('apiSearchWeb', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('请求形状正确 → 路径 /api/search/web, method POST, body 含 village/idea', async () => {
    fetch.mockResolvedValueOnce(okJson({ results: [] }))
    await apiSearchWeb({ village: '陈家铺村', idea: '帮村民卖竹编' })
    const [url, opts] = fetch.mock.calls[fetch.mock.calls.length - 1]
    expect(url).toBe('/api/search/web')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.village).toBe('陈家铺村')
    expect(body.idea).toBe('帮村民卖竹编')
  })

  it('接口返回 results → 透传 { results, overview }', async () => {
    fetch.mockResolvedValueOnce(okJson({
      results: [{ title: 'X', url: 'https://x.com', snippet: '...', dimension: 'overview', relevance: 'high' }],
    }))
    const data = await apiSearchWeb({ village: '陈家铺村' })
    expect(data.results).toHaveLength(1)
    expect(data.results[0].title).toBe('X')
    expect(data.overview).toBeUndefined()
  })

  it('接口失败 → 返回 { results: [], overview: null }', async () => {
    fetch.mockRejectedValueOnce(new Error('网络错误'))
    const data = await apiSearchWeb({ village: '陈家铺村' })
    expect(data.results).toEqual([])
    expect(data.overview).toBeNull()
  })
})
