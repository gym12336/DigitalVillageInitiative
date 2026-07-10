// 对照方案分析缺口：输入档案，输出缺口提醒清单。纯函数。
// 每条缺口 { type, level, message }，level: 'warn' | 'tip'。

// 阈值：低于则提醒补齐。
const MATERIAL_MIN = 3 // 材料建议数
const PEOPLE_MIN = 2 // 人物访谈建议数

/**
 * 分析档案缺口。返回 { gaps: [{type, level, message}], complete: boolean }。
 * complete 表示无 warn 级缺口（tip 不影响完整性判断）。
 */
export function analyzeGaps(dossier, now = Date.now()) {
  const gaps = []
  if (!dossier) return { gaps, complete: false }

  const plan = dossier.plan || {}
  const collected = dossier.collected || {}
  const planMetrics = Array.isArray(plan.metrics) ? plan.metrics : []
  const metricValues = Array.isArray(collected.metricValues) ? collected.metricValues : []
  const materials = Array.isArray(collected.materials) ? collected.materials : []
  const people = Array.isArray(collected.people) ? collected.people : []

  // 1) 方案还没生成
  if (!plan.topic && !planMetrics.length) {
    gaps.push({
      type: 'no-plan',
      level: 'warn',
      message: '还没有方案。先回到「实践前」生成方案初稿，才好对照采集数据。',
    })
  }

  // 2) 计划指标里 before/after 未填全的
  const filledNames = new Set(
    metricValues
      .filter((m) => isFilled(m.before) && isFilled(m.after))
      .map((m) => m.name),
  )
  const partialNames = new Set(
    metricValues
      .filter((m) => isFilled(m.before) !== isFilled(m.after))
      .map((m) => m.name),
  )
  for (const pm of planMetrics) {
    if (filledNames.has(pm.name)) continue
    if (partialNames.has(pm.name)) {
      gaps.push({
        type: 'metric-partial',
        level: 'warn',
        message: `指标「${pm.name}」只填了前值或后值，补齐前后值才能算帮扶成效。`,
      })
    } else {
      gaps.push({
        type: 'metric-missing',
        level: 'warn',
        message: `计划采集的指标「${pm.name}」还没登记数据。`,
      })
    }
  }

  // 3) 材料数量偏少
  if (materials.length < MATERIAL_MIN) {
    gaps.push({
      type: 'material-few',
      level: 'tip',
      message: `已登记 ${materials.length} 份材料，建议补到 ${MATERIAL_MIN} 份以上（照片、访谈记录、调研笔记等），成果卡会更充实。`,
    })
  }

  // 4) 人物访谈数量建议
  if (people.length < PEOPLE_MIN) {
    gaps.push({
      type: 'people-few',
      level: 'tip',
      message: `已记录 ${people.length} 位人物，建议至少访谈 ${PEOPLE_MIN} 位，人物故事墙才立得住。`,
    })
  }

  // 5) 时段过半但进度不足：对照 startDate/endDate 与整体完成度做动态督进。
  const pace = computePace(dossier, plan, collected, planMetrics, materials, people, now)
  if (pace && pace.elapsedRatio > 0.5 && pace.progress < 0.5) {
    gaps.push({
      type: 'pace-slow',
      level: 'warn',
      message: `实践时段已过 ${Math.round(pace.elapsedRatio * 100)}%，但整体完成度约 ${Math.round(pace.progress * 100)}%，进度偏慢，抓紧补齐任务与采集。`,
    })
  }

  const complete = gaps.every((g) => g.level !== 'warn')
  return { gaps, complete }
}

// 计算时段进度与整体完成度。缺时段信息返回 null（不参与督进）。
// 整体完成度 = 任务/指标/材料/人物 四维完成率的均值（各维无目标则不计入）。
function computePace(dossier, plan, collected, planMetrics, materials, people, now) {
  const start = Date.parse(dossier.startDate)
  const end = Date.parse(dossier.endDate)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  const elapsedRatio = Math.max(0, Math.min(1, (now - start) / (end - start)))

  const dims = []

  // 任务维：track 段任务勾选率
  const phases = Array.isArray(plan.phases) ? plan.phases : []
  const track = phases.find((p) => p && p.stage === 'track')
  const tasks = track && Array.isArray(track.tasks) ? track.tasks : []
  if (tasks.length) dims.push(tasks.filter((t) => t.done).length / tasks.length)

  // 指标维：计划指标里前后值都填齐的比例
  if (planMetrics.length) {
    const metricValues = Array.isArray(collected.metricValues) ? collected.metricValues : []
    const filled = new Set(
      metricValues.filter((m) => isFilled(m.before) && isFilled(m.after)).map((m) => m.name),
    )
    dims.push(planMetrics.filter((pm) => filled.has(pm.name)).length / planMetrics.length)
  }

  // 材料/人物维：按建议阈值封顶为 1
  dims.push(Math.min(1, materials.length / MATERIAL_MIN))
  dims.push(Math.min(1, people.length / PEOPLE_MIN))

  const progress = dims.length ? dims.reduce((a, b) => a + b, 0) / dims.length : 0
  return { elapsedRatio, progress }
}

// 视 0 为已填；空串/undefined/null 视为未填。
function isFilled(v) {
  return v !== undefined && v !== null && String(v).trim() !== ''
}
