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
