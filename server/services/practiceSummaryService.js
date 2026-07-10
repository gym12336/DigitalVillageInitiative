// 成果综述生成：读一份档案已采集的人物/指标/材料，产出成果综述 + 亮点。
// 仿 practiceExtractService：chatJSON 调 DeepSeek + 令牌桶限流 + 三级兜底。
// 无论成功/失败/残缺，始终返回结构合法结果（source 标出来源），不抛。
import { chatJSON } from '../lib/deepseek.js'
import { getDefaultBucket } from '../lib/rateLimiter.js'
import { SUMMARY_SYSTEM, buildSummaryUserPrompt } from './prompts/summaryPrompt.js'

const SUMMARY_MAX_TOKENS = 900

let _bucket = null
function bucket() {
  if (!_bucket) _bucket = getDefaultBucket()
  return _bucket
}

function str(v) {
  return v === undefined || v === null ? '' : String(v)
}

function emptyResult(source) {
  return { summary: '', highlights: [], source }
}

/** 规范化 LLM 原始输出：summary 取字符串，highlights 取字符串数组（去空、限 8 条）。 */
function normalize(raw) {
  const summary = str(raw?.summary).trim()
  const highlights = Array.isArray(raw?.highlights)
    ? raw.highlights.map((h) => str(h).trim()).filter(Boolean).slice(0, 8)
    : []
  return { summary, highlights, source: 'ai' }
}

/**
 * 生成成果综述。
 * @param {object} data - { people, metricValues, materials, topic, village }
 * @param {object} [opts] - { chatImpl } 注入 chatJSON（测试用）
 * @returns {Promise<{summary, highlights, source}>}
 *   source: 'ai' 成功 | 'empty' 无数据 | 'error' 失败兜底
 */
export async function summarize(data = {}, opts = {}) {
  const people = Array.isArray(data.people) ? data.people : []
  const metricValues = Array.isArray(data.metricValues) ? data.metricValues : []
  const materials = Array.isArray(data.materials) ? data.materials : []

  // 无任何采集数据：不必调 LLM。
  if (!people.length && !metricValues.length && !materials.length) return emptyResult('empty')

  const chatImpl = opts.chatImpl || chatJSON

  let raw
  try {
    await bucket().acquire()
    raw = await chatImpl({
      system: SUMMARY_SYSTEM,
      user: buildSummaryUserPrompt({
        people,
        metricValues,
        materials,
        topic: str(data.topic),
        village: str(data.village),
      }),
      maxTokens: SUMMARY_MAX_TOKENS,
    })
  } catch (e) {
    console.warn('[practiceSummary] LLM 调用失败，返回空结果：', e?.message || e)
    return emptyResult('error')
  }

  if (!raw || typeof raw !== 'object') return emptyResult('error')
  return normalize(raw)
}
