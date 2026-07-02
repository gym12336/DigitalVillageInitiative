// geoJSON 按需加载 + 缓存 + 容错。fetcher 可注入（默认走 fetch），便于单测。
const DATAV = (adcode) => `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`

async function defaultFetcher(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function createGeoLoader({ fetcher = defaultFetcher, urlFor = DATAV, onError } = {}) {
  const cache = new Map()
  return {
    urlFor,
    async load(adcode) {
      if (cache.has(adcode)) return cache.get(adcode)
      try {
        const geo = await fetcher(urlFor(adcode))
        cache.set(adcode, geo)
        return geo
      } catch (e) {
        // 不崩溃：记录失败 adcode，返回 null，调用方保留当前层级
        if (onError) onError(adcode, e)
        else console.error(`[geoLoader] 加载 ${adcode} 失败:`, e)
        return null
      }
    },
  }
}
