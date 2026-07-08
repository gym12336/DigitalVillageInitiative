// 实践档案模型 + 服务端读写。视图层不直接碰 fetch，所有增删改一律经此。
// 后端上线后：本模块内部从 localStorage 切到调 api.js（见后端设计文档 §4）。
// 导出函数名/语义尽量不变，但均改为 async；addDossier/updateDossier 内部逻辑按 §4 重写。
import {
  apiListDossiers,
  apiGetDossier,
  apiCreateDossier,
  apiUpdateDossier,
  apiDeleteDossier,
  apiImportDossiers,
} from './api.js'

// 旧数据迁移用的 localStorage key（后端上线前的本机档案）。
const LEGACY_KEY = 'sx.mine.dossiers'
const MIGRATED_KEY = 'sx.mine.migrated'

// 阶段流转顺序：实践前 → 实践中 → 实践后
export const STAGES = ['plan', 'track', 'result']

// 生成唯一 id：时间戳 + 随机后缀。调用方可注入 now/rand 以便测试可复现。
// 后端 import 会重铸 id，但新建走 POST 时用前端 id 落库（前后端 id 体系统一）。
function genId(now = Date.now(), rand = Math.random()) {
  return `d${now.toString(36)}${Math.floor(rand * 1e6).toString(36)}`
}

// 由 idea 摘要出一个默认标题（取前 16 字）。
function titleFromIdea(idea) {
  const s = String(idea || '').trim().replace(/\s+/g, ' ')
  if (!s) return '未命名实践'
  return s.length > 16 ? s.slice(0, 16) + '…' : s
}

// 由概要生成默认标题：队名+主题 → 「队名·主题」；缺一个用另一个；都缺回落到 idea 摘要。
function titleFromSummary({ teamName, topic, idea }) {
  const team = String(teamName || '').trim()
  const t = String(topic || '').trim()
  if (team && t) return `${team}·${t}`
  if (team) return team
  if (t) return t
  return titleFromIdea(idea)
}

/**
 * 造一份空档案（纯函数，不落库）。opts 可带：
 * idea/title/village/province，以及概要字段 teamName/topic/startDate/endDate，
 * 还有可注入的 now/rand（测试用）。
 */
export function createDossier(opts = {}) {
  const {
    idea = '',
    title,
    village = '',
    province = '',
    teamName = '',
    topic = '',
    startDate = '',
    endDate = '',
    now = Date.now(),
    rand = Math.random(),
  } = opts
  const ts = new Date(now).toISOString()
  return {
    id: genId(now, rand),
    title: title || titleFromSummary({ teamName, topic, idea }),
    teamName,
    village,
    province,
    idea,
    plan: { goal: '', topic, targetVillage: village, metrics: [], expected: '' },
    refs: [],
    collected: { metricValues: [], materials: [], people: [] },
    startDate,
    endDate,
    stage: 'plan',
    createdAt: ts,
    updatedAt: ts,
  }
}

/**
 * 读取本队全部档案（列表，含预览字段）。失败上抛由调用方处理。
 * 后端方案 A 返回扁平预览字段（idea/village/topic/targetVillage/updated_at），
 * 这里回填成卡片模板期望的形状（updatedAt + 嵌套 plan），把差异隔离在 dossier.js 内。
 */
export async function loadDossiers(teamId) {
  const rows = await apiListDossiers(teamId)
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    stage: r.stage,
    createdBy: r.created_by,
    updatedAt: r.updated_at,
    idea: r.idea || '',
    village: r.village || '',
    plan: { topic: r.topic || '', targetVillage: r.targetVillage || '' },
  }))
}

/**
 * 新建一份档案：造对象 → 单件 POST 落库 → 返回后端回传的档案。
 * 不再整表读写（对比旧 localStorage 版本）。
 */
export async function addDossier(teamId, opts = {}) {
  const d = createDossier(opts)
  return apiCreateDossier(teamId, d)
}

/**
 * 按 id 更新档案：保持「浅合并 patch」的对外契约不变。
 * 后端 PUT 是全量更新，故内部先取全量 → 内存合并 patch → PUT 全量。
 * 找不到（404）等错误上抛。now 可注入以便测试。
 */
export async function updateDossier(id, patch, now = Date.now()) {
  const current = await apiGetDossier(id)
  if (!current) return null
  const merged = { ...current, ...patch, id, updatedAt: new Date(now).toISOString() }
  return apiUpdateDossier(id, merged)
}

/** 删除档案。成功 resolve；失败（403/404）上抛。 */
export async function removeDossier(id) {
  await apiDeleteDossier(id)
  return true
}

/** 推进/设置阶段。stage 非法则忽略返回 null。复用 updateDossier。 */
export async function setStage(id, stage, now = Date.now()) {
  if (!STAGES.includes(stage)) return null
  return updateDossier(id, { stage }, now)
}

/**
 * 补全一份档案的必备结构。迁移导入或历史数据可能缺 plan/refs/collected 等字段，
 * 阶段视图（尤其 StagePlan）假定它们存在；此处统一回填，避免打开时渲染崩溃。
 * 只补缺失字段，不覆盖已有值。
 */
export function normalizeDossier(d) {
  if (!d || typeof d !== 'object') return d
  const plan = d.plan && typeof d.plan === 'object' ? d.plan : {}
  const collected = d.collected && typeof d.collected === 'object' ? d.collected : {}
  return {
    ...d,
    stage: STAGES.includes(d.stage) ? d.stage : 'plan',
    idea: d.idea || '',
    village: d.village || '',
    refs: Array.isArray(d.refs) ? d.refs : [],
    plan: {
      goal: plan.goal || '',
      topic: plan.topic || '',
      targetVillage: plan.targetVillage || '',
      metrics: Array.isArray(plan.metrics) ? plan.metrics : [],
      expected: plan.expected || '',
      // 新增字段：尽力兼容旧档案（无这些字段时补空）。视图按空渲染，不崩。
      background: plan.background || '',
      methods: Array.isArray(plan.methods) ? plan.methods : [],
      risks: Array.isArray(plan.risks) ? plan.risks : [],
      phases: Array.isArray(plan.phases) ? plan.phases : [],
      source: plan.source || '',
    },
    collected: {
      metricValues: Array.isArray(collected.metricValues) ? collected.metricValues : [],
      materials: Array.isArray(collected.materials) ? collected.materials : [],
      people: Array.isArray(collected.people) ? collected.people : [],
    },
  }
}

/** 读单份完整档案。找不到返回 null（api 层对 404 抛错，这里吞成 null 保持旧契约）。
 *  返回前统一补全结构，兼容迁移导入/历史的不完整档案。 */
export async function getDossier(id) {
  try {
    const d = await apiGetDossier(id)
    return d ? normalizeDossier(d) : d
  } catch (e) {
    if (e && e.status === 404) return null
    throw e
  }
}

// —— 一次性迁移（旧 localStorage 档案 → 服务端）——

// 无 window 的测试环境降级：返回一个内存 store 的最小子集。
function getStore() {
  if (typeof localStorage !== 'undefined' && localStorage) return localStorage
  return null
}

/** 读旧 localStorage 档案。损坏/无则返回 []。 */
export function readLegacyDossiers() {
  const store = getStore()
  if (!store) return []
  try {
    const raw = store.getItem(LEGACY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** 是否有待迁移的旧档案（且本次尚未标记迁移过）。供门禁决定是否提示。 */
export function hasPendingMigration() {
  const store = getStore()
  if (!store) return false
  if (store.getItem(MIGRATED_KEY)) return false
  return readLegacyDossiers().length > 0
}

/**
 * 一次性迁移：单次调 /import（后端单事务全或无、每条重铸 id）。
 * 成功后才清本地键并写 migrated 标记（teamId），失败则本地键保留、可安全重试。
 * 返回 { imported, ids }。无旧档案时返回 { imported: 0, ids: [] } 且不请求。
 */
export async function migrateLegacyDossiers(teamId) {
  const legacy = readLegacyDossiers()
  if (!legacy.length) return { imported: 0, ids: [] }
  const result = await apiImportDossiers(teamId, legacy)
  // 收到成功响应后才清本地键 + 写标记，防二次迁移；失败会在上面抛出、不到这里。
  const store = getStore()
  if (store) {
    try {
      store.removeItem(LEGACY_KEY)
      store.setItem(MIGRATED_KEY, String(teamId ?? ''))
    } catch {
      /* 清理失败不影响已成功的导入 */
    }
  }
  return result
}
