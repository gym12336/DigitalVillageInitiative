// 方案生成编排：拼 prompt → 调 DeepSeek → 校验 → 通过则 AI 版；任一步失败静默回落规则版。
// 无授权逻辑（方案生成不涉及队权限），单纯组合 lib 里的三块。
import { chatJSON, NoKeyError } from '../lib/deepseek.js'
import { validatePlanShape } from '../lib/planSchema.js'
import { generateTemplatePlan } from '../lib/planTemplate.js'

const IDEA_MAX = 500
const REFS_TEXT_MAX = 1500
const REF_ITEM_MAX = 240

const SYSTEM_PROMPT = [
  '你是「大学生乡村实践方案规划助手」。请依据用户给的 idea 与站内采纳资源，产出可落地的实践方案。',
  '严格返回 JSON 对象，字段与结构如下（不要多写、也不要少写字段，缺就用空串/空数组）：',
  '{',
  '  "goal": string,                  // 一句话目标，含目标村与主要产出',
  '  "topic": string,                 // 选题方向（如「非遗文化挖掘与活化」）',
  '  "targetVillage": string,         // 目标村；无则空串',
  '  "expected": string,              // 预期成果',
  '  "background": string,            // 一句话背景/痛点（来自"乡村之声"或采纳资源）',
  '  "metrics": [{"name": string, "unit": string}],',
  '  "methods": [string],             // 建议调研方法',
  '  "risks": [string],               // 风险与预案',
  '  "phases": [                      // 恒三段，顺序：plan/track/result',
  '    {"stage": "plan",   "title": "实践前准备", "tasks": [{"text": string, "output": string, "done": false}]},',
  '    {"stage": "track",  "title": "实践中执行", "tasks": [...]},',
  '    {"stage": "result", "title": "实践后总结", "tasks": [...]}',
  '  ]',
  '}',
  '每段 tasks 3–6 条，具体可执行，text 要贴合给定 idea 与目标村，output 描述交付物；不要抽象口号，不要重复。',
].join('\n')

function truncate(s, n) {
  const str = String(s || '')
  return str.length > n ? str.slice(0, n) + '…' : str
}

function refsToBrief(refs) {
  if (!Array.isArray(refs) || !refs.length) return '（无采纳资源）'
  const labels = { village: '乡村百科', result: '实践成果', demand: '乡村之声', guide: '实践攻略' }
  const lines = []
  let used = 0
  for (const r of refs) {
    if (!r || typeof r !== 'object') continue
    const label = labels[r.source] || r.source || '资源'
    const title = String(r.title || '').trim()
    const sub = String(r.sub || '').trim()
    if (!title) continue
    const line = truncate(`- [${label}] ${title}${sub ? '：' + sub : ''}`, REF_ITEM_MAX)
    if (used + line.length + 1 > REFS_TEXT_MAX) break
    lines.push(line)
    used += line.length + 1
  }
  return lines.length ? lines.join('\n') : '（无采纳资源）'
}

function buildUserPrompt(input) {
  const { idea = '', refs = [], village = '', topic = '', startDate = '', endDate = '' } = input
  const parts = []
  parts.push(`idea：${truncate(idea, IDEA_MAX)}`)
  if (topic) parts.push(`已选选题方向：${truncate(topic, 60)}`)
  if (village) parts.push(`目标村（用户填的）：${truncate(village, 40)}`)
  if (startDate || endDate) parts.push(`实践时段：${startDate || '未定'} 至 ${endDate || '未定'}`)
  parts.push(`采纳资源（尽量吸收，尤其"乡村之声"的真实需求）：\n${refsToBrief(refs)}`)
  parts.push('请严格输出符合上述 JSON schema 的对象。')
  return parts.join('\n\n')
}

/**
 * 生成方案。opts.chatImpl 可注入（默认走 lib/deepseek 的 chatJSON），
 * 便于测试与将来换模型。
 *
 * 无论 LLM 成功/失败，接口始终返回一个合法的新 plan（source 标出来源）。
 */
export async function generatePlan(input = {}, opts = {}) {
  const chatImpl = opts.chatImpl || chatJSON
  const now = typeof opts.now === 'number' ? opts.now : Date.now()
  const generatedAt = new Date(now).toISOString()

  const template = () => ({ ...generateTemplatePlan({ ...input, now }), source: 'template', generatedAt })

  let raw
  try {
    raw = await chatImpl({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(input),
    })
  } catch (e) {
    if (!(e instanceof NoKeyError)) {
      // 5xx/超时/坏 JSON 等：服务端记一行日志，前端只拿模板版。
      console.warn('[planService] LLM 调用失败，回落规则版：', e?.message || e)
    }
    return template()
  }

  const { ok, plan } = validatePlanShape(raw)
  if (!ok) {
    console.warn('[planService] LLM 输出不合规，回落规则版')
    return template()
  }

  return {
    ...plan,
    source: 'ai',
    generatedAt,
  }
}
