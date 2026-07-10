// AI 结构化提取：从实践采集文本抽人物/指标/材料要点。
// 仿 aiContentService 模式：chatJSON 调 DeepSeek + 令牌桶限流 + source/confidence 标记。
// 无论 LLM 成功/失败/返回残缺，始终返回结构合法的结果（source 标出来源），不抛。
import { chatJSON } from '../lib/deepseek.js'
import { getDefaultBucket } from '../lib/rateLimiter.js'
import { EXTRACT_SYSTEM, buildExtractUserPrompt } from './prompts/extractPrompt.js'

const EXTRACT_MAX_TOKENS = 1500
const TEXT_MAX = 20_000 // 与 fileText.EXTRACT_TEXT_MAX 对齐，喂 LLM 前再兜一层

let _bucket = null
function bucket() {
  if (!_bucket) _bucket = getDefaultBucket()
  return _bucket
}

function num(v, dflt = 0.6) {
  const n = Number(v)
  return Number.isFinite(n) ? n : dflt
}
function str(v) {
  return v === undefined || v === null ? '' : String(v)
}

/** 规范化一条人物：补空串/默认置信度，标 source:auto。含富字段 story/highlight。 */
function normPerson(p) {
  return {
    name: str(p?.name),
    role: str(p?.role),
    quote: str(p?.quote),
    story: str(p?.story),
    highlight: str(p?.highlight),
    confidence: num(p?.confidence),
    source: 'auto',
  }
}
function normMetric(m) {
  return {
    name: str(m?.name),
    value: str(m?.value),
    unit: str(m?.unit),
    insight: str(m?.insight),
    isHighlight: !!m?.isHighlight,
    confidence: num(m?.confidence),
    source: 'auto',
  }
}
function normHint(h) {
  return {
    name: str(h?.name),
    note: str(h?.note),
    summary: str(h?.summary),
    theme: str(h?.theme),
    confidence: num(h?.confidence),
    source: 'auto',
  }
}

function emptyResult(source) {
  return { people: [], metrics: [], materialHints: [], source }
}

/**
 * 从文本提取结构化信息。
 * @param {string} text - 待提取文本
 * @param {object} [opts]
 * @param {Function} [opts.chatImpl] - 注入 chatJSON（测试用），缺省走真实 DeepSeek
 * @returns {Promise<{people, metrics, materialHints, source}>}
 *   source: 'ai' 成功 | 'empty' 空输入 | 'error' 失败兜底
 */
export async function extractFromText(text, opts = {}) {
  const clean = String(text || '').trim()
  if (!clean) return emptyResult('empty')

  const chatImpl = opts.chatImpl || chatJSON
  const input = clean.length > TEXT_MAX ? clean.slice(0, TEXT_MAX) : clean

  let raw
  try {
    await bucket().acquire()
    raw = await chatImpl({
      system: EXTRACT_SYSTEM,
      user: buildExtractUserPrompt(input),
      maxTokens: EXTRACT_MAX_TOKENS,
    })
  } catch (e) {
    console.warn('[practiceExtract] LLM 调用失败，返回空结果：', e?.message || e)
    return emptyResult('error')
  }

  if (!raw || typeof raw !== 'object') return emptyResult('error')

  return {
    people: Array.isArray(raw.people) ? raw.people.map(normPerson) : [],
    metrics: Array.isArray(raw.metrics) ? raw.metrics.map(normMetric) : [],
    materialHints: Array.isArray(raw.materialHints) ? raw.materialHints.map(normHint) : [],
    source: 'ai',
  }
}
