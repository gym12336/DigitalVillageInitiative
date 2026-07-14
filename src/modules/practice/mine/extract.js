// AI 结构化提取（前端）：主路径调后端 /api/practice/media/extract，
// 网络断/后端挂/未登录时用本地极简规则兜底，保证永远拿到结构合法结果。
// 契约：extractFromText(text) → { people, metrics, materialHints, source }（async）。
import { request } from './api.js'

/**
 * 从文本提取结构化信息。主调后端；失败兜到本地规则。
 * @param {string} text
 * @returns {Promise<{people, metrics, materialHints, source}>}
 */
export async function extractFromText(text) {
  const clean = String(text || '').trim()
  if (!clean) return { people: [], metrics: [], materialHints: [], places: [], source: 'empty' }
  try {
    const data = await request('/api/practice/media/extract', {
      method: 'POST',
      body: { text: clean },
    })
    if (data && Array.isArray(data.people)) {
      // API 成功但返回空结果（source:error）时走本地兜底
      if (data.source === 'error' && !data.people.length && !data.metrics?.length && !data.materialHints?.length) {
        return localExtract(clean)
      }
      return data
    }
    return localExtract(clean)
  } catch {
    return localExtract(clean)
  }
}

/**
 * 生成成果综述。主调后端 /summarize;失败/断网返回空结果，不抛。
 * @param {object} data - { people, metricValues, materials, topic, village }
 * @returns {Promise<{summary, highlights, source}>}
 */
export async function summarizeCollected(data = {}) {
  try {
    const r = await request('/api/practice/media/summarize', { method: 'POST', body: data })
    if (r && typeof r.summary === 'string') return r
    return { summary: '', highlights: [], source: 'error' }
  } catch {
    return { summary: '', highlights: [], source: 'error' }
  }
}

// —— 本地兜底：极简规则，离线可用、可测。source:'template'。——

// 「李伯说 / 王姐表示 / 张老师提到：xxx」→ 人物 + 引语。
const QUOTE_RE = /([一-龥]{2,4})(?:说|表示|提到|讲|谈到|回忆)[，:："“]?([^。！？\n]{4,60})/g
// 「月销售额 5000 元 / 受益学生 30 人」→ 指标名 + 数值 + 单位。
const METRIC_RE = /([一-龥]{2,10}?)\s*([0-9]+(?:\.[0-9]+)?)\s*([一-龥%]{1,4})/g

/** 纯本地提取，不依赖网络。导出以便单测。 */
export function localExtract(text) {
  const clean = String(text || '').trim()
  if (!clean) return { people: [], metrics: [], materialHints: [], places: [], source: 'empty' }

  const people = []
  const seenPeople = new Set()
  let m
  QUOTE_RE.lastIndex = 0
  while ((m = QUOTE_RE.exec(clean)) && people.length < 10) {
    const name = m[1]
    if (seenPeople.has(name)) continue
    seenPeople.add(name)
    people.push({ name, role: '', quote: m[2].trim(), story: '', highlight: '', category: '', confidence: 0.4, source: 'auto' })
  }

  const metrics = []
  const seenMetrics = new Set()
  METRIC_RE.lastIndex = 0
  while ((m = METRIC_RE.exec(clean)) && metrics.length < 10) {
    const name = m[1].trim()
    if (!name || seenMetrics.has(name)) continue
    seenMetrics.add(name)
    metrics.push({ name, value: m[2], unit: m[3], insight: '', isHighlight: false, category: '', confidence: 0.4, source: 'auto' })
  }

  // 地点：文中出现「XX村/XX园/XX基地/XX站」等实践场所
  const places = []
  const PLACE_RE = /((?:回头岭|王家|李家|张家|陈家|大|小|老|新|东|西|南|北)?[一-龥]{2,4}(?:村|镇|园|基地|站|厂|学校|小学|中学|院|寺|庙|祠|堂|馆|所|中心))/g
  const seenPlaces = new Set()
  while ((m = PLACE_RE.exec(clean)) && places.length < 8) {
    const name = m[1]
    if (seenPlaces.has(name)) continue
    seenPlaces.add(name)
    places.push({ name, date: '', event: '', note: '', category: '', confidence: 0.35, source: 'auto' })
  }

  return { people, metrics, materialHints: [], places, source: 'template' }
}
