// geoJSON 按需加载 + 缓存 + 容错。fetcher 可注入（默认走 fetch），便于单测。
// DataV 约定：<adcode>_full.json 含下级行政区；<adcode>.json 仅该区域自身边界。
// 末级区县通常没有 _full.json，故失败后回退到自身边界，保证地图仍能显示。
const LOCAL_FULL = { '100000': '/geo/100000_full.json' }
const DATAV = (adcode) => `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`
const DATAV_SELF = (adcode) => `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}.json`

async function defaultFetcher(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function createGeoLoader({ fetcher = defaultFetcher, localFull = LOCAL_FULL, urlFor = DATAV, urlForSelf = DATAV_SELF, onError } = {}) {
  const cache = new Map()
  return {
    urlFor,
    async load(adcode) {
      if (cache.has(adcode)) return cache.get(adcode)
      const localUrl = localFull[String(adcode)]
      if (localUrl) {
        try {
          const geo = await fetcher(localUrl)
          cache.set(adcode, geo)
          return geo
        } catch {
          // 本地首屏地图不可用时，继续使用原有在线数据源。
        }
      }
      try {
        const geo = await fetcher(urlFor(adcode))
        cache.set(adcode, geo)
        return geo
      } catch (e) {
        // _full 失败：回退到自身边界（末级区县没有下级数据）
        try {
          const geo = await fetcher(urlForSelf(adcode))
          cache.set(adcode, geo)
          return geo
        } catch (e2) {
          // 仍失败：不崩溃，记录失败 adcode，返回 null，调用方保留当前层级
          if (onError) onError(adcode, e2)
          else console.error(`[geoLoader] 加载 ${adcode} 失败:`, e2)
          return null
        }
      }
    },
  }
}
