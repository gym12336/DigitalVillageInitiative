# 联网搜索增强方案生成 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 当平台检索结果不足 10 条时，自动通过 Bing Search API 多维度搜索目标村信息，以卡片展示供用户审核采纳，纳入方案生成上下文。

**Architecture:** 后端新增 `webSearch.js`（Bing API 薄封装 + 内存缓存）→ `searchService.js`（四维度并发编排）→ `routes/search.js`（`POST /api/search/web`，需登录）。前端 `retrieval.js` 新增 `searchWeb()` 格式化卡片，`StagePlan.vue` 在平台结果 < 10 时自动触发，`WebSearchModal.vue` 展示摘要弹窗。Bing key 未配或搜索失败静默跳过。

**Tech Stack:** Node.js 内置 fetch（Bing API 调用）、Vue 3 SFC（弹窗组件）、Vitest（单测，mock fetch）、supertest（路由冒烟测试）

## Global Constraints

- 平台检索结果 ≥ 10 条时不触发联网搜索；无目标村名时不触发
- `BING_SEARCH_API_KEY=` 留空则 searchService 直接返回空数组，前端无感
- Bing API 5s 超时、限流、网络失败均返回空数组，不抛错不阻塞
- 内存缓存：`Map<string, { data, ts }>`，key = 搜索词，TTL = 24h（86400000ms）
- 网络卡片 `source: 'web'`，source 标签显示「🌐 网络」，点击查看打开 WebSearchModal
- 搜索结果需用户手动采纳后才纳入方案生成（refs）
- 接口路径 `POST /api/search/web`，需登录（复用现有 auth 中间件）
- 全量 `vitest run` + `vite build` 不回归

---

## File Structure

```
新增:
  server/lib/webSearch.js              Bing API 封装 + 内存缓存
  server/services/searchService.js     多维度并发编排 + 去重排序
  server/routes/search.js              POST /api/search/web 路由
  src/modules/practice/mine/WebSearchModal.vue  网络结果详情弹窗

修改:
  .env                                 加 BING_SEARCH_API_KEY=
  .env.example                         加注释说明
  server/app.js                        挂载 /api/search 路由
  src/modules/practice/mine/api.js     加 apiSearchWeb()
  src/modules/practice/mine/retrieval.js  加 searchWeb()
  src/modules/practice/mine/StagePlan.vue  触发联网搜索 + 网络卡片渲染 + 弹窗

测试:
  src/__tests__/server-webSearch.test.js
  src/__tests__/server-searchService.test.js
  src/__tests__/server-searchRoutes.test.js (合并到 server-routes.test.js 或独立)
  src/__tests__/mine-api-searchWeb.test.js (合并到 mine-api-auth.test.js 或独立)
  src/__tests__/mine-retrieval-web.test.js
  src/__tests__/mine-stagePlan-web.test.js
```

---

### Task 1: 环境变量

**Files:**
- Modify: `.env`
- Modify: `.env.example`

**Interfaces:**
- Produces: `process.env.BING_SEARCH_API_KEY` 供 `server/lib/webSearch.js` 读取

- [ ] **Step 1: 在 .env 和 .env.example 中加 BING_SEARCH_API_KEY**

编辑 `.env`，在 `DEEPSEEK_API_KEY=` 下方新增一行：

```
# Bing Search API 密钥（Azure 门户申请，免费层 1000次/月）。留空则联网搜索静默跳过。
BING_SEARCH_API_KEY=
```

编辑 `.env.example`，同样新增：

```
# Bing Search API 密钥（Azure 门户申请）。留空则联网搜索静默跳过。
BING_SEARCH_API_KEY=
```

- [ ] **Step 2: 提交**

```bash
git add .env.example
git commit -m "chore: add BING_SEARCH_API_KEY env var"
```

> `.env` 不入仓（已在 .gitignore），仅本地编辑。

---

### Task 2: `server/lib/webSearch.js` — Bing API 封装 + 内存缓存

**Files:**
- Create: `server/lib/webSearch.js`
- Create: `src/__tests__/server-webSearch.test.js`

**Interfaces:**
- Produces: `searchBing(query, apiKey?, fetchImpl?) → [{ title, url, snippet }]`
  - `query: string` — 搜索词
  - `apiKey?: string` — 默认读 `process.env.BING_SEARCH_API_KEY`
  - `fetchImpl?: typeof fetch` — 依赖注入，便于单测
  - 返回 `Array<{ title: string, url: string, snippet: string }>`
  - 无 key / 超时 / 失败均返回 `[]`
- Produces: `clearSearchCache() → void` — 清空内存缓存（测试用）

- [ ] **Step 1: 写测试**

```js
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
    // 模拟永不 resolve 的 fetch（触发 AbortController 5s 超时）
    const mockFetch = vi.fn().mockImplementation(() => new Promise(() => {}))
    const results = await searchBing('test', API_KEY, mockFetch)
    expect(results).toEqual([])
  })

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
```

- [ ] **Step 2: 运行测试确认全部 FAIL（文件不存在）**

```bash
npx vitest run src/__tests__/server-webSearch.test.js
```

- [ ] **Step 3: 实现 `server/lib/webSearch.js`**

```js
// server/lib/webSearch.js
// Bing Web Search API v7 薄封装 + 内存缓存。
// 无 key / 超时 / 失败均返回空数组，由上层静默处理。

const ENDPOINT = 'https://api.bing.microsoft.com/v7.0/search'
const TIMEOUT_MS = 5000
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

// 内存缓存：key = 搜索词，value = { data, ts }
const cache = new Map()
// 并发去重：同一搜索词的 in-flight Promise
const inflight = new Map()

/**
 * 清空缓存（测试用）。
 */
export function clearSearchCache() {
  cache.clear()
  inflight.clear()
}

/**
 * 调 Bing Web Search API，返回搜索结果摘要数组。
 * @param {string} query - 搜索词
 * @param {string} [apiKey] - Bing API 密钥，默认读 process.env.BING_SEARCH_API_KEY
 * @param {Function} [fetchImpl] - fetch 实现，默认 globalThis.fetch（依赖注入便于测试）
 * @returns {Promise<Array<{ title: string, url: string, snippet: string }>>}
 */
export async function searchBing(query, apiKey, fetchImpl) {
  const key = typeof apiKey === 'string' ? apiKey : (process.env.BING_SEARCH_API_KEY || '')
  const fetchFn = fetchImpl || globalThis.fetch

  // 无 key → 静默跳过
  if (!key) return []

  // 检查缓存
  const cached = cache.get(query)
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
    return cached.data
  }

  // 检查是否已有相同 query 的 in-flight 请求
  const existing = inflight.get(query)
  if (existing) return existing

  const promise = (async () => {
    try {
      const url = new URL(ENDPOINT)
      url.searchParams.set('q', query)
      url.searchParams.set('count', '5')
      url.searchParams.set('mkt', 'zh-CN')

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

      let res
      try {
        res = await fetchFn(url.toString(), {
          headers: {
            'Ocp-Apim-Subscription-Key': key,
          },
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timer)
      }

      if (!res.ok) {
        console.warn(`[webSearch] Bing API HTTP ${res.status}`)
        return []
      }

      const data = await res.json()
      const values = data?.webPages?.value
      if (!Array.isArray(values) || !values.length) return []

      return values.map((v) => ({
        title: v.name || '',
        url: v.url || '',
        snippet: v.snippet || '',
      }))
    } catch (e) {
      if (e?.name === 'AbortError') {
        console.warn('[webSearch] Bing API 超时')
      } else {
        console.warn('[webSearch] 调用失败：', e?.message || e)
      }
      return []
    } finally {
      // 清理 in-flight 记录
      inflight.delete(query)
    }
  })()

  // 写缓存 + in-flight
  inflight.set(query, promise)
  try {
    const results = await promise
    // 只有成功拿到非空结果才缓存；空结果不缓存（下次可能配了 key 再试）
    if (results.length > 0) {
      cache.set(query, { data: results, ts: Date.now() })
    }
    return results
  } catch {
    return []
  }
}
```

- [ ] **Step 4: 运行测试确认全部 PASS**

```bash
npx vitest run src/__tests__/server-webSearch.test.js
```

- [ ] **Step 5: 提交**

```bash
git add server/lib/webSearch.js src/__tests__/server-webSearch.test.js
git commit -m "feat: add Bing Search API wrapper with memory cache"
```

---

### Task 3: `server/services/searchService.js` — 多维度并发编排

**Files:**
- Create: `server/services/searchService.js`
- Create: `src/__tests__/server-searchService.test.js`

**Interfaces:**
- Consumes: `searchBing(query, apiKey?, fetchImpl?) → [{ title, url, snippet }]` from Task 2
- Produces: `searchVillage({ village, idea?, apiKey?, fetchImpl? }) → { results: [{ title, url, snippet, dimension, relevance }] }`
  - `dimension: 'overview' | 'painPoints' | 'existingPractices' | 'resources'`
  - `relevance: 'high' | 'medium' | 'low'`

- [ ] **Step 1: 写测试**

```js
// src/__tests__/server-searchService.test.js
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
```

- [ ] **Step 2: 运行测试确认全部 FAIL**

```bash
npx vitest run src/__tests__/server-searchService.test.js
```

- [ ] **Step 3: 实现 `server/services/searchService.js`**

```js
// server/services/searchService.js
// 多维度联网搜索编排：四个维度并发搜 Bing → 去重 → 排序 → 截断。
// 某维度失败不影响其他维度；无结果返回空数组。

import { searchBing as defaultSearchBing } from '../lib/webSearch.js'

const IDEA_PREVIEW_LEN = 20

const DIMENSIONS = [
  {
    key: 'overview',
    buildQuery: (village, ideaPreview) =>
      `${village} 乡村振兴 产业 人口 概况${ideaPreview ? ' ' + ideaPreview : ''}`.trim(),
    topN: 3,
  },
  {
    key: 'painPoints',
    buildQuery: (village, ideaPreview) =>
      `${village} 发展困难 问题 需求${ideaPreview ? ' ' + ideaPreview : ''}`.trim(),
    topN: 3,
  },
  {
    key: 'existingPractices',
    buildQuery: (village, ideaPreview) =>
      `${village} 社会实践 帮扶 大学生${ideaPreview ? ' ' + ideaPreview : ''}`.trim(),
    topN: 3,
  },
  {
    key: 'resources',
    buildQuery: (village, ideaPreview) =>
      `${village} 特产 文化 旅游 非遗${ideaPreview ? ' ' + ideaPreview : ''}`.trim(),
    topN: 3,
  },
]

/**
 * 联网搜索目标村信息。
 * @param {object} opts
 * @param {string} opts.village - 目标村名（必填）
 * @param {string} [opts.idea] - 实践 idea
 * @param {string} [opts.apiKey] - Bing API key
 * @param {Function} [opts.searchBingImpl] - searchBing 实现（注入便于测试）
 * @returns {Promise<{ results: Array<{ title, url, snippet, dimension, relevance }> }>}
 */
export async function searchVillage({
  village,
  idea = '',
  apiKey,
  searchBingImpl,
} = {}) {
  const searchBingFn = searchBingImpl || defaultSearchBing
  const ideaPreview = String(idea || '').trim().slice(0, IDEA_PREVIEW_LEN)

  // 四个维度并发搜索
  const dimensionResults = await Promise.all(
    DIMENSIONS.map(async (dim) => {
      const query = dim.buildQuery(village, ideaPreview)
      let raw
      try {
        raw = await searchBingFn(query, apiKey)
      } catch {
        raw = []
      }
      // 截断 top N
      const sliced = (Array.isArray(raw) ? raw : []).slice(0, dim.topN)
      return sliced.map((r) => ({
        ...r,
        dimension: dim.key,
      }))
    }),
  )

  // 合并 + 按 URL 去重（保留先出现的维度）
  const seen = new Set()
  const merged = []
  for (const items of dimensionResults) {
    for (const item of items) {
      const url = (item.url || '').trim()
      if (!url || seen.has(url)) continue
      seen.add(url)
      merged.push(item)
    }
  }

  // 标注 relevance
  const villageLower = village.toLowerCase()
  const ideaKeywords = ideaPreview ? ideaPreview.split(/\s+/) : []
  for (const item of merged) {
    const titleLower = (item.title || '').toLowerCase()
    if (titleLower.includes(villageLower)) {
      item.relevance = 'high'
    } else if (ideaKeywords.some((kw) => titleLower.includes(kw.toLowerCase()))) {
      item.relevance = 'medium'
    } else {
      item.relevance = 'low'
    }
  }

  // 排序：relevance 高的在前；同 relevance 维度按定义顺序
  const dimOrder = Object.fromEntries(DIMENSIONS.map((d, i) => [d.key, i]))
  merged.sort((a, b) => {
    const rOrder = { high: 0, medium: 1, low: 2 }
    const rd = (rOrder[a.relevance] ?? 2) - (rOrder[b.relevance] ?? 2)
    if (rd !== 0) return rd
    return (dimOrder[a.dimension] ?? 99) - (dimOrder[b.dimension] ?? 99)
  })

  return { results: merged }
}
```

- [ ] **Step 4: 运行测试确认全部 PASS**

```bash
npx vitest run src/__tests__/server-searchService.test.js
```

- [ ] **Step 5: 提交**

```bash
git add server/services/searchService.js src/__tests__/server-searchService.test.js
git commit -m "feat: add multi-dimension web search orchestration service"
```

---

### Task 4: `server/routes/search.js` + `app.js` 挂载

**Files:**
- Create: `server/routes/search.js`
- Modify: `server/app.js`
- Modify: `src/__tests__/server-routes.test.js`（追加搜索路由冒烟测试）

**Interfaces:**
- Consumes: `searchVillage({ village, idea, apiKey })` from Task 3
- Consumes: `makeAuth(secret, db)` from existing `server/middleware/auth.js`
- Produces: `POST /api/search/web` — body `{ village, idea? }` → `{ results: [...] }`

- [ ] **Step 1: 在现有路由测试文件中追加搜索路由测试**

在 `src/__tests__/server-routes.test.js` 末尾追加一个 `describe` 块（无需新建文件）：

```js
// 在 file 末尾追加：

describe('/api/search/web', () => {
  it('未登录 → 401', async () => {
    const res = await request(app)
      .post('/api/search/web')
      .send({ village: '陈家铺村' })
    expect(res.status).toBe(401)
  })

  it('缺 village → 400', async () => {
    const token = await register('searchuser')
    const res = await request(app)
      .post('/api/search/web')
      .set(auth(token))
      .send({ idea: '帮村民' })
    expect(res.status).toBe(400)
  })

  it('正常请求（BING key 未配）→ 200 且 results 为空数组', async () => {
    const token = await register('searchuser2')
    const res = await request(app)
      .post('/api/search/web')
      .set(auth(token))
      .send({ village: '陈家铺村', idea: '帮村民卖竹编' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('results')
    expect(Array.isArray(res.body.results)).toBe(true)
    // 测试环境未配 BING key → results 为空
    expect(res.body.results).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试确认新增测试 FAIL**

```bash
npx vitest run src/__tests__/server-routes.test.js -t "/api/search/web"
```

- [ ] **Step 3: 实现 `server/routes/search.js`**

```js
// server/routes/search.js
// 联网搜索路由：POST /api/search/web，需登录。
import { Router } from 'express'
import { makeAuth } from '../middleware/auth.js'
import { httpError } from '../lib/validate.js'
import { searchVillage } from '../services/searchService.js'

/**
 * @param {object} deps - { db, secret, searchServiceImpl? }
 */
export function makeSearchRouter(db, secret, searchServiceImpl) {
  const router = Router()
  router.use(makeAuth(secret, db))

  const search = searchServiceImpl || searchVillage

  router.post('/web', async (req, res, next) => {
    try {
      const { village, idea } = req.body || {}
      if (!village || typeof village !== 'string' || !village.trim()) {
        throw httpError(400, '缺少目标村名称')
      }
      const { results } = await search({
        village: village.trim(),
        idea: typeof idea === 'string' ? idea : '',
      })
      res.json({ results })
    } catch (e) {
      next(e)
    }
  })

  return router
}
```

- [ ] **Step 4: 在 `server/app.js` 挂载路由**

在 `app.js` 中：

```js
// 在现有 import 后追加：
import { makeSearchRouter } from './routes/search.js'

// 在 createApp 中，app.use('/api/plan', ...) 后追加：
app.use('/api/search', makeSearchRouter(db, secret))
```

完整 diff：

```js
// server/app.js
import { makeSearchRouter } from './routes/search.js'

export function createApp({ db, secret }) {
  // ... 已有代码 ...
  app.use('/api/plan', makePlanRouter(db, secret))
  app.use('/api/search', makeSearchRouter(db, secret))  // 新增这一行

  app.use('/api', notFound)
  app.use(errorHandler)
  return app
}
```

- [ ] **Step 5: 运行测试确认 PASS**

```bash
npx vitest run src/__tests__/server-routes.test.js -t "/api/search/web"
```

- [ ] **Step 6: 确认已有路由测试不回归**

```bash
npx vitest run src/__tests__/server-routes.test.js
```

- [ ] **Step 7: 提交**

```bash
git add server/routes/search.js server/app.js src/__tests__/server-routes.test.js
git commit -m "feat: add POST /api/search/web route with auth"
```

---

### Task 5: `api.js` — 前端 API 客户端加 `apiSearchWeb`

**Files:**
- Modify: `src/modules/practice/mine/api.js`
- Modify: `src/__tests__/mine-api-auth.test.js`（追加测试）

**Interfaces:**
- Produces: `apiSearchWeb({ village, idea }) → results[]`
  - POST `/api/search/web`，body `{ village, idea }`
  - 失败返回 `[]`

- [ ] **Step 1: 在 api.js 末尾追加 `apiSearchWeb`**

```js
// 在 api.js 末尾追加（// —— 搜索域 ——）：

// —— 搜索域 ——

/**
 * 联网搜索目标村信息。失败返回空数组。
 */
export async function apiSearchWeb({ village, idea } = {}) {
  try {
    const data = await request('/api/search/web', {
      method: 'POST',
      body: { village, idea },
    })
    return (data && data.results) || []
  } catch {
    return []
  }
}
```

- [ ] **Step 2: 在 mine-api-auth.test.js 追加测试**

```js
// 在文件末尾追加：

describe('apiSearchWeb', () => {
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

  it('接口返回 results → 透传', async () => {
    fetch.mockResolvedValueOnce(okJson({
      results: [{ title: 'X', url: 'https://x.com', snippet: '...', dimension: 'overview', relevance: 'high' }],
    }))
    const results = await apiSearchWeb({ village: '陈家铺村' })
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('X')
  })

  it('接口失败 → 返回空数组', async () => {
    fetch.mockRejectedValueOnce(new Error('网络错误'))
    const results = await apiSearchWeb({ village: '陈家铺村' })
    expect(results).toEqual([])
  })
})
```

- [ ] **Step 3: 运行测试确认 PASS**

```bash
npx vitest run src/__tests__/mine-api-auth.test.js
```

- [ ] **Step 4: 提交**

```bash
git add src/modules/practice/mine/api.js src/__tests__/mine-api-auth.test.js
git commit -m "feat: add apiSearchWeb to frontend API client"
```

---

### Task 6: `retrieval.js` — 加 `searchWeb()` 卡片格式化

**Files:**
- Modify: `src/modules/practice/mine/retrieval.js`
- Create: `src/__tests__/mine-retrieval-web.test.js`

**Interfaces:**
- Consumes: `apiSearchWeb({ village, idea }) → results[]` from Task 5
- Produces: `searchWeb(village, idea) → cards[]`
  - 卡片结构：`{ source: 'web', id: url, title, sub: snippet, path: url, dimension, relevance }`
  - 失败返回 `[]`

- [ ] **Step 1: 写测试**

```js
// src/__tests__/mine-retrieval-web.test.js
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
```

- [ ] **Step 2: 运行测试确认 FAIL**

```bash
npx vitest run src/__tests__/mine-retrieval-web.test.js
```

- [ ] **Step 3: 实现**

在 `retrieval.js` 末尾追加：

```js
// 在 retrieval.js 末尾追加：

import { apiSearchWeb } from './api.js'

/**
 * 联网搜索目标村信息，结果格式化为统一检索卡片。
 * 失败吞错返回空数组——联网搜索是锦上添花，不阻塞主流程。
 * @param {string} village - 目标村名
 * @param {string} idea - 实践 idea
 * @returns {Promise<Array<{ source: 'web', id: string, title: string, sub: string, path: string, dimension: string, relevance: string }>>}
 */
export async function searchWeb(village, idea) {
  try {
    const results = await apiSearchWeb({ village, idea })
    return results.map((r) => ({
      source: 'web',
      id: r.url || '',
      title: r.title || '',
      sub: r.snippet || '',
      path: r.url || '',
      dimension: r.dimension || '',
      relevance: r.relevance || 'low',
    }))
  } catch {
    return []
  }
}
```

- [ ] **Step 4: 运行测试确认 PASS**

```bash
npx vitest run src/__tests__/mine-retrieval-web.test.js
```

- [ ] **Step 5: 提交**

```bash
git add src/modules/practice/mine/retrieval.js src/__tests__/mine-retrieval-web.test.js
git commit -m "feat: add searchWeb() card formatter to retrieval.js"
```

---

### Task 7: `WebSearchModal.vue` — 网络结果详情弹窗

**Files:**
- Create: `src/modules/practice/mine/WebSearchModal.vue`
- Create: `src/__tests__/mine-webSearchModal.test.js`

**Interfaces:**
- Props: `card: { title: string, sub: string, path: string }` — 网络卡片对象
- Emits: `close`, `adopt`
- 不依赖路由、不依赖 store

- [ ] **Step 1: 写测试**

```js
// src/__tests__/mine-webSearchModal.test.js
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WebSearchModal from '@/modules/practice/mine/WebSearchModal.vue'

const card = {
  source: 'web',
  id: 'https://example.com/village',
  title: '陈家铺村竹编产业发展纪实',
  sub: '陈家铺村位于浙江省松阳县，竹编技艺传承已有300余年历史...',
  path: 'https://example.com/village',
  dimension: 'resources',
  relevance: 'high',
}

describe('WebSearchModal', () => {
  it('渲染标题、URL、内容摘要', () => {
    const w = mount(WebSearchModal, {
      props: { card },
      attachTo: document.body,
    })
    expect(w.text()).toContain('陈家铺村竹编产业发展纪实')
    expect(w.text()).toContain('https://example.com/village')
    expect(w.text()).toContain('竹编技艺传承已有300余年历史')
    // 关闭后清理 DOM
    w.unmount()
  })

  it('点击关闭按钮 → emit close', async () => {
    const w = mount(WebSearchModal, { props: { card }, attachTo: document.body })
    const closeBtn = w.find('[aria-label="关闭"]')
    await closeBtn.trigger('click')
    expect(w.emitted('close')).toBeTruthy()
    w.unmount()
  })

  it('点击「打开原网页」→ 调用 window.open', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {})
    const w = mount(WebSearchModal, { props: { card }, attachTo: document.body })
    const openBtn = w.find('.modal-open-link')
    await openBtn.trigger('click')
    expect(openSpy).toHaveBeenCalledWith(card.path, '_blank')
    openSpy.mockRestore()
    w.unmount()
  })

  it('点击「采纳此信息」→ emit adopt 并 emit close', async () => {
    const w = mount(WebSearchModal, { props: { card }, attachTo: document.body })
    const adoptBtn = w.find('.modal-adopt')
    await adoptBtn.trigger('click')
    expect(w.emitted('adopt')).toBeTruthy()
    expect(w.emitted('close')).toBeTruthy()
    w.unmount()
  })

  it('点击遮罩层 → emit close', async () => {
    const w = mount(WebSearchModal, { props: { card }, attachTo: document.body })
    const overlay = w.find('.modal-overlay')
    await overlay.trigger('click')
    expect(w.emitted('close')).toBeTruthy()
    w.unmount()
  })

  it('snippet 为空时也不崩', () => {
    const emptyCard = { ...card, sub: '', title: '只有标题' }
    const w = mount(WebSearchModal, { props: { card: emptyCard }, attachTo: document.body })
    expect(w.text()).toContain('只有标题')
    w.unmount()
  })
})
```

- [ ] **Step 2: 运行测试确认 FAIL**

```bash
npx vitest run src/__tests__/mine-webSearchModal.test.js
```

- [ ] **Step 3: 实现 `WebSearchModal.vue`**

```vue
<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <header class="modal-header">
        <span class="modal-badge">🌐 网络</span>
        <button class="modal-close" aria-label="关闭" @click="$emit('close')">✕</button>
      </header>

      <h3 class="modal-title">{{ card.title }}</h3>

      <p class="modal-url">{{ card.path }}</p>

      <div class="modal-snippet">
        <p v-if="card.sub">{{ card.sub }}</p>
        <p v-else class="modal-no-snippet">（无内容摘要）</p>
      </div>

      <footer class="modal-footer">
        <button class="btn modal-open-link" @click="openOriginal">打开原网页 ↗</button>
        <button class="btn primary modal-adopt" @click="adopt">采纳此信息</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
defineProps({
  card: { type: Object, required: true },
})
const emit = defineEmits(['close', 'adopt'])

function openOriginal() {
  window.open(props.card.path, '_blank')
}
function adopt() {
  emit('adopt')
  emit('close')
}
</script>

<script>
// 解决 props 在 setup 外访问的问题：用标准方式定义
// （上述 openOriginal/adopt 里引用 props.card.path 需要 props 变量可用）
</script>
```

> **修正**：`<script setup>` 中 `defineProps` 返回的 props 需要赋给变量：

```vue
<script setup>
const props = defineProps({
  card: { type: Object, required: true },
})
const emit = defineEmits(['close', 'adopt'])

function openOriginal() {
  window.open(props.card.path, '_blank')
}
function adopt() {
  emit('adopt')
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center;
}
.modal-card {
  background: var(--color-card, #fff);
  border-radius: 16px; padding: 1.6rem; max-width: 520px; width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;
}
.modal-badge {
  font-size: .78rem; padding: .2rem .7rem; border-radius: 50px;
  background: #fff3e0; color: #e65100;
}
.modal-close {
  border: none; background: transparent; font-size: 1.2rem; cursor: pointer;
  color: var(--color-text-light, #888);
}
.modal-title {
  margin: 0 0 .5rem; font-size: 1.1rem; color: var(--color-text, #333);
}
.modal-url {
  margin: 0 0 1rem; font-size: .78rem; color: var(--color-text-light, #999);
  word-break: break-all;
}
.modal-snippet {
  margin-bottom: 1.4rem; padding: .8rem; background: var(--color-bg, #f9f9f9);
  border-radius: 10px; font-size: .88rem; line-height: 1.6; color: var(--color-text-secondary, #555);
  max-height: 180px; overflow-y: auto;
}
.modal-snippet p { margin: 0; }
.modal-no-snippet { color: var(--color-text-light, #999); font-style: italic; }
.modal-footer {
  display: flex; gap: .8rem; justify-content: flex-end;
}
.btn {
  border: none; border-radius: 50px; cursor: pointer; font-weight: 600;
  padding: .6rem 1.3rem; font-size: .88rem; transition: all .2s;
}
.btn.primary {
  background: var(--color-primary, #4a8fbf); color: #fff;
}
.btn.primary:hover { filter: brightness(1.1); }
.modal-open-link {
  background: transparent; border: 1px solid var(--color-border, #ddd);
  color: var(--color-text, #333);
}
.modal-open-link:hover { background: var(--color-bg, #f0f0f0); }
</style>
```

- [ ] **Step 4: 运行测试确认 PASS**

```bash
npx vitest run src/__tests__/mine-webSearchModal.test.js
```

- [ ] **Step 5: 提交**

```bash
git add src/modules/practice/mine/WebSearchModal.vue src/__tests__/mine-webSearchModal.test.js
git commit -m "feat: add WebSearchModal for viewing web search results"
```

---

### Task 8: `StagePlan.vue` — 集成联网搜索触发 + 网络卡片渲染

**Files:**
- Modify: `src/modules/practice/mine/StagePlan.vue`
- Create: `src/__tests__/mine-stagePlan-web.test.js`

**Interfaces:**
- Consumes: `searchWeb(village, idea)` from Task 6
- Consumes: `WebSearchModal.vue` from Task 7
- 改动点：
  1. 导入 `searchWeb` 和 `WebSearchModal`
  2. `onSearch()` 后检查 `cards.length < 10` 且有目标村名 → 触发 `searchWeb()`
  3. 网络卡片 source 标签显示「🌐 网络」
  4. 网络卡片点击「查看」→ 打开 WebSearchModal
  5. 模态弹窗控制（`selectedWebCard` ref）

- [ ] **Step 1: 写测试**

```js
// src/__tests__/mine-stagePlan-web.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// mock retrieval（含 searchWeb + retrieve）
vi.mock('@/modules/practice/mine/retrieval.js', () => ({
  retrieve: vi.fn(() => []),
  searchWeb: vi.fn(),
  extractKeywords: vi.fn(() => []),
}))

import StagePlan from '@/modules/practice/mine/StagePlan.vue'
import * as retrieval from '@/modules/practice/mine/retrieval.js'

const stubs = {
  'router-link': { props: ['to'], template: '<a><slot /></a>' },
}
const globalOpts = { stubs, mocks: { $router: { push: vi.fn() } } }

function fullDossier(overrides = {}) {
  return {
    id: 'd', title: 'T', idea: '', village: '', plan: {
      goal: '', topic: '', targetVillage: '', metrics: [], expected: '',
      background: '', methods: [], risks: [], phases: [], source: '',
    },
    refs: [], collected: { metricValues: [], materials: [], people: [] },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('StagePlan 联网搜索集成', () => {
  it('平台检索结果 < 10 且有目标村 → 自动触发 searchWeb', async () => {
    retrieval.retrieve.mockReturnValue([
      { source: 'village', id: 'v1', title: 'X村', sub: '...', path: '/villages/v1', score: 5 },
    ]) // 仅 1 条 < 10
    retrieval.searchWeb.mockResolvedValue([
      { source: 'web', id: 'https://a.com', title: '搜索结果', sub: '摘要', path: 'https://a.com', dimension: 'overview', relevance: 'high' },
    ])

    const dossier = fullDossier({ village: '陈家铺村', idea: '帮村民卖竹编' })
    mount(StagePlan, { props: { dossier }, global: globalOpts })
    await flushPromises()

    expect(retrieval.searchWeb).toHaveBeenCalledWith('陈家铺村', '帮村民卖竹编')
  })

  it('平台检索结果 ≥ 10 → 不触发 searchWeb', async () => {
    const tenCards = Array.from({ length: 10 }, (_, i) => ({
      source: 'village', id: `v${i}`, title: `村${i}`, sub: '', path: `/v/${i}`, score: i,
    }))
    retrieval.retrieve.mockReturnValue(tenCards)

    const dossier = fullDossier({ village: '陈家铺村', idea: 'test' })
    mount(StagePlan, { props: { dossier }, global: globalOpts })
    await flushPromises()

    expect(retrieval.searchWeb).not.toHaveBeenCalled()
  })

  it('无目标村名 → 不触发 searchWeb', async () => {
    retrieval.retrieve.mockReturnValue([])
    const dossier = fullDossier({ village: '', idea: '' })
    mount(StagePlan, { props: { dossier }, global: globalOpts })
    await flushPromises()
    expect(retrieval.searchWeb).not.toHaveBeenCalled()
  })

  it('网络卡片显示 🌐 网络 source 标签', async () => {
    retrieval.retrieve.mockReturnValue([])
    retrieval.searchWeb.mockResolvedValue([
      { source: 'web', id: 'https://a.com', title: '搜索结果', sub: '...', path: 'https://a.com', dimension: 'overview', relevance: 'high' },
    ])

    const dossier = fullDossier({ village: '陈家铺村', idea: 'test' })
    const w = mount(StagePlan, { props: { dossier }, global: globalOpts })
    await flushPromises()

    const sourceLabels = w.findAll('.ret-source')
    const webLabel = sourceLabels.find((el) => el.text().includes('网络'))
    expect(webLabel).toBeTruthy()
    expect(webLabel.classes()).toContain('src-web')
  })

  it('点击网络卡片「查看」→ 打开 WebSearchModal', async () => {
    retrieval.retrieve.mockReturnValue([])
    retrieval.searchWeb.mockResolvedValue([
      { source: 'web', id: 'https://a.com', title: '搜索结果', sub: '...', path: 'https://a.com', dimension: 'overview', relevance: 'high' },
    ])

    const dossier = fullDossier({ village: '陈家铺村', idea: 'test' })
    const w = mount(StagePlan, { props: { dossier }, global: globalOpts })
    await flushPromises()

    // 初始无弹窗
    expect(w.find('.modal-overlay').exists()).toBe(false)

    // 点击查看
    const viewLink = w.find('.ret-link')
    await viewLink.trigger('click')

    // 弹窗出现
    expect(w.find('.modal-overlay').exists()).toBe(true)
  })

  it('网络卡片「采纳」→ 加入 refs', async () => {
    retrieval.retrieve.mockReturnValue([])
    const webCard = {
      source: 'web', id: 'https://a.com', title: '搜索结果', sub: '...', path: 'https://a.com', dimension: 'overview', relevance: 'high',
    }
    retrieval.searchWeb.mockResolvedValue([webCard])

    const dossier = fullDossier({ village: '陈家铺村', idea: 'test' })
    const w = mount(StagePlan, { props: { dossier }, global: globalOpts })
    await flushPromises()

    // 点击采纳
    const adoptBtn = w.find('.ret-card .btn.tiny')
    await adoptBtn.trigger('click')

    // 检查 update 事件中 refs 包含该卡片
    const updates = w.emitted('update')
    const lastUpdate = updates[updates.length - 1][0]
    expect(lastUpdate.refs).toBeDefined()
    expect(lastUpdate.refs.some((r) => r.source === 'web' && r.id === 'https://a.com')).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试确认 FAIL**

```bash
npx vitest run src/__tests__/mine-stagePlan-web.test.js
```

- [ ] **Step 3: 修改 StagePlan.vue**

**3a. 在 `<script setup>` 顶部导入区加：**

```js
import { searchWeb } from './retrieval.js'
import WebSearchModal from './WebSearchModal.vue'
```

**3b. 在 script 中加状态与方法：**

在 `const riskDraft = ref('')` 后追加：

```js
// 网络搜索状态
const webCards = ref([])
const selectedWebCard = ref(null)
```

在 `onSearch` 函数末尾追加联网搜索逻辑：

```js
async function onSearch() {
  const idea = ideaInput.value.trim()
  cards.value = retrieve(idea, retrievalSources, {
    topic: props.dossier.plan?.topic,
    village: props.dossier.village,
  })
  searched.value = true
  emit('update', { idea })

  // 联网搜索增强：平台结果 < 10 且有目标村 → 自动补搜
  await maybeSearchWeb()
}
```

新增 `maybeSearchWeb` 函数：

```js
const WEB_SEARCH_THRESHOLD = 10

async function maybeSearchWeb() {
  // 仅当平台结果少于阈值且有目标村名时才触发
  if (cards.value.length >= WEB_SEARCH_THRESHOLD) return

  const village = getTargetVillage()
  if (!village) return

  webCards.value = await searchWeb(village, ideaInput.value.trim())
  // 合并到 cards（按 URL 去重：不与已有平台卡片重叠）
  const existingUrls = new Set(cards.value.map((c) => c.path || ''))
  for (const wc of webCards.value) {
    if (!existingUrls.has(wc.path)) {
      cards.value.push(wc)
    }
  }
}

/** 取目标村名：优先 dossier.village → idea 正则提取 */
function getTargetVillage() {
  const v = (props.dossier.village || '').trim()
  if (v) return v
  const text = ideaInput.value.trim()
  const re = /(?:去|到|在|帮|为|给|助)?([一-龥]{2,4}村)/g
  let m
  while ((m = re.exec(text))) {
    const name = m[1]
    if (/(乡村|农村|山村)$/.test(name)) continue
    return name
  }
  return ''
}
```

在 `goTo` 函数后追加网络卡片点击逻辑：

```js
function onViewWebCard(card) {
  if (card.source === 'web') {
    selectedWebCard.value = card
    return
  }
  // 平台卡片走原有路由跳转
  goTo(card.path)
}
```

**3c. 改模板：**

把卡片区 `.ret-card` 里的「查看」链接改造为区分来源：

```html
<a
  class="ret-link"
  :href="c.source === 'web' ? '#' : '#' + c.path"
  @click.prevent="onViewWebCard(c)"
>查看 ↗</a>
```

在 source 标签处为 web 来源加样式类：

```html
<span class="ret-source" :class="'src-' + c.source">{{ sourceLabel(c.source) }}</span>
```

在 `SOURCE_LABELS` 中加：

```js
const SOURCE_LABELS = { village: '乡村百科', result: '实践成果', demand: '乡村之声', guide: '实践攻略', web: '🌐 网络' }
```

在 template 末尾（`</template>` 前）加弹窗：

```html
<WebSearchModal
  v-if="selectedWebCard"
  :card="selectedWebCard"
  @close="selectedWebCard = null"
  @adopt="onAdoptWebCard"
/>
```

加 `onAdoptWebCard` 方法：

```js
function onAdoptWebCard() {
  if (!selectedWebCard.value) return
  toggleAdopt(selectedWebCard.value)
  selectedWebCard.value = null
}
```

**3d. 在 `<style scoped>` 中加网络卡片样式：**

在 `.src-guide` 样式后追加：

```css
.src-web { background: #e65100; }
```

- [ ] **Step 4: 运行测试确认 PASS**

```bash
npx vitest run src/__tests__/mine-stagePlan-web.test.js
```

- [ ] **Step 5: 确认已有 StagePlan 测试不回归**

```bash
npx vitest run src/__tests__/mine-stagePlan-ai.test.js src/__tests__/mine-stagePlan-shape.test.js
```

- [ ] **Step 6: 提交**

```bash
git add src/modules/practice/mine/StagePlan.vue src/__tests__/mine-stagePlan-web.test.js
git commit -m "feat: integrate web search into StagePlan with auto-trigger and modal"
```

---

### Task 9: 全量回归 + 构建

**Interfaces:**
- 不引入新接口，仅验证所有现有测试不回归

- [ ] **Step 1: 运行全量 Vitest**

```bash
npx vitest run
```

- [ ] **Step 2: 如有失败，逐一修复直到全 PASS**

- [ ] **Step 3: 运行 Vite 构建**

```bash
npx vite build
```

- [ ] **Step 4: 确认构建成功**

```bash
npx vite build
```

期望输出无 error，dist 产出正常。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "chore: full test suite and build pass after web search integration"
```
