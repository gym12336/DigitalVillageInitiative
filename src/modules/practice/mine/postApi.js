// 实践后AI成果生成前端封装：叙事/编译/润色。
// 走 JSON（非 multipart），复用 api.js 的 request（自动带 token、错误处理）。
import { request } from './api.js'

/**
 * 生成成果叙事。
 * @param {object} data - { people, metricValues, materials, places, topic, village }
 * @returns {Promise<{headline, summary, highlights, sections, source}>}
 */
export async function apiNarrate(data = {}) {
  try {
    const r = await request('/api/practice/media/post-narrative', { method: 'POST', body: data })
    if (r && typeof r.headline === 'string') return r
    return { headline: '', summary: '', highlights: [], sections: [], source: 'error' }
  } catch {
    return { headline: '', summary: '', highlights: [], sections: [], source: 'error' }
  }
}

/**
 * AI编排组件布局。
 * @param {object} collected - dossier.collected 数据
 * @param {object} [opts] - { topic, village, intent }
 * @returns {Promise<{components, pageTitle, pageBackground, layoutHint, narrative, source}>}
 */
export async function apiCompile(collected = {}, opts = {}) {
  try {
    const r = await request('/api/practice/media/post-compile', {
      method: 'POST',
      body: { collected, topic: opts.topic, village: opts.village, intent: opts.intent },
    })
    if (r && Array.isArray(r.components)) return r
    return { components: [], pageTitle: '', pageBackground: '#ffffff', layoutHint: '', narrative: null, source: 'error' }
  } catch {
    return { components: [], pageTitle: '', pageBackground: '#ffffff', layoutHint: '', narrative: null, source: 'error' }
  }
}

/**
 * AI生成大组件（大组件编辑台用）。不需要dossier数据。
 * @param {string} intent - 用户对大组件的自然语言描述
 * @returns {Promise<{components, name, description, source}>}
 */
export async function apiBigComponent(intent = '') {
  try {
    const r = await request('/api/practice/media/post-big-component', {
      method: 'POST',
      body: { intent },
    })
    if (r && Array.isArray(r.components)) return r
    return { components: [], name: '', description: '', source: 'error' }
  } catch {
    return { components: [], name: '', description: '', source: 'error' }
  }
}

/**
 * 文案润色。
 * @param {string} text - 待润色文本
 * @param {string} [context] - 上下文
 * @returns {Promise<{polished, changes, source}>}
 */
export async function apiPolish(text, context = '') {
  try {
    const r = await request('/api/practice/media/post-polish', {
      method: 'POST',
      body: { text, context },
    })
    if (r && typeof r.polished === 'string') return r
    return { polished: text, changes: '', source: 'error' }
  } catch {
    return { polished: text, changes: '', source: 'error' }
  }
}
