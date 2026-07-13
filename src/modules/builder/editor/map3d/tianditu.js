// src/modules/builder/editor/map3d/tianditu.js
import { getTiandituKey } from './mapConfig.js'

// 34 省/直辖市/自治区/特别行政区 adminCode 映射
export const PROVINCE_MAP = [
  { name: '不限', adminCode: '' },
  { name: '北京市', adminCode: '110000' },
  { name: '天津市', adminCode: '120000' },
  { name: '河北省', adminCode: '130000' },
  { name: '山西省', adminCode: '140000' },
  { name: '内蒙古自治区', adminCode: '150000' },
  { name: '辽宁省', adminCode: '210000' },
  { name: '吉林省', adminCode: '220000' },
  { name: '黑龙江省', adminCode: '230000' },
  { name: '上海市', adminCode: '310000' },
  { name: '江苏省', adminCode: '320000' },
  { name: '浙江省', adminCode: '330000' },
  { name: '安徽省', adminCode: '340000' },
  { name: '福建省', adminCode: '350000' },
  { name: '江西省', adminCode: '360000' },
  { name: '山东省', adminCode: '370000' },
  { name: '河南省', adminCode: '410000' },
  { name: '湖北省', adminCode: '420000' },
  { name: '湖南省', adminCode: '430000' },
  { name: '广东省', adminCode: '440000' },
  { name: '广西壮族自治区', adminCode: '450000' },
  { name: '海南省', adminCode: '460000' },
  { name: '重庆市', adminCode: '500000' },
  { name: '四川省', adminCode: '510000' },
  { name: '贵州省', adminCode: '520000' },
  { name: '云南省', adminCode: '530000' },
  { name: '西藏自治区', adminCode: '540000' },
  { name: '陕西省', adminCode: '610000' },
  { name: '甘肃省', adminCode: '620000' },
  { name: '青海省', adminCode: '630000' },
  { name: '宁夏回族自治区', adminCode: '640000' },
  { name: '新疆维吾尔自治区', adminCode: '650000' },
  { name: '香港特别行政区', adminCode: '810000' },
  { name: '澳门特别行政区', adminCode: '820000' },
  { name: '台湾省', adminCode: '710000' },
]

const SEARCH_TIMEOUT = 5000
const TIANDITU_SEARCH_URL = 'https://api.tianditu.gov.cn/v2/search'

/**
 * 搜索村庄
 * @param {Object} opts
 * @param {string} opts.name - 村名
 * @param {string} [opts.provinceCode] - 省份 adminCode，空字符串表示全国搜索
 * @param {string} [opts.cityKeyword] - 市/区县关键字（前端二次过滤）
 * @returns {Promise<Array<{ name: string, address: string, lng: number, lat: number }>>}
 */
export async function searchVillages({ name, provinceCode = '', cityKeyword = '' }) {
  const tk = getTiandituKey()
  if (!tk) {
    throw new Error('天地图密钥未配置')
  }

  const params = new URLSearchParams({
    keyWord: name,
    queryType: '1',    // 1 = 普通搜索（行政区划+地名）
    tk,
  })
  if (provinceCode) {
    params.set('specify', provinceCode)
  }

  const url = `${TIANDITU_SEARCH_URL}?${params.toString()}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT)

  let data
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`天地图搜索接口返回 ${res.status}`)
    }
    data = await res.json()
  } finally {
    clearTimeout(timer)
  }

  if (!data || data.status !== '0' || !Array.isArray(data.pois)) {
    return []
  }

  let results = data.pois
    .filter(poi => poi.lon && poi.lat)
    .map(poi => ({
      name: poi.name || '',
      address: poi.address || '',
      lng: parseFloat(poi.lon),
      lat: parseFloat(poi.lat),
    }))

  // 前端按市/区县关键字二次过滤
  if (cityKeyword && cityKeyword.trim()) {
    const kw = cityKeyword.trim()
    results = results.filter(r => r.address.includes(kw))
  }

  return results
}

/**
 * 拼装天地图静态图 URL（用于编辑态缩略图）
 */
export function buildStaticImageUrl(lng, lat, zoom = 14, w = 640, h = 420) {
  const tk = getTiandituKey()
  // 天地图静态图：img_w 影像 + cia_w 注记叠加
  const base = 'https://api.tianditu.gov.cn/static'
  const center = `${lng},${lat}`
  return `${base}?center=${center}&zoom=${zoom}&size=${w},${h}&layers=img_w,cia_w&tk=${tk}`
}

/**
 * 规范化行政区层级字符串
 * 输入天地图 address 字段原始值，输出 "省 · 市 · 区/县 · 乡镇"
 */
export function normalizeRegion(address) {
  if (!address) return ''
  // 天地图返回的 address 形如 "云南省普洱市澜沧拉祜族自治县竹塘乡"
  // 简单的正则提取省市区县乡镇
  const parts = []
  const match = address.match(
    /^(.+?(?:省|自治区|特别行政区|市))?(.+?(?:市|自治州|地区|盟))?(.+?(?:县|区|自治县|县级市|旗))?(.+?(?:乡|镇|街道))?$/
  )
  if (match) {
    if (match[1]) parts.push(match[1])
    if (match[2]) parts.push(match[2])
    if (match[3]) parts.push(match[3])
    if (match[4]) parts.push(match[4])
  }
  // fallback: 直接返回原始 address
  return parts.length > 0 ? parts.join(' · ') : address
}

