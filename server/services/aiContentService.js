// AI 内容生成管线：intro / facts / tags 三大生成器。
// 汇总 DeepSeek API + 速率限制 + Prompt 模板 + 置信度标记 + source:auto 标记。
//
// 核心约定：
// - 所有 AI 生成内容标记 source:auto，输入端传入现有数据，不可覆盖 source:manual
// - 每个输出字段附带 confidence（0-1）置信度
// - 调用方负责判断 source 是否为 manual 以决定是否覆盖
// - DeepSeek API 通过全局令牌桶限流 5次/秒

import { chatJSON, NoKeyError, DeepseekError } from '../lib/deepseek.js'
import { getDefaultBucket, TokenBucket } from '../lib/rateLimiter.js'
import { getElevation } from '../lib/elevation.js'
import {
  INTRO_SYSTEM, buildIntroUserPrompt,
  FACTS_SYSTEM, buildFactsUserPrompt,
  TAGS_SYSTEM, buildTagsUserPrompt,
} from './prompts/index.js'

// —— 配置 ——
const DEFAULT_TIMEOUT_MS = 30_000
const INTRO_MAX_TOKENS = 800
const FACTS_MAX_TOKENS = 600
const TAGS_MAX_TOKENS = 1200

// —— 私有工具 ——

let _bucket = null
function bucket() {
  if (!_bucket) _bucket = getDefaultBucket()
  return _bucket
}

/**
 * 等待限流令牌后调用 DeepSeek。
 * @returns {Promise<object>} 解析后的 JSON 结果
 */
async function callDeepSeekWithLimit(system, user, opts = {}) {
  await bucket().acquire()

  const mergedOpts = {
    system,
    user,
    apiKey: opts.apiKey || process.env.DEEPSEEK_API_KEY,
    model: opts.model || 'deepseek-chat',
    timeoutMs: opts.timeoutMs || DEFAULT_TIMEOUT_MS,
    maxTokens: opts.maxTokens || 2000,
  }

  return chatJSON(mergedOpts)
}

/**
 * 包装 AI 生成结果，统一附加 source:auto 和 confidence。
 */
function wrapResult(data, generator) {
  return {
    ...data,
    _meta: {
      source: 'auto',
      generator,
      generatedAt: new Date().toISOString(),
      model: 'deepseek-chat',
    },
  }
}

// —— 公开 API ——

/**
 * 检查是否已有高质量人工编辑内容。
 * 如果 source 为 manual 且有内容，则跳过 AI 生成。
 *
 * @param {object} fieldMeta - 字段的 _meta 信息
 * @returns {boolean} true 表示应跳过（有人工编辑）
 */
export function shouldSkipForManual(fieldMeta) {
  return fieldMeta?.source === 'manual'
}

/**
 * generateIntro：生成 300 字村庄介绍。
 *
 * @param {object} village - 村庄对象（含 name/province/city/district/town/honors/summary 等）
 * @param {object} [opts]
 * @param {string} [opts.apiKey]
 * @returns {Promise<{intro: string, highlights: string[], confidence: number, _meta: object}>}
 */
export async function generateIntro(village, opts = {}) {
  const result = await callDeepSeekWithLimit(
    INTRO_SYSTEM,
    buildIntroUserPrompt(village),
    { ...opts, maxTokens: INTRO_MAX_TOKENS },
  )

  return wrapResult(
    {
      intro: result.intro || '',
      highlights: result.highlights || [],
      confidence: result.confidence ?? 0.7,
    },
    'generateIntro',
  )
}

/**
 * generateFacts：生成村庄基本事实（海拔 + 建村年代 + 姓氏 + 规模）。
 * 优先使用高程 API 获取精确海拔数据。
 *
 * @param {object} village - 村庄对象（含 coord）
 * @param {object} [opts]
 * @param {string} [opts.apiKey]
 * @param {string} [opts.amapKey] - 高德 API Key
 * @returns {Promise<object>} facts 对象
 */
export async function generateFacts(village, opts = {}) {
  // 1. 先尝试获取海拔
  let altitudeFromApi = null
  let altitudeSource = null

  if (village.coord && village.coord.length === 2) {
    try {
      const elevResult = await getElevation(village.coord[0], village.coord[1], {
        amapKey: opts.amapKey || process.env.AMAP_API_KEY,
        tencentKey: opts.tencentKey || process.env.TENCENT_MAP_KEY,
      })
      if (elevResult.altitude !== null && elevResult.altitude !== undefined) {
        altitudeFromApi = Math.round(elevResult.altitude)
        altitudeSource = elevResult.source
      }
    } catch (e) {
      // 高程获取失败不阻塞整体流程，AI 可基于知识库推断
      console.warn(`[aiContent] 高程获取失败: ${e.message}`)
    }
  }

  // 2. 调 DeepSeek 生成 facts
  const result = await callDeepSeekWithLimit(
    FACTS_SYSTEM,
    buildFactsUserPrompt(village, altitudeFromApi, altitudeSource),
    { ...opts, maxTokens: FACTS_MAX_TOKENS },
  )

  // 3. 合并 API 海拔与 AI 推断
  const facts = {
    altitude: result.altitude || { value: altitudeFromApi, source: altitudeSource || 'ai_guess', confidence: altitudeFromApi ? 0.9 : 0.5 },
    foundedYear: result.foundedYear || { value: null, display: null, confidence: 0.3 },
    foundedDynasty: result.foundedDynasty || { value: null, confidence: 0.3 },
    mainSurnames: result.mainSurnames || { value: [], confidence: 0.3 },
    households: result.households || { value: null, confidence: 0.2 },
    population: result.population || { value: null, confidence: 0.2 },
    areaKm2: result.areaKm2 || { value: null, confidence: 0.2 },
  }

  // 计算整体置信度
  const confidences = Object.values(facts)
    .map((f) => f.confidence ?? 0)
    .filter((c) => c > 0)
  const overallConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0.3

  return wrapResult(
    { ...facts, overallConfidence },
    'generateFacts',
  )
}

/**
 * generateTags：生成六大类标签。
 *
 * @param {object} village - 村庄对象
 * @param {object} [opts]
 * @param {string} [opts.apiKey]
 * @returns {Promise<object>} tags 对象 { 文化类: {score, tags, confidence}, ... }
 */
export async function generateTags(village, opts = {}) {
  const result = await callDeepSeekWithLimit(
    TAGS_SYSTEM,
    buildTagsUserPrompt(village),
    { ...opts, maxTokens: TAGS_MAX_TOKENS },
  )

  // 标准化输出：确保六大类都存在
  const categories = ['文化类', '生态类', '产业类', '历史类', '民俗类', '美食类']
  const tags = {}
  for (const cat of categories) {
    const catData = result[cat] || { score: 0.3, tags: [], confidence: 0.3 }
    tags[cat] = {
      score: catData.score ?? 0.3,
      tags: (catData.tags || []).map((t) => ({
        name: typeof t === 'string' ? t : t.name || t,
        reason: typeof t === 'object' ? t.reason || '' : '',
      })),
      confidence: catData.confidence ?? 0.3,
    }
  }

  return wrapResult(
    {
      ...tags,
      overallConfidence: result.overallConfidence ?? 0.5,
    },
    'generateTags',
  )
}

/**
 * enrichAll：一键丰富村庄全部内容（intro + facts + tags）。
 * 自动跳过已有 source:manual 的字段，只补充空缺或 auto 内容。
 *
 * @param {object} village - 完整村庄对象（含现有字段值）
 * @param {object} [opts]
 * @param {string[]} [opts.fields] - 要生成的字段列表，默认全部 ['intro','facts','tags']
 * @returns {Promise<{intro: object|null, facts: object|null, tags: object|null, skipped: string[]}>}
 */
export async function enrichAll(village, opts = {}) {
  const fields = opts.fields || ['intro', 'facts', 'tags']
  const result = {}
  const skipped = []

  for (const field of fields) {
    switch (field) {
      case 'intro': {
        // 检查是否已有人工编辑的 intro
        if (village.intro && village.intro.length > 100 && !village._meta?.intro?.source?.startsWith('auto')) {
          // 有较长介绍且非明确 auto 来源，保守跳过
          skipped.push('intro')
          result.intro = null
        } else {
          try {
            result.intro = await generateIntro(village, opts)
          } catch (e) {
            console.error(`[aiContent] generateIntro 失败: ${e.message}`)
            result.intro = { error: e.message, _meta: { source: 'auto', generator: 'generateIntro' } }
          }
        }
        break
      }
      case 'facts': {
        try {
          result.facts = await generateFacts(village, opts)
        } catch (e) {
          console.error(`[aiContent] generateFacts 失败: ${e.message}`)
          result.facts = { error: e.message, _meta: { source: 'auto', generator: 'generateFacts' } }
        }
        break
      }
      case 'tags': {
        try {
          result.tags = await generateTags(village, opts)
        } catch (e) {
          console.error(`[aiContent] generateTags 失败: ${e.message}`)
          result.tags = { error: e.message, _meta: { source: 'auto', generator: 'generateTags' } }
        }
        break
      }
      default:
        skipped.push(field)
    }
  }

  return { ...result, skipped }
}

// —— 导出错误类（方便上层兜底） ——
export { NoKeyError, DeepseekError } from '../lib/deepseek.js'

/**
 * 检查 DeepSeek API 是否可用。
 * @returns {Promise<{available: boolean, reason?: string}>}
 */
export async function checkAvailability() {
  if (!process.env.DEEPSEEK_API_KEY) {
    return { available: false, reason: 'DEEPSEEK_API_KEY 未配置' }
  }
  try {
    await callDeepSeekWithLimit(
      'Reply with JSON: {"ok":true}',
      'ping',
      { maxTokens: 50, timeoutMs: 10_000 },
    )
    return { available: true }
  } catch (e) {
    return { available: false, reason: e.message }
  }
}

