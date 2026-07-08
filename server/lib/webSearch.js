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
