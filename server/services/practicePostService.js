// 实践后AI成果服务：叙事生成 + 组件编排 + 文案润色。
// 仿 practiceExtractService 模式：chatJSON 调 DeepSeek + 令牌桶限流 + 三级兜底。
// 无论 LLM 成功/失败/残缺，始终返回结构合法的结果，不抛。
import { chatJSON } from '../lib/deepseek.js'
import { getDefaultBucket } from '../lib/rateLimiter.js'
import {
  NARRATIVE_SYSTEM, buildNarrativeUserPrompt,
  COMPILE_SYSTEM, buildCompileUserPrompt,
  POLISH_SYSTEM, buildPolishUserPrompt,
  BIG_COMPONENT_SYSTEM, buildBigComponentUserPrompt,
} from './prompts/postPrompt.js'

const NARRATIVE_MAX_TOKENS = 2000
const COMPILE_MAX_TOKENS = 4000
const POLISH_MAX_TOKENS = 800
const BIG_COMPONENT_MAX_TOKENS = 2000

let _bucket = null
function bucket() {
  if (!_bucket) _bucket = getDefaultBucket()
  return _bucket
}

function str(v) {
  return v === undefined || v === null ? '' : String(v)
}

// ==================== 成果叙事 ====================

function emptyNarrative(source) {
  return { headline: '', summary: '', highlights: [], sections: [], source }
}

function normSection(s) {
  return {
    title: str(s?.title),
    body: str(s?.body),
    componentHint: str(s?.componentHint),
  }
}

/**
 * 从采集数据生成成果叙事。
 * @param {object} data - { people, metricValues, materials, places, topic, village }
 * @param {object} [opts] - { chatImpl } 注入（测试用）
 * @returns {Promise<{headline, summary, highlights, sections, source}>}
 */
export async function generateNarrative(data = {}, opts = {}) {
  const people = Array.isArray(data.people) ? data.people : []
  const metricValues = Array.isArray(data.metricValues) ? data.metricValues : []
  const materials = Array.isArray(data.materials) ? data.materials : []
  const places = Array.isArray(data.places) ? data.places : []

  if (!people.length && !metricValues.length && !materials.length && !places.length) {
    return emptyNarrative('empty')
  }

  const chatImpl = opts.chatImpl || chatJSON

  let raw
  try {
    await bucket().acquire()
    raw = await chatImpl({
      system: NARRATIVE_SYSTEM,
      user: buildNarrativeUserPrompt({
        people, metricValues, materials, places,
        topic: str(data.topic),
        village: str(data.village),
      }),
      maxTokens: NARRATIVE_MAX_TOKENS,
    })
  } catch (e) {
    console.warn('[practicePost] 叙事生成失败：', e?.message || e)
    return emptyNarrative('error')
  }

  if (!raw || typeof raw !== 'object') return emptyNarrative('error')

  return {
    headline: str(raw.headline),
    summary: str(raw.summary),
    highlights: Array.isArray(raw.highlights) ? raw.highlights.map(str).filter(Boolean).slice(0, 8) : [],
    sections: Array.isArray(raw.sections) ? raw.sections.map(normSection) : [],
    source: 'ai',
  }
}

// ==================== 组件编排 ====================

function emptyCompile(source) {
  return { components: [], pageTitle: '', pageBackground: '#ffffff', layoutHint: '', narrative: null, source }
}

function normComponent(c) {
  return {
    type: ['chart', 'text', 'image', 'timeline', 'datatable', 'agri-sensor', 'layout-box'].includes(c?.type) ? c.type : 'text',
    x: Math.max(0, Math.round(Number(c?.x) || 40)),
    y: Math.max(0, Math.round(Number(c?.y) || 40)),
    width: Math.max(100, Math.round(Number(c?.width) || 300)),
    height: Math.max(60, Math.round(Number(c?.height) || 200)),
    props: c?.props && typeof c.props === 'object' ? { ...c.props } : { text: '' },
  }
}

/**
 * 从采集数据生成组件编排。
 * @param {object} collected - dossier.collected 数据
 * @param {object} [opts]
 * @param {string} [opts.topic] - 实践主题
 * @param {string} [opts.village] - 目标村庄
 * @param {string} [opts.intent] - 用户意图（可选）
 * @param {Function} [opts.chatImpl] - 注入（测试用）
 * @returns {Promise<{components, pageTitle, pageBackground, layoutHint, narrative, source}>}
 */
export async function compileLayout(collected = {}, opts = {}) {
  const mv = Array.isArray(collected.metricValues) ? collected.metricValues : []
  const pp = Array.isArray(collected.people) ? collected.people : []
  const mm = Array.isArray(collected.materials) ? collected.materials : []
  const pl = Array.isArray(collected.places) ? collected.places : []

  if (!mv.length && !pp.length && !mm.length && !pl.length) {
    return emptyCompile('empty')
  }

  const chatImpl = opts.chatImpl || chatJSON

  let raw
  try {
    await bucket().acquire()
    raw = await chatImpl({
      system: COMPILE_SYSTEM,
      user: buildCompileUserPrompt(collected, str(opts.topic), str(opts.village), str(opts.intent)),
      maxTokens: COMPILE_MAX_TOKENS,
    })
  } catch (e) {
    console.warn('[practicePost] 组件编排失败：', e?.message || e)
    return emptyCompile('error')
  }

  if (!raw || typeof raw !== 'object') return emptyCompile('error')

  return {
    components: Array.isArray(raw.components) ? raw.components.map(normComponent) : [],
    pageTitle: str(raw.pageTitle),
    pageBackground: str(raw.pageBackground) || '#ffffff',
    layoutHint: str(raw.layoutHint),
    narrative: raw.narrative || null,
    source: 'ai',
  }
}

// ==================== 大组件生成（大组件编辑台用） ====================

function emptyBigComponent(source) {
  return { components: [], name: '', description: '', source }
}

/**
 * 根据自然语言描述生成一个大组件（可复用的组件组合）。
 * 不需要dossier数据——用占位内容，供展示台后续绑定真实数据。
 * @param {string} intent - 用户对大组件的描述
 * @param {object} [opts]
 * @param {Function} [opts.chatImpl] - 注入（测试用）
 * @returns {Promise<{components, name, description, source}>}
 */
export async function generateBigComponent(intent = '', opts = {}) {
  const clean = String(intent || '').trim()
  if (!clean) return emptyBigComponent('empty')

  const chatImpl = opts.chatImpl || chatJSON

  let raw
  try {
    await bucket().acquire()
    raw = await chatImpl({
      system: BIG_COMPONENT_SYSTEM,
      user: buildBigComponentUserPrompt(clean),
      maxTokens: BIG_COMPONENT_MAX_TOKENS,
    })
  } catch (e) {
    console.warn('[practicePost] 大组件生成失败：', e?.message || e)
    return emptyBigComponent('error')
  }

  if (!raw || typeof raw !== 'object') return emptyBigComponent('error')

  return {
    components: Array.isArray(raw.components) ? raw.components.map(normComponent) : [],
    name: str(raw.name),
    description: str(raw.description),
    source: 'ai',
  }
}

// ==================== 文案润色 ====================

function emptyPolish(source) {
  return { polished: '', changes: '', source }
}

/**
 * 润色单段文案。
 * @param {string} text - 待润色文本
 * @param {object} [opts]
 * @param {string} [opts.context] - 上下文（如组件类型/用途）
 * @param {Function} [opts.chatImpl] - 注入（测试用）
 * @returns {Promise<{polished, changes, source}>}
 */
export async function polishText(text, opts = {}) {
  const clean = String(text || '').trim()
  if (!clean) return emptyPolish('empty')

  const chatImpl = opts.chatImpl || chatJSON

  let raw
  try {
    await bucket().acquire()
    raw = await chatImpl({
      system: POLISH_SYSTEM,
      user: buildPolishUserPrompt(clean, str(opts.context)),
      maxTokens: POLISH_MAX_TOKENS,
    })
  } catch (e) {
    console.warn('[practicePost] 文案润色失败：', e?.message || e)
    return { polished: clean, changes: '', source: 'error' }
  }

  if (!raw || typeof raw !== 'object') return { polished: clean, changes: '', source: 'error' }

  return {
    polished: str(raw.polished) || clean,
    changes: str(raw.changes),
    source: 'ai',
  }
}
