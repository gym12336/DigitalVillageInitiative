// LLM 返回结构校验 + 规范化。校验不合格 → { ok:false }，由 service 走兜底。
// 合格则返回规范化 plan（补 done 默认、去多余字段、phases 补齐三段）。纯函数、可单测。

const STAGES = ['plan', 'track', 'result']
const PHASE_TITLES = {
  plan: '实践前准备',
  track: '实践中执行',
  result: '实践后总结',
}

function isStr(v) {
  return typeof v === 'string'
}
function nonEmptyStr(v) {
  return isStr(v) && v.trim().length > 0
}

function normStr(v) {
  return isStr(v) ? v.trim() : ''
}

function normStringArray(arr) {
  if (!Array.isArray(arr)) return []
  const out = []
  for (const item of arr) {
    if (nonEmptyStr(item)) out.push(item.trim())
  }
  return out
}

function normMetrics(arr) {
  if (!Array.isArray(arr)) return []
  const out = []
  for (const m of arr) {
    if (!m || typeof m !== 'object') continue
    if (!nonEmptyStr(m.name)) continue
    out.push({ name: m.name.trim(), unit: normStr(m.unit) })
  }
  return out
}

function normTask(t) {
  if (!t || typeof t !== 'object') return null
  if (!nonEmptyStr(t.text)) return null
  return {
    text: t.text.trim(),
    output: normStr(t.output),
    done: t.done === true,
  }
}

/**
 * 校验并规范化 LLM 返回。合格返回 { ok:true, plan }；不合格 { ok:false, reason }。
 * 规则：
 * - 顶层必须是对象。
 * - phases 必须是数组、且能覆盖 plan/track/result 三段（每段可以为空 tasks 数组，
 *   但至少要出现过 — 缺段视为不合格，走兜底比空段更靠谱）。
 * - 每段 tasks 必须是数组，每条 task 至少要有非空 text；无效 task 直接剔除。
 * - 未知字段丢弃，避免把 LLM 随手多写的字段写进档案。
 */
export function validatePlanShape(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, reason: 'not-object' }
  }

  if (!Array.isArray(input.phases)) {
    return { ok: false, reason: 'phases-missing' }
  }

  const stageSeen = new Set()
  const phasesByStage = {}
  for (const p of input.phases) {
    if (!p || typeof p !== 'object') continue
    if (!STAGES.includes(p.stage)) continue
    if (!Array.isArray(p.tasks)) continue
    stageSeen.add(p.stage)
    const tasks = []
    for (const t of p.tasks) {
      const nt = normTask(t)
      if (nt) tasks.push(nt)
    }
    phasesByStage[p.stage] = {
      stage: p.stage,
      title: nonEmptyStr(p.title) ? p.title.trim() : PHASE_TITLES[p.stage],
      tasks,
    }
  }

  for (const s of STAGES) {
    if (!stageSeen.has(s)) return { ok: false, reason: `stage-missing:${s}` }
  }

  const phases = STAGES.map((s) => phasesByStage[s])

  const plan = {
    goal: normStr(input.goal),
    topic: normStr(input.topic),
    targetVillage: normStr(input.targetVillage),
    expected: normStr(input.expected),
    metrics: normMetrics(input.metrics),
    background: normStr(input.background),
    methods: normStringArray(input.methods),
    risks: normStringArray(input.risks),
    phases,
  }
  return { ok: true, plan }
}

export const _internals = { STAGES, PHASE_TITLES }
