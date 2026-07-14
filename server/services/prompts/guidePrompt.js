// Prompt 模板：生成村庄导览点位（5 个值得探访的地点）。
// 基于村庄建筑特色、文化标签、自然地理等信息推断。

export const GUIDE_SYSTEM = `你是一位中国乡村旅游规划专家，擅长为游客设计村内值得探访的点位。

你的任务是为村庄推荐 5 个村内导览点位。

要求：
1. 严格输出 5 个点位，每个包含：name（名称，2-8字）、note（看点说明，15-30字）
2. name 简洁有辨识度，避免泛泛的"村口""广场"
3. note 一句话说清这个点位有什么可看的，突出独特价值
4. 点位类型应多样化，覆盖以下类别：
   - 自然类：古树、山泉、观景台、溪流、峡谷等
   - 建筑类：宗祠、古桥、古井、古民居、庙宇等
   - 文化类：书院、戏台、牌坊、碑刻、非遗工坊等
   - 生活类：古街、集市、老茶馆、农家乐聚集区等
   - 产业类：茶园、果园、养殖基地、手工艺作坊等
5. 基于村庄的已知标签、荣誉、摘要等信息推断哪些点位可能存在
6. 如果该村是传统村落，优先推荐古建筑类点位
7. 信息不足时 confidence 应标记为低于 0.5

输出格式（JSON）：
{
  "guide": [
    { "name": "村口古树", "note": "数百年树龄的古樟，村民世代守护的风水树" },
    { "name": "李氏宗祠", "note": "清代木构宗祠，雕梁画栋保存完好" },
    { "name": "古驿道", "note": "青石板古道，昔日商旅往来的历史见证" },
    { "name": "观景平台", "note": "俯瞰全村风貌与周边梯田的最佳位置" },
    { "name": "老茶馆", "note": "百年老屋改造，品当地土茶听老人讲村史" }
  ],
  "confidence": 0.6
}`

/**
 * 构建 guide 生成的 user prompt。
 * @param {object} village - 村庄基本信息
 */
export function buildGuideUserPrompt(village) {
  const parts = [
    `请为以下村庄推荐 5 个导览点位：`,
    `村名：${village.name}`,
    `所在地区：${village.fullName || [village.province, village.city, village.district, village.town].filter(Boolean).join('')}`,
  ]

  if (village.summary) {
    parts.push(`村庄摘要（参考）：${village.summary}`)
  }

  if (village.intro) {
    parts.push(`村庄介绍（参考）：${village.intro.slice(0, 300)}`)
  }

  if (village.honors && village.honors.length > 0) {
    parts.push(`荣誉称号：${village.honors.join('、')}`)
  }

  if (village.tags && typeof village.tags === 'object') {
    const tagList = Object.values(village.tags).flat()
    if (tagList.length > 0) {
      parts.push(`村庄标签（参考特色）：${tagList.join('、')}`)
    }
  }

  const hasArch = village.tags?.['文化类']?.some(t => t.includes('古建筑') || t.includes('宗祠')) || false
  if (hasArch || (village.honors || []).some(h => h.includes('传统村落'))) {
    parts.push(`提示：该村有古建筑/传统村落特征，请重点推荐古建类导览点位。`)
  }

  return parts.join('\n')
}
