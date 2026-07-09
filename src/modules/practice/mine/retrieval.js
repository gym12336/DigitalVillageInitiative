import { apiSearchWeb } from './api.js'

// 懂平台检索：输入 idea + 四类站内数据源，输出统一可跳转卡片数组。
// 规则版实现，为将来接真实 LLM 预留同样的输入输出契约（换实现不换调用方）。
// 纯函数：不依赖 Vue、不碰 DOM、不读 localStorage。

// 极简停用词表：切词后过滤掉这些无区分度的词。
const STOP_WORDS = new Set([
  '的', '了', '和', '与', '把', '在', '去', '给', '让', '为', '对', '到', '我', '们', '我们',
  '一个', '这个', '那个', '想', '要', '做', '帮', '帮村民', '村民', '一些', '还有', '以及',
  '如何', '怎么', '什么', '可以', '进行', '通过', '来', '出', '卖', 'the', 'a', 'to', 'of', 'and',
])

const CJK = /[一-龥]/

/**
 * 从 idea 提取关键词。中文无词边界，纯 JS 无分词库，故采用轻量策略：
 * 先按标点/空白切段，再对每个中文段生成 2/3 字 n-gram、对英数段整体保留，
 * 去停用词与重复。n-gram 与站内文本做子串匹配，等效于「懂平台」的词汇命中。
 */
export function extractKeywords(idea) {
  const segments = String(idea || '')
    .toLowerCase()
    .split(/[\s,，。、；;：:！!？?（）()【】\[\]"“”'’~·\-—/\\]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const out = []
  const seen = new Set()
  const push = (w) => {
    if (!w || STOP_WORDS.has(w) || seen.has(w)) return
    seen.add(w)
    out.push(w)
  }

  for (const seg of segments) {
    if (!CJK.test(seg)) {
      if (seg.length >= 2) push(seg) // 英文/数字整体保留
      continue
    }
    // 中文段：滑窗生成 2、3 字 n-gram
    for (const size of [2, 3]) {
      for (let i = 0; i + size <= seg.length; i++) {
        push(seg.slice(i, i + size))
      }
    }
  }
  return out
}

// 统计 keywords 在文本中的命中数（子串包含即计一次）。
function hitCount(text, keywords) {
  const hay = String(text || '').toLowerCase()
  let n = 0
  for (const kw of keywords) if (hay.includes(kw)) n++
  return n
}

// 把村庄 tags（{类目: [标签]}）拍平成一个字符串，便于命中类目/标签。
function flattenVillageTags(tags) {
  if (!tags || typeof tags !== 'object') return ''
  return Object.entries(tags)
    .map(([cat, arr]) => cat + ' ' + (Array.isArray(arr) ? arr.join(' ') : ''))
    .join(' ')
}

const TITLE_WEIGHT = 3 // 标题命中权重最高
const SUB_WEIGHT = 1 // 摘要/正文命中
const TAG_WEIGHT = 2 // 类型/标签命中
const VILLAGE_EXACT = 4 // 村庄名精确命中额外加分

// 村庄名精确命中：任一关键词等于村名，或村名（去掉「村」后缀）出现在 idea 文本 / 显式目标村里。
function villageNameHit(name, keywords, ideaText, targetVillage = '') {
  if (!name) return false
  const lower = name.toLowerCase()
  const bare = lower.replace(/村$/, '')
  const ideaLower = String(ideaText || '').toLowerCase()
  const targetLower = String(targetVillage || '').toLowerCase()
  if (ideaLower.includes(lower) || (bare && ideaLower.includes(bare))) return true
  if (targetLower && (targetLower === lower || targetLower === bare)) return true
  return keywords.some((kw) => kw === lower || kw === bare)
}

/**
 * 统一检索。sources: { villages, results, demands, guide }。
 * 每类按 score 降序取 top（默认 4）。返回卡片 { source, id, title, sub, path, score }。
 */
export function retrieve(idea, sources = {}, { perSource = 4, topic = '', village = '' } = {}) {
  const keywords = [...new Set([...extractKeywords(idea), ...extractKeywords(topic)])]
  if (!keywords.length) return []

  const { villages = [], results = [], demands = [], guide = {} } = sources
  const cards = []

  // —— 乡村百科 villages —— path → /villages/:id
  for (const v of villages) {
    const tagText = flattenVillageTags(v.tags)
    let score =
      hitCount(v.name, keywords) * TITLE_WEIGHT +
      hitCount([v.summary, v.intro, v.fullName].join(' '), keywords) * SUB_WEIGHT +
      hitCount(tagText, keywords) * TAG_WEIGHT
    if (villageNameHit(v.name, keywords, idea, village)) score += VILLAGE_EXACT
    if (score > 0) {
      cards.push({
        source: 'village',
        id: v.id,
        title: v.name,
        sub: v.summary || v.fullName || '',
        path: `/villages/${v.id}`,
        score,
      })
    }
  }

  // —— 实践成果 results —— path → /practice（成果详情下期）
  for (const r of results) {
    let score =
      hitCount(r.title, keywords) * TITLE_WEIGHT +
      hitCount([r.school, r.team].join(' '), keywords) * SUB_WEIGHT +
      hitCount(r.type, keywords) * TAG_WEIGHT
    if (villageNameHit(r.village, keywords, idea, village)) score += VILLAGE_EXACT
    if (score > 0) {
      cards.push({
        source: 'result',
        id: r.id,
        title: r.title,
        sub: `${r.school || ''}｜${r.type || ''}`,
        path: '/practice',
        score,
      })
    }
  }

  // —— 乡村之声需求 demands —— path → /voice
  for (const d of demands) {
    const majorText = Array.isArray(d.majors) ? d.majors.join(' ') : ''
    let score =
      hitCount(d.title, keywords) * TITLE_WEIGHT +
      hitCount([d.desc, majorText].join(' '), keywords) * SUB_WEIGHT +
      hitCount(d.type, keywords) * TAG_WEIGHT
    if (villageNameHit(d.village, keywords, idea, village)) score += VILLAGE_EXACT
    if (score > 0) {
      cards.push({
        source: 'demand',
        id: d.id,
        title: d.title,
        sub: `${d.town || ''} · ${d.village || ''}｜${d.type || ''}`,
        path: '/voice',
        score,
      })
    }
  }

  // —— 实践攻略 guide —— path → /guide。展开 categories.items 逐条打分。
  const guideItems = []
  if (Array.isArray(guide.categories)) {
    for (const cat of guide.categories) {
      for (const it of cat.items || []) {
        guideItems.push({ ...it, catName: cat.name, catId: cat.id })
      }
    }
  }
  for (const it of guideItems) {
    const score =
      hitCount(it.name, keywords) * TITLE_WEIGHT +
      hitCount([it.desc, it.catName].join(' '), keywords) * SUB_WEIGHT
    if (score > 0) {
      cards.push({
        source: 'guide',
        id: `${it.catId}:${it.name}`,
        title: it.name,
        sub: `${it.catName || '攻略'}｜${it.desc || ''}`,
        path: '/guide',
        score,
      })
    }
  }

  // 各来源内部按 score 降序取 top N，再合并按 score 降序返回。
  const bySource = { village: [], result: [], demand: [], guide: [] }
  for (const c of cards) bySource[c.source].push(c)
  const merged = []
  for (const key of Object.keys(bySource)) {
    bySource[key].sort((a, b) => b.score - a.score)
    merged.push(...bySource[key].slice(0, perSource))
  }
  return merged.sort((a, b) => b.score - a.score)
}

/**
 * 联网搜索目标村信息，结果格式化为统一检索卡片 + AI 概况。
 * 失败吞错返回空——联网搜索是锦上添花，不阻塞主流程。
 * @param {string} village - 目标村名
 * @param {string} idea - 实践 idea
 * @returns {Promise<{ cards: Array, overview: { answer: string, references: Array } | null }>}
 */
export async function searchWeb(village, idea) {
  try {
    const data = await apiSearchWeb({ village, idea })
    const cards = (data.results || []).map((r) => ({
      source: 'web',
      id: r.url || '',
      title: r.title || '',
      sub: r.snippet || '',
      path: r.url || '',
      dimension: r.dimension || '',
      relevance: r.relevance || 'low',
    }))
    const overview = data.overview || null
    return { cards, overview }
  } catch {
    return { cards: [], overview: null }
  }
}
