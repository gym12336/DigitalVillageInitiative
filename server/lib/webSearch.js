// server/lib/webSearch.js
// 博查AI Web Search API 薄封装 + 内存缓存。
// 无 key / 超时 / 失败均返回空数组，由上层静默处理。

const ENDPOINT = 'https://api.bochaai.com/v1/web-search'
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
 * 调博查AI Web Search API，返回搜索结果摘要数组。
 * @param {string} query - 搜索词
 * @param {string} [apiKey] - 博查AI API 密钥，默认读 process.env.BOCHA_API_KEY
 * @param {Function} [fetchImpl] - fetch 实现，默认 globalThis.fetch（依赖注入便于测试）
 * @returns {Promise<Array<{ title: string, url: string, snippet: string }>>}
 */
export async function searchBocha(query, apiKey, fetchImpl) {
  const key = typeof apiKey === 'string' ? apiKey : (process.env.BOCHA_API_KEY || '')
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
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

      let res
      try {
        res = await fetchFn(ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({ query, count: 5 }),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timer)
      }

      if (!res.ok) {
        console.warn(`[webSearch] 博查AI API HTTP ${res.status}`)
        return []
      }

      const body = await res.json()

      // 博查API 响应格式：{ code: 200, data: { webPages: { value: [...] } } }
      if (body.code !== 200) {
        console.warn(`[webSearch] 博查AI API code=${body.code} msg=${body.msg || ''}`)
        return []
      }

      const values = body?.data?.webPages?.value
      if (!Array.isArray(values) || !values.length) return []

      return values.map((v) => ({
        title: v.name || '',
        url: v.url || '',
        snippet: v.snippet || '',
      }))
    } catch (e) {
      if (e?.name === 'AbortError') {
        console.warn('[webSearch] 博查AI API 超时')
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
