// 把一条 AI 提议的编辑操作应用到采集数据(collected)。纯函数、不依赖 Vue,便于单测。
// 用户确认后才调用。白名单与后端 practiceEditService 一致。
// collected 形状:{ people, metricValues, materials, places }(注意指标桶是 metricValues)。

// 每桶允许改的字段白名单。
const FIELD_WHITELIST = {
  people: ['name', 'role', 'quote', 'story', 'highlight', 'category'],
  metrics: ['name', 'before', 'after', 'unit', 'insight', 'category'],
  places: ['name', 'date', 'event', 'note', 'category'],
  materials: ['name', 'note', 'summary', 'theme'],
}

// bucket 名 → collected 里的数组字段名(指标桶特殊)。
const BUCKET_KEY = {
  people: 'people',
  metrics: 'metricValues',
  places: 'places',
  materials: 'materials',
}

/**
 * 应用一条编辑操作到 collected(原地修改)。
 * @param {object} collected - { people, metricValues, materials, places }
 * @param {object} op - { op, bucket, target, field?, value?, reason? }
 * @returns {{ ok: boolean, desc: string }} ok=false 表示无法应用(匹配不到/字段越界等)。
 */
export function applyEditOp(collected, op) {
  if (!collected || !op || typeof op !== 'object') return { ok: false, desc: '无效操作' }
  const bucket = op.bucket
  const key = BUCKET_KEY[bucket]
  const whitelist = FIELD_WHITELIST[bucket]
  if (!key || !whitelist) return { ok: false, desc: '未知资料类别' }

  const arr = Array.isArray(collected[key]) ? collected[key] : null
  if (!arr) return { ok: false, desc: '资料为空' }

  const target = String(op.target || '').trim()

  if (op.op === 'update') {
    const field = String(op.field || '').trim()
    if (!whitelist.includes(field)) return { ok: false, desc: `不允许修改字段 ${field}` }
    const item = arr.find((x) => String(x?.name || '').trim() === target)
    if (!item) return { ok: false, desc: `未找到「${target}」` }
    item[field] = String(op.value ?? '')
    return { ok: true, desc: op.reason || `已更新「${target}」的${field}` }
  }

  if (op.op === 'delete') {
    const idx = arr.findIndex((x) => String(x?.name || '').trim() === target)
    if (idx < 0) return { ok: false, desc: `未找到「${target}」` }
    arr.splice(idx, 1)
    return { ok: true, desc: op.reason || `已删除「${target}」` }
  }

  if (op.op === 'merge_category') {
    const to = String(op.value || '').trim()
    if (!to) return { ok: false, desc: '缺少目标分类' }
    let n = 0
    for (const x of arr) {
      if (String(x?.category || '').trim() === target) { x.category = to; n++ }
    }
    if (!n) return { ok: false, desc: `没有分类为「${target}」的条目` }
    return { ok: true, desc: op.reason || `已把 ${n} 条「${target}」并入「${to}」` }
  }

  return { ok: false, desc: `未知操作 ${op.op}` }
}

/** 给一条 op 生成人类可读的「改前→改后」预览文本,用于待确认清单。 */
export function describeOp(collected, op) {
  const key = BUCKET_KEY[op?.bucket]
  const label = { people: '人物', metrics: '指标', places: '足迹', materials: '发现' }[op?.bucket] || '资料'
  if (op?.op === 'update') {
    const arr = key && Array.isArray(collected?.[key]) ? collected[key] : []
    const item = arr.find((x) => String(x?.name || '').trim() === String(op.target || '').trim())
    const old = item ? String(item[op.field] ?? '') : ''
    return { label, action: '修改', text: `「${op.target}」${op.field}:${old || '(空)'} → ${op.value || '(空)'}` }
  }
  if (op?.op === 'delete') return { label, action: '删除', text: `删除「${op.target}」` }
  if (op?.op === 'merge_category') return { label, action: '合并分类', text: `「${op.target}」→「${op.value}」` }
  return { label, action: '操作', text: op?.reason || '' }
}
