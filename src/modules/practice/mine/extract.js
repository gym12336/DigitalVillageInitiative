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
  if (!clean) return { people: [], metrics: [], materialHints: [], source: 'empty' }
  try {
    const data = await request('/api/practice/media/extract', {
      method: 'POST',
      body: { text: clean },
    })
    if (data && Array.isArray(data.people)) return data
    return localExtract(clean)
  } catch {
    return localExtract(clean)
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
  if (!clean) return { people: [], metrics: [], materialHints: [], source: 'empty' }

  const people = []
  const seenPeople = new Set()
  let m
  QUOTE_RE.lastIndex = 0
  while ((m = QUOTE_RE.exec(clean)) && people.length < 10) {
    const name = m[1]
    if (seenPeople.has(name)) continue
    seenPeople.add(name)
    people.push({ name, role: '', quote: m[2].trim(), confidence: 0.4, source: 'auto' })
  }

  const metrics = []
  const seenMetrics = new Set()
  METRIC_RE.lastIndex = 0
  while ((m = METRIC_RE.exec(clean)) && metrics.length < 10) {
    const name = m[1].trim()
    if (!name || seenMetrics.has(name)) continue
    seenMetrics.add(name)
    metrics.push({ name, value: m[2], unit: m[3], confidence: 0.4, source: 'auto' })
  }

  return { people, metrics, materialHints: [], source: 'template' }
}
