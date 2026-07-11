// Prompt 模板：生成村庄基本事实（海拔、建村年代、面积、人口等）。
// 使用 DeepSeek 知识库推断，结合高德高程 API 获取精确海拔。

export const FACTS_SYSTEM = `你是一位中国乡村地理与历史数据专家。你的任务是根据村庄信息，结合你对中国乡村的知识，推断并输出该村的基本事实数据。

数据要求：
1. 海拔（altitude）：优先参考提供的 API 高程数据，单位为米
2. 建村年代（foundedYear）：具体年份或朝代纪年
3. 建村朝代（foundedDynasty）：如"明代""清代""宋代"等
4. 主要姓氏（mainSurnames）：该村1-3个主要姓氏
5. 户数/人口范围（households/population）：合理估算范围
6. 村域面积（areaKm2）：合理估算，单位平方公里

注意：
- 所有数据基于你的知识库推断，标注 confidence（0-1）
- 如果无法确定，confidence 应低于 0.5 或返回 null
- 海拔以实际 API 数据为准，API 数据优先于知识库推断

输出格式（JSON）：
{
  "altitude": {"value": 850, "source": "amap_api", "confidence": 0.95},
  "foundedYear": {"value": "1368", "display": "明洪武年间", "confidence": 0.7},
  "foundedDynasty": {"value": "明代", "confidence": 0.7},
  "mainSurnames": {"value": ["张", "李"], "confidence": 0.5},
  "households": {"value": 320, "confidence": 0.4},
  "population": {"value": 1200, "confidence": 0.4},
  "areaKm2": {"value": 4.5, "confidence": 0.3}
}`

/**
 * 构建 facts 生成的 user prompt。
 * @param {object} village - 村庄基本信息
 * @param {string} village.name
 * @param {string} village.fullName
 * @param {string} village.province
 * @param {string} village.city
 * @param {string} village.district
 * @param {string} village.town
 * @param {number[]} village.coord - [lng, lat]
 * @param {number|null} [altitudeFromApi] - 从高程 API 获取的海拔（米）
 * @param {string} [altitudeSource] - 高程数据来源 API 名称
 */
export function buildFactsUserPrompt(village, altitudeFromApi = null, altitudeSource = null) {
  const parts = [
    `请为以下村庄整理基本事实数据：`,
    `村名：${village.name}`,
    `所在地区：${village.fullName || [village.province, village.city, village.district, village.town].filter(Boolean).join('')}`,
  ]

  if (village.coord && village.coord.length === 2) {
    parts.push(`坐标：经度 ${village.coord[0]}，纬度 ${village.coord[1]}`)
  }

  if (altitudeFromApi !== null && altitudeFromApi !== undefined) {
    parts.push(`【高程 API 数据 - 请优先采用】海拔约 ${altitudeFromApi} 米（数据来源：${altitudeSource || '高程API'}）`)
  }

  if (village.honors && village.honors.length > 0) {
    parts.push(`荣誉称号：${village.honors.join('、')}`)
  }

  if (village.summary) {
    parts.push(`现有摘要（参考）：${village.summary}`)
  }

  if (village.intro) {
    parts.push(`现有介绍（参考）：${village.intro.slice(0, 200)}...`)
  }

  return parts.join('\n')
}

