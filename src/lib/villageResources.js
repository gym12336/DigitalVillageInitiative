// 村庄资源汇总纯函数：从 village.extra 计算各类资源数量，供信息卡/左侧栏使用。无副作用，可单测。

// 单个村庄的资源计数
export function summarize(village) {
  const e = (village && village.extra) || {}
  const media = e.media || []
  return {
    resources: (e.resources || []).length,
    people: (e.people || []).length,
    photos: media.filter((m) => (typeof m === 'object' ? m.type === 'photo' : false)).length,
    videos: media.filter((m) => (typeof m === 'object' ? m.type === 'video' : false)).length,
    history: (e.history || []).length,
  }
}

// 全站按村庄 type 分组计数（左侧栏资源类型分布）
export function resourceTypeStats(villages) {
  const map = {}
  for (const v of villages) {
    map[v.type] = (map[v.type] || 0) + 1
  }
  return Object.entries(map).map(([type, count]) => ({ type, count }))
}

// 资源最多的前 N 个村庄（左侧栏 Top 榜）
export function topByResources(villages, n = 3) {
  return [...villages]
    .map((v) => ({ id: v.id, name: v.name, count: summarize(v).resources }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

// 资源最多的前 N 个村庄，保留完整字段（信息卡空状态推荐用，需要 province/city）
export function recommendVillages(villages, n = 4) {
  return [...villages]
    .map((v) => ({ v, count: summarize(v).resources }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map((x) => x.v)
}
