// 村庄数据纯函数：校验、地图散点映射、按行政层级过滤。无副作用，可单测。

const REGION_KEY = { province: 'province', city: 'city', district: 'district' }

export function validateVillages(list, coreFields) {
  const errors = []
  list.forEach((v, i) => {
    for (const f of coreFields) {
      if (v[f] === undefined || v[f] === null || v[f] === '') {
        errors.push(`第 ${i} 条(${v.name || v.id || '未知'}) 缺字段: ${f}`)
      }
    }
    if (v.coord && (!Array.isArray(v.coord) || v.coord.length !== 2)) {
      errors.push(`第 ${i} 条(${v.name}) coord 应为 [lng,lat]`)
    }
  })
  return errors
}

export function toScatterPoints(list) {
  return list
    .filter((v) => Array.isArray(v.coord) && v.coord.length === 2)
    .map((v) => ({ name: v.name, value: [v.coord[0], v.coord[1]], id: v.id }))
}

// region: { level: 'country'|'province'|'city'|'district', name?: string }
export function filterByRegion(list, region) {
  if (!region || region.level === 'country') return list
  const key = REGION_KEY[region.level]
  if (!key) return list
  return list.filter((v) => v[key] === region.name)
}
