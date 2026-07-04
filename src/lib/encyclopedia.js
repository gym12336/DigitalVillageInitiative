// 乡村百科检索纯函数：行政树、多条件筛选、排序、荣誉汇总。无副作用，可单测。

/** 构建行政级联树：{ 省: { 市: { 区县: [village...] } } }，供级联下拉。 */
export function buildRegionTree(list) {
  const tree = {}
  for (const v of list) {
    const p = v.province || '未知'
    const c = v.city || '未知'
    const d = v.district || '未知'
    tree[p] = tree[p] || {}
    tree[p][c] = tree[p][c] || {}
    tree[p][c][d] = tree[p][c][d] || []
    tree[p][c][d].push(v)
  }
  return tree
}

/** 多条件筛选：keyword（name/fullName/tags/honors，大小写不敏感）、province/city/district、honor。'全部'/空表示不限。 */
export function filterVillages(list, { keyword = '', province = '全部', city = '全部', district = '全部', honor = '全部' } = {}) {
  const kw = String(keyword).trim().toLowerCase()
  return list.filter((v) => {
    if (province !== '全部' && v.province !== province) return false
    if (city !== '全部' && v.city !== city) return false
    if (district !== '全部' && v.district !== district) return false
    if (honor !== '全部' && !(v.honors || []).includes(honor)) return false
    if (kw) {
      const tagWords = v.tags ? Object.values(v.tags).flat() : []
      const hay = [v.name, v.fullName, v.summary, ...(v.honors || []), ...tagWords].join(' ').toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
}

/** 排序，返回新数组：latest(保持原序) / views / favorites / practices（后三者按 stats 降序）。 */
export function sortVillages(list, sortBy = 'latest') {
  const arr = [...list]
  const byStat = (key) => (a, b) => ((b.stats && b.stats[key]) || 0) - ((a.stats && a.stats[key]) || 0)
  if (sortBy === 'views') return arr.sort(byStat('views'))
  if (sortBy === 'favorites') return arr.sort(byStat('favorites'))
  if (sortBy === 'practices') return arr.sort(byStat('practices'))
  return arr // latest：保持数据文件原有顺序（入驻序）
}

/** 汇总去重荣誉列表 + 计数，供荣誉标签墙。按计数降序。 */
export function allHonors(list) {
  const map = {}
  for (const v of list) {
    for (const h of v.honors || []) map[h] = (map[h] || 0) + 1
  }
  return Object.entries(map)
    .map(([honor, count]) => ({ honor, count }))
    .sort((a, b) => b.count - a.count)
}
