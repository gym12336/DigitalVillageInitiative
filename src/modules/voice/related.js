// 相关需求推荐:纯函数,便于单测。
// 打分规则:同乡镇 +3,同类型 +2,每个共同专业 +1。降序取前 n,排除自身。
// 得分并列时按浏览量降序,保证结果确定。

/**
 * @param {object} current - 当前需求(含 town/type/majors)
 * @param {object[]} all - 全部需求
 * @param {number} [n=3] - 取前几条
 * @returns {object[]} 相关需求(不含 current),最多 n 条
 */
export function relatedDemands(current, all, n = 3) {
  if (!current || !Array.isArray(all)) return []
  const currentMajors = new Set(current.majors || [])

  const scored = []
  for (const d of all) {
    if (!d || d.id === current.id) continue
    let score = 0
    if (d.town && d.town === current.town) score += 3
    if (d.type && d.type === current.type) score += 2
    for (const m of d.majors || []) {
      if (currentMajors.has(m)) score += 1
    }
    if (score > 0) scored.push({ d, score })
  }

  scored.sort((a, b) => b.score - a.score || (b.d.views || 0) - (a.d.views || 0))
  return scored.slice(0, n).map((s) => s.d)
}
