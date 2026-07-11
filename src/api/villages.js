// 乡村百科 API 层：封装所有村庄相关的 HTTP 请求。
// 服务端分页模式：不再一次性拉全量，改为按需分页加载。

const BASE = '/api/villages'

/**
 * 分页获取村庄列表（服务端分页 + 搜索 + 筛选）
 * @param {Object} params
 * @param {number}  params.page       - 页码，默认 1
 * @param {number}  params.pageSize   - 每页条数，默认 30（范围 20-50）
 * @param {string}  params.q          - 关键词搜索
 * @param {string}  params.province   - 省份筛选
 * @param {string}  params.city       - 城市筛选（需后端支持）
 * @param {string}  params.district   - 区县筛选（需后端支持）
 * @param {string}  params.tag        - 标签筛选
 * @param {string}  params.honor      - 荣誉筛选（需后端支持）
 * @param {string}  params.sortBy     - 排序方式：latest / views / favorites / practices
 * @returns {{ villages: Array, total: number, page: number, pageSize: number, totalPages: number }}
 */
export async function fetchVillagesPage({
  page = 1,
  pageSize = 30,
  q = '',
  province = '',
  city = '',
  district = '',
  tag = '',
  honor = '',
  sortBy = 'latest',
} = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  if (q) params.set('q', q)
  if (province) params.set('province', province)
  if (city) params.set('city', city)
  if (district) params.set('district', district)
  if (tag) params.set('tag', tag)
  if (honor) params.set('honor', honor)

  const res = await fetch(`${BASE}?${params.toString()}`)
  if (!res.ok) throw new Error(`获取村庄列表失败：${res.status}`)
  const data = await res.json()

  // 统一 stats 字段格式
  const villages = (data.villages || []).map((v) => ({
    ...v,
    stats: { views: v.views || 0, favorites: v.favorites || 0, practices: v.practices || 0 },
  }))

  // 若需要排序，客户端对当前页排序（后端 sortBy 参数后续对接）
  if (sortBy !== 'latest' && sortBy !== 'name') {
    const byStat = (key) => (a, b) => ((b.stats && b.stats[key]) || 0) - ((a.stats && a.stats[key]) || 0)
    villages.sort(byStat(sortBy))
  }

  return {
    villages,
    total: data.total || 0,
    page: data.page || page,
    pageSize: data.pageSize || pageSize,
    totalPages: data.totalPages || Math.ceil((data.total || 0) / pageSize),
  }
}

/** 获取单个村庄详情 */
export async function fetchVillage(id) {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(`获取村庄详情失败：${res.status}`)
  const data = await res.json()
  const v = data.village
  if (!v) return null
  return {
    ...v,
    stats: { views: v.views || 0, favorites: v.favorites || 0, practices: v.practices || 0 },
  }
}

/**
 * 获取全部村庄（兜底：内部调分页接口拉一大页）。
 * 供 Gallery/Honors/Tags/List 等需要全量数据的横向页使用。
 * @param {Object} [params] - 透传给 fetchVillagesPage 的筛选参数
 * @returns {Promise<Array>} 村庄数组（含 stats 字段）
 */
export async function fetchAllVillages(params = {}) {
  const { villages } = await fetchVillagesPage({ ...params, page: 1, pageSize: 1000 })
  return villages
}

/**
 * 获取筛选元数据：省份列表 + 热门标签 + 荣誉列表
 * @returns {{ provinces: string[], topTags: Array<{name:string,count:number}>, honors?: Array<{name:string,count:number}> }}
 */
export async function fetchMeta() {
  const res = await fetch(`${BASE}/meta`)
  if (!res.ok) throw new Error(`获取元数据失败：${res.status}`)
  return res.json()
}

