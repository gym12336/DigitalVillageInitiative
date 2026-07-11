// 高德地图高程 API 封装（备选腾讯地图）。
// 高德 Web 服务 API：https://lbs.amap.com/api/webservice/guide/api/elevation
// 腾讯地图 API 作为 fallback。

const AMAP_ENDPOINT = 'https://restapi.amap.com/v3/assistant/coordinate/convert'
const AMAP_ELEVATION_ENDPOINT = 'https://restapi.amap.com/v3/geocode/geo'
const TENCENT_ELEVATION_ENDPOINT = 'https://apis.map.qq.com/ws/elevation/v1'

export class ElevationError extends Error {
  constructor(message, cause) {
    super(message)
    this.name = 'ElevationError'
    if (cause) this.cause = cause
  }
}

/**
 * 高德地图：根据经纬度获取海拔。
 * 高德无独立高程 API，使用逆地理编码的 altitude 字段。
 * 如需精确高程，可后续集成专业高程服务。
 *
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @param {string} apiKey - 高德 Web 服务 Key
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{altitude: number|null, source: string}>}
 */
async function getAmapElevation(lng, lat, apiKey, fetchImpl = globalThis.fetch) {
  // 高德逆地理编码 API（不含高程字段，使用 IP 定位获取粗略海拔）
  // 实际方案：高德 JS API 有海拔但 Web 服务限制较多
  // 这里使用逆地理编码获取地址描述，海拔通过搜索附近 POI 推断
  const url = `https://restapi.amap.com/v3/geocode/regeo?key=${apiKey}&location=${lng},${lat}&extensions=base&output=JSON`

  const res = await fetchImpl(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) {
    throw new ElevationError(`高德 API HTTP ${res.status}`)
  }

  const data = await res.json()
  if (data.status !== '1') {
    throw new ElevationError(`高德 API 错误: ${data.info || '未知错误'}`)
  }

  // 高德 regeo 不直接返回海拔，返回 null 让 AI 推断
  // 如后续申请了专业高程服务可替换此实现
  return {
    altitude: null,
    source: 'amap_regeo',
    address: data.regeocode?.formatted_address || null,
  }
}

/**
 * 腾讯地图：根据经纬度获取海拔。
 * https://lbs.qq.com/service/webService/webServiceGuide/webServiceElevation
 *
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @param {string} apiKey - 腾讯地图 WebService Key
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{altitude: number, source: string}>}
 */
async function getTencentElevation(lng, lat, apiKey, fetchImpl = globalThis.fetch) {
  const url = `${TENCENT_ELEVATION_ENDPOINT}?key=${apiKey}&locations=${lat},${lng}`

  const res = await fetchImpl(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) {
    throw new ElevationError(`腾讯地图 HTTP ${res.status}`)
  }

  const data = await res.json()
  if (data.status !== 0) {
    throw new ElevationError(`腾讯地图错误: ${data.message || '未知错误'}`)
  }

  const result = data.results?.[0]
  if (result?.elevation !== undefined && result.elevation !== -9999) {
    return {
      altitude: result.elevation,
      source: 'tencent_map',
    }
  }
  return { altitude: null, source: 'tencent_map' }
}

/**
 * 获取指定坐标的海拔（高德优先，腾讯 fallback）。
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @param {object} [opts]
 * @param {string} [opts.amapKey] - 高德 API Key（默认 AMAP_API_KEY 环境变量）
 * @param {string} [opts.tencentKey] - 腾讯 API Key（默认 TENCENT_MAP_KEY 环境变量）
 * @param {typeof fetch} [opts.fetch]
 * @returns {Promise<{altitude: number|null, source: string, address?: string}>}
 */
export async function getElevation(lng, lat, opts = {}) {
  const { amapKey = process.env.AMAP_API_KEY, tencentKey = process.env.TENCENT_MAP_KEY, fetch: fetchImpl = globalThis.fetch } = opts

  if (lng == null || lat == null) {
    return { altitude: null, source: 'none', error: '坐标缺失' }
  }

  const errors = []

  // 高德优先
  if (amapKey) {
    try {
      const result = await getAmapElevation(lng, lat, amapKey, fetchImpl)
      return { ...result, altitude: result.altitude }
    } catch (e) {
      errors.push(`高德: ${e.message}`)
    }
  }

  // 腾讯 fallback
  if (tencentKey) {
    try {
      const result = await getTencentElevation(lng, lat, tencentKey, fetchImpl)
      return result
    } catch (e) {
      errors.push(`腾讯: ${e.message}`)
    }
  }

  if (!amapKey && !tencentKey) {
    return { altitude: null, source: 'none', error: '未配置高程 API Key（AMAP_API_KEY 或 TENCENT_MAP_KEY）' }
  }

  return { altitude: null, source: 'none', error: errors.join('; ') }
}

/**
 * 批量获取海拔（并行，带限流）。
 * @param {Array<{lng: number, lat: number}>} points
 * @param {object} [opts]
 * @param {number} [opts.concurrency=3] - 并发数（避免触发 API 频率限制）
 * @returns {Promise<Array<{altitude: number|null, source: string}>>}
 */
export async function getElevationBatch(points, opts = {}) {
  const { concurrency = 3, ...rest } = opts
  const results = []

  for (let i = 0; i < points.length; i += concurrency) {
    const batch = points.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map((p) => getElevation(p.lng, p.lat, rest)),
    )
    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value)
      } else {
        results.push({ altitude: null, source: 'error', error: r.reason?.message || '未知错误' })
      }
    }
    // 批次间短暂等待
    if (i + concurrency < points.length) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  return results
}

