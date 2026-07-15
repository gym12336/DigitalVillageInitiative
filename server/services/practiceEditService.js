// AI 自然语言编辑:把「四桶采集快照 + 用户指令」翻译成一组具体修改操作(ops)。
// 仿 practiceExtractService:chatJSON + 令牌桶限流,恒不抛(无 key/失败/残缺回落空 ops,source 标来源)。
// 只产出「提议」,不改数据;前端确认后才应用。
import { chatJSON } from '../lib/deepseek.js'
import { getDefaultBucket } from '../lib/rateLimiter.js'
import { EDIT_SYSTEM, buildEditUserPrompt } from './prompts/editPrompt.js'

const EDIT_MAX_TOKENS = 2000

// 每桶允许 AI 改的字段白名单(与前端 editApply 保持一致)。
const FIELD_WHITELIST = {
  people: ['name', 'role', 'quote', 'story', 'highlight', 'category'],
  metrics: ['name', 'before', 'after', 'unit', 'insight', 'category'],
  places: ['name', 'date', 'event', 'note', 'category'],
  materials: ['name', 'note', 'summary', 'theme'],
}
const BUCKETS = new Set(Object.keys(FIELD_WHITELIST))
const OPS = new Set(['update', 'delete', 'merge_category'])

let _bucket = null
function bucket() {
  if (!_bucket) _bucket = getDefaultBucket()
  return _bucket
}

function str(v) {
  return v === undefined || v === null ? '' : String(v)
}

/** 规范化+校验一条 op;非法(桶/操作/字段越界或缺 target)返回 null 丢弃。 */
function normOp(o) {
  if (!o || typeof o !== 'object') return null
  const op = str(o.op).trim()
  const bucketName = str(o.bucket).trim()
  if (!OPS.has(op) || !BUCKETS.has(bucketName)) return null

  const target = str(o.target).trim()
  const reason = str(o.reason).trim()

  if (op === 'update') {
    const field = str(o.field).trim()
    if (!target || !FIELD_WHITELIST[bucketName].includes(field)) return null
    return { op, bucket: bucketName, target, field, value: str(o.value), reason }
  }
  if (op === 'delete') {
    if (!target) return null
    return { op, bucket: bucketName, target, reason }
  }
  // merge_category: target=源分类, value=目标分类
  const value = str(o.value).trim()
  if (!target || !value) return null
  return { op, bucket: bucketName, target, value, reason }
}

function emptyResult(source) {
  return { ops: [], source }
}

/**
 * 把自然语言编辑指令翻译成修改操作。
 * @param {object} args
 * @param {object} args.snapshot - 四桶精简快照 { people, metrics, places, materials }
 * @param {string} args.instruction - 用户指令
 * @param {object} [opts]
 * @param {Function} [opts.chatImpl] - 注入 chatJSON(测试用)
 * @returns {Promise<{ops, source}>}
 *   source: 'ai' 成功 | 'empty' 空指令 | 'error' 失败兜底
 */
export async function editCollected({ snapshot, instruction } = {}, opts = {}) {
  const clean = String(instruction || '').trim()
  if (!clean) return emptyResult('empty')

  const chatImpl = opts.chatImpl || chatJSON

  let raw
  try {
    await bucket().acquire()
    raw = await chatImpl({
      system: EDIT_SYSTEM,
      user: buildEditUserPrompt(snapshot || {}, clean),
      maxTokens: EDIT_MAX_TOKENS,
    })
  } catch (e) {
    console.warn('[practiceEdit] LLM 调用失败,返回空 ops:', e?.message || e)
    return emptyResult('error')
  }

  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.ops)) return emptyResult('error')

  const ops = raw.ops.map(normOp).filter(Boolean)
  return { ops, source: 'ai' }
}
