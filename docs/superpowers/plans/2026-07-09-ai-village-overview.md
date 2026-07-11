# AI 村落概况 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-powered village overview to web search results using BoCha AI Search API, displayed as a pinned card above web results.

**Architecture:** New `searchBochaAI()` in webSearch.js calls `/v1/ai-search` with 15s timeout, returning `{ answer, references }`. searchService.js adds a `villageOverview` dimension that runs concurrently with existing 4 Web Search dimensions. Frontend `searchWeb()` now returns `{ cards, overview }` instead of bare array. `StagePlan.vue` renders overview as a styled card above the results grid.

**Tech Stack:** Node.js (Express 5), Vue 3, Vitest, BoCha AI Search API

## Global Constraints

- AI Search timeout: 15s (vs 5s for Web Search)
- AI Search failure must not block other dimensions
- Overview card: no "采纳" button (it's AI summary, not source material)
- Full `vitest run` must pass with no regressions
- No cache for AI Search (queries are village-specific, low repeat probability)
- Threshold for triggering web search: 15 (current value in StagePlan.vue)

---

### Task 1: Add `searchBochaAI()` to webSearch.js

**Files:**
- Modify: `server/lib/webSearch.js`
- Test: `src/__tests__/server-webSearch.test.js`

**Interfaces:**
- Produces: `searchBochaAI(query: string, apiKey?: string, fetchImpl?: Function) → Promise<{ answer: string, references: Array<{ title: string, url: string, snippet: string }> }>`
- Env: reads `process.env.BOCHA_API_KEY`

- [ ] **Step 1: Add failing tests for `searchBochaAI`**

In `src/__tests__/server-webSearch.test.js`, add after the existing `searchBocha` describe block:

```js
import { searchBochaAI } from '../../server/lib/webSearch.js'

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/server-webSearch.test.js 2>&1 | tail -5
```

Expected: FAIL — `searchBochaAI` is not exported

- [ ] **Step 3: Implement `searchBochaAI` in `server/lib/webSearch.js`**

Add after the `searchBocha` function (before the last blank line):

```js
const AI_ENDPOINT = 'https://api.bochaai.com/v1/ai-search'
const AI_TIMEOUT_MS = 15000

/**
 * 调博查AI AI Search API，返回 AI 总结 + 参考来源。
 * @param {string} query - 搜索词
 * @param {string} [apiKey] - 博查AI API 密钥，默认读 process.env.BOCHA_API_KEY
 * @param {Function} [fetchImpl] - fetch 实现，默认 globalThis.fetch
 * @returns {Promise<{ answer: string, references: Array<{ title: string, url: string, snippet: string }> }>}
 */
export async function searchBochaAI(query, apiKey, fetchImpl) {
  const key = typeof apiKey === 'string' ? apiKey : (process.env.BOCHA_API_KEY || '')
  const fetchFn = fetchImpl || globalThis.fetch

  // 无 key → 静默跳过
  if (!key) return { answer: '', references: [] }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

    let res
    try {
      res = await fetchFn(AI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({ query, answer: true, count: 5 }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      console.warn(`[webSearch] 博查AI AI Search HTTP ${res.status}`)
      return { answer: '', references: [] }
    }

    const body = await res.json()
    if (body.code !== 200 || !Array.isArray(body.messages)) {
      console.warn(`[webSearch] 博查AI AI Search code=${body.code}`)
      return { answer: '', references: [] }
    }

    // 提取 answer
    let answer = ''
    const references = []

    for (const msg of body.messages) {
      if (msg.type === 'answer' && msg.content_type === 'text') {
        answer = String(msg.content || '')
      }
      if (msg.type === 'source' && msg.content_type === 'webpage') {
        try {
          const parsed = JSON.parse(msg.content)
          if (Array.isArray(parsed.value)) {
            for (const v of parsed.value) {
              references.push({
                title: v.name || '',
                url: v.url || '',
                snippet: v.snippet || '',
              })
            }
          }
        } catch { /* JSON parse 失败跳过 */ }
      }
    }

    return { answer, references }
  } catch (e) {
    if (e?.name === 'AbortError') {
      console.warn('[webSearch] 博查AI AI Search 超时')
    } else {
      console.warn('[webSearch] AI Search 调用失败：', e?.message || e)
    }
    return { answer: '', references: [] }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/server-webSearch.test.js 2>&1 | tail -10
```

Expected: all 17 tests PASS (11 existing + 6 new)

- [ ] **Step 5: Commit**

```bash
git add server/lib/webSearch.js src/__tests__/server-webSearch.test.js
git commit -m "feat: add searchBochaAI() for BoCha AI Search API
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Add villageOverview dimension to searchService.js

**Files:**
- Modify: `server/services/searchService.js`
- Test: `src/__tests__/server-searchService.test.js`

**Interfaces:**
- Consumes: `searchBochaAI` from Task 1, `searchBocha` (existing)
- Produces: `searchVillage({ village, idea, apiKey, searchBochaImpl, searchBochaAIImpl }) → Promise<{ results: Array, overview: { answer, references } | null }>`

- [ ] **Step 1: Update tests for new return type + villageOverview dimension**

In `src/__tests__/server-searchService.test.js`, update the existing test file:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/server-searchService.test.js 2>&1 | tail -10
```

Expected: FAIL — `overview` is undefined / `searchBochaAIImpl` not accepted

- [ ] **Step 3: Update `searchVillage()` in `server/services/searchService.js`**

Replace the file content:

```js
// server/services/searchService.js
// 多维度联网搜索编排：四个 Web Search 维度 + 一个 AI Search 维度并发。
// 某维度失败不影响其他维度；无结果返回空数组/overview=null。

import { searchBocha as defaultSearchBocha } from '../lib/webSearch.js'
import { searchBochaAI as defaultSearchBochaAI } from '../lib/webSearch.js'

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
 * @param {string} [opts.apiKey] - 博查AI API key
 * @param {Function} [opts.searchBochaImpl] - searchBocha 实现（注入便于测试）
 * @param {Function} [opts.searchBochaAIImpl] - searchBochaAI 实现（注入便于测试）
 * @returns {Promise<{ results: Array, overview: { answer: string, references: Array } | null }>}
 */
export async function searchVillage({
  village,
  idea = '',
  apiKey,
  searchBochaImpl,
  searchBochaAIImpl,
} = {}) {
  const searchBochaFn = searchBochaImpl || defaultSearchBocha
  const searchBochaAIFn = searchBochaAIImpl || defaultSearchBochaAI
  const ideaPreview = String(idea || '').trim().slice(0, IDEA_PREVIEW_LEN)
  const hasVillage = !!(village && village.trim())

  // 四个 Web Search 维度并发
  const dimensionResults = await Promise.all(
    DIMENSIONS.map(async (dim) => {
      const query = dim.buildQuery(village, ideaPreview)
      let raw
      try {
        raw = await searchBochaFn(query, apiKey)
      } catch {
        raw = []
      }
      const sliced = (Array.isArray(raw) ? raw : []).slice(0, dim.topN)
      return sliced.map((r) => ({
        ...r,
        dimension: dim.key,
      }))
    }),
  )

  // AI Search 维度（并发跑，不影响 Web Search）
  let overview = null
  if (hasVillage) {
    try {
      const aiQuery = `${village.trim()} 基本概况 地理位置 人口 产业 文化特色`
      const aiResult = await searchBochaAIFn(aiQuery, apiKey)
      if (aiResult && aiResult.answer) {
        overview = {
          answer: aiResult.answer,
          references: aiResult.references || [],
        }
      }
    } catch {
      overview = null
    }
  }

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

  return { results: merged, overview }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/server-searchService.test.js 2>&1 | tail -10
```

Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/services/searchService.js src/__tests__/server-searchService.test.js
git commit -m "feat: add villageOverview dimension using AI Search
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Update route to pass through `overview`

**Files:**
- Modify: `server/routes/search.js`

**Interfaces:**
- Consumes: `searchVillage()` now returns `{ results, overview }`
- Produces: `POST /api/search/web` returns `{ results: [...], overview: { answer, references } | null }`

- [ ] **Step 1: Update route handler**

In `server/routes/search.js`, change one line:

```js
// Before:
const { results } = await search({
  village: village.trim(),
  idea: typeof idea === 'string' ? idea : '',
})
res.json({ results })

// After:
const { results, overview } = await search({
  village: village.trim(),
  idea: typeof idea === 'string' ? idea : '',
})
res.json({ results, overview: overview || null })
```

- [ ] **Step 2: Verify with route tests**

```bash
npx vitest run src/__tests__/server-routes.test.js 2>&1 | tail -5
```

Expected: all 16 tests PASS (existing route tests don't break)

- [ ] **Step 3: Commit**

```bash
git add server/routes/search.js
git commit -m "feat: pass overview through search route response
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Update frontend data pipeline

**Files:**
- Modify: `src/modules/practice/mine/api.js`
- Modify: `src/modules/practice/mine/retrieval.js`
- Test: `src/__tests__/mine-retrieval-web.test.js`

**Interfaces:**
- `apiSearchWeb()` returns `{ results, overview } | { results: [], overview: null }`
- `searchWeb()` returns `{ cards: Array, overview: { answer, references } | null }`

- [ ] **Step 1: Update tests for new return types**

Replace `src/__tests__/mine-retrieval-web.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/mine-retrieval-web.test.js 2>&1 | tail -5
```

Expected: FAIL — `searchWeb` returns array, not `{ cards, overview }`

- [ ] **Step 3: Update `apiSearchWeb()` in `api.js`**

In `src/modules/practice/mine/api.js`, change `apiSearchWeb`:

```js
/**
 * 联网搜索目标村信息。失败返回空。
 */
export async function apiSearchWeb({ village, idea } = {}) {
  try {
    const data = await request('/api/search/web', {
      method: 'POST',
      body: { village, idea },
    })
    return data || { results: [], overview: null }
  } catch {
    return { results: [], overview: null }
  }
}
```

- [ ] **Step 4: Update `searchWeb()` in `retrieval.js`**

In `src/modules/practice/mine/retrieval.js`, replace the `searchWeb` function:

```js
/**
 * 联网搜索目标村信息，结果格式化为统一检索卡片 + AI 概况。
 * 失败吞错返回空——联网搜索是锦上添花，不阻塞主流程。
 * @param {string} village - 目标村名
 * @param {string} idea - 实践 idea
 * @returns {Promise<{ cards: Array, overview: { answer: string, references: Array } | null }>}
 */
export async function searchWeb(village, idea) {
  try {
    const data = await apiSearchWeb({ village, idea })
    const cards = (data.results || []).map((r) => ({
      source: 'web',
      id: r.url || '',
      title: r.title || '',
      sub: r.snippet || '',
      path: r.url || '',
      dimension: r.dimension || '',
      relevance: r.relevance || 'low',
    }))
    const overview = data.overview || null
    return { cards, overview }
  } catch {
    return { cards: [], overview: null }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/mine-retrieval-web.test.js 2>&1 | tail -5
```

Expected: all 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/practice/mine/api.js src/modules/practice/mine/retrieval.js src/__tests__/mine-retrieval-web.test.js
git commit -m "feat: update searchWeb to return { cards, overview }
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Render overview card in StagePlan.vue

**Files:**
- Modify: `src/modules/practice/mine/StagePlan.vue`
- Test: `src/__tests__/mine-stagePlan-web.test.js`

**Interfaces:**
- Consumes: `searchWeb()` now returns `{ cards, overview }`
- Produces: overview card rendered above `.ret-grid`

- [ ] **Step 1: Update tests**

In `src/__tests__/mine-stagePlan-web.test.js`, update the mock return value for `searchWeb` and add overview tests. Change all existing `searchWeb.mockResolvedValue([...])` to `searchWeb.mockResolvedValue({ cards: [...], overview: null })` and add:

```js
it('searchWeb 返回 overview → 渲染 AI 村落概况卡片', async () => {
  retrieval.retrieve.mockReturnValue([
    { source: 'village', id: 'v1', title: 'X村', sub: '...', path: '/villages/v1', score: 5 },
  ])
  retrieval.searchWeb.mockResolvedValue({
    cards: [
      { source: 'web', id: 'https://a.com', title: '搜索结果', sub: '摘要', path: 'https://a.com', dimension: 'overview', relevance: 'high' },
    ],
    overview: {
      answer: '陈家铺村位于浙江省松阳县……',
      references: [{ title: '源1', url: 'https://r.com', snippet: '...' }],
    },
  })

  const dossier = fullDossier({ village: '陈家铺村', idea: '帮村民卖竹编' })
  const wrapper = mount(StagePlan, { props: { dossier }, global: globalOpts })
  await flushPromises()

  // 概况卡片渲染
  expect(wrapper.find('.overview-card').exists()).toBe(true)
  expect(wrapper.find('.overview-card').text()).toContain('AI 村落概况')
  expect(wrapper.find('.overview-card').text()).toContain('陈家铺村位于浙江省松阳县')
  // 参考来源可折叠
  expect(wrapper.find('.overview-refs').exists()).toBe(true)
})

it('overview 为 null → 不渲染概况卡片', async () => {
  retrieval.retrieve.mockReturnValue([
    { source: 'village', id: 'v1', title: 'X村', sub: '...', path: '/villages/v1', score: 5 },
  ])
  retrieval.searchWeb.mockResolvedValue({
    cards: [
      { source: 'web', id: 'https://a.com', title: '搜索结果', sub: '摘要', path: 'https://a.com', dimension: 'overview', relevance: 'high' },
    ],
    overview: null,
  })

  const dossier = fullDossier({ village: '陈家铺村', idea: '帮村民卖竹编' })
  const wrapper = mount(StagePlan, { props: { dossier }, global: globalOpts })
  await flushPromises()

  expect(wrapper.find('.overview-card').exists()).toBe(false)
})
```

Also update the existing test cases — change each `searchWeb.mockResolvedValue([...])` to `searchWeb.mockResolvedValue({ cards: [...], overview: null })`.

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/mine-stagePlan-web.test.js 2>&1 | tail -10
```

Expected: FAIL — overview card not rendered / destructure error

- [ ] **Step 3: Add `overviewData` ref and update `maybeSearchWeb()`**

In `StagePlan.vue` `<script setup>`, add after `const selectedWebCard = ref(null)`:

```js
const overviewData = ref(null)
```

Update `maybeSearchWeb()`:

```js
async function maybeSearchWeb() {
  if (cards.value.length >= WEB_SEARCH_THRESHOLD) return

  const village = getTargetVillage()
  if (!village) return

  try {
    const { cards: webCardsList, overview } = await searchWeb(village, ideaInput.value.trim())
    webCards.value = webCardsList
    overviewData.value = overview
    // 合并到 cards（按 URL 去重）
    const existingUrls = new Set(cards.value.map((c) => c.path || ''))
    for (const wc of webCards.value) {
      if (!existingUrls.has(wc.path)) {
        cards.value.push(wc)
      }
    }
  } catch {
    webCards.value = []
    overviewData.value = null
  }
}
```

- [ ] **Step 4: Add overview card template**

In `StagePlan.vue` `<template>`, add the overview card between the search block `<section>` and the `ret-grid`:

```html
<!-- AI 村落概况卡片 -->
<article v-if="overviewData" class="overview-card">
  <span class="ret-source src-ai">🤖 AI 村落概况</span>
  <div class="overview-body">{{ overviewData.answer }}</div>
  <details v-if="overviewData.references && overviewData.references.length" class="overview-refs">
    <summary>参考来源（{{ overviewData.references.length }}）</summary>
    <ul class="overview-ref-list">
      <li v-for="(r, i) in overviewData.references" :key="i">
        <a :href="r.url" target="_blank" rel="noopener">{{ r.title || r.url }}</a>
      </li>
    </ul>
  </details>
</article>
```

Place it right before the `<div v-if="cards.length" class="ret-grid">` line.

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/mine-stagePlan-web.test.js 2>&1 | tail -10
```

Expected: all tests PASS (existing 6 + 2 new = 8)

- [ ] **Step 6: Commit**

```bash
git add src/modules/practice/mine/StagePlan.vue src/__tests__/mine-stagePlan-web.test.js
git commit -m "feat: render AI village overview card in StagePlan
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Full suite verification + manual smoke test

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run 2>&1 | tail -5
```

Expected: all tests PASS, zero regressions

- [ ] **Step 2: Manual smoke test**

```bash
# Start server
node server/index.js &
sleep 2

# Get token + search
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"smoketest","password":"test123"}' \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token||''))")

curl -s -X POST http://localhost:3001/api/search/web \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"village":"陈家铺村","idea":"帮村民卖竹编"}' \
  | node -e "
    process.stdin.on('data', d => {
      const j = JSON.parse(d)
      console.log('results:', j.results.length)
      console.log('overview:', j.overview ? 'present (' + j.overview.answer.slice(0,60) + '...)' : 'null')
    })
  "
```

Expected: results > 0 AND overview is present with non-empty answer

- [ ] **Step 3: Final commit if needed**

```bash
git status
# Should show clean working tree
```
