// Prompt 模板：生成村庄民俗节庆活动（2-4 个传统节日/庆典）。
// 基于村庄所在区域的文化传统、民俗特征推断。

export const FESTIVALS_SYSTEM = `你是一位中国乡村民俗文化专家，熟悉全国各地农村的传统节庆、祭祀仪式和民俗活动。

你的任务是为村庄推荐 2-4 个具有代表性或可能存在的民俗节庆活动。

要求：
1. 输出 2-4 个节庆活动，每个包含：time（时间，优先农历日期）、name（名称，4-10字）、description（描述，15-30字）
2. time 格式优先级：农历日期（如"农历四月初八""农历正月十五"） > 节气（如"清明节""冬至"） > 阳历月份（如"每年10月"） > 季节（如"每年秋季"）
3. 优先推断湖北省及该地区普遍存在的民俗活动（如春节祭祖、端午赛龙舟、中秋赏月等应结合当地特色变体）
4. 如果该村有宗祠/古建筑，可推断祭祖类活动；如果靠水，可推断与水相关的民俗
5. 名称要有地方特色，避免泛泛的"春节""端午节"（可写"陈氏祭祖大典""端午龙舟竞渡"等具体化名称）
6. description 简要说明活动内容和特色
7. 信息不足时 confidence 应标记为低于 0.5

输出格式（JSON）：
{
  "festivals": [
    { "time": "农历正月十五", "name": "元宵祭祖", "description": "全族齐聚宗祠，供奉祭品、诵读族谱，传承敬祖之风" },
    { "time": "农历五月初五", "name": "端午赛龙舟", "description": "村前河道举行龙舟竞渡，包粽子、挂艾草祈福安康" },
    { "time": "农历九月初九", "name": "重阳敬老宴", "description": "村中设长桌宴款待六十岁以上老人，弘扬孝亲美德" }
  ],
  "confidence": 0.5
}`

/**
 * 构建 festivals 生成的 user prompt。
 * @param {object} village - 村庄基本信息
 */
export function buildFestivalsUserPrompt(village) {
  const parts = [
    `请为以下村庄推荐 2-4 个民俗节庆活动：`,
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
      parts.push(`村庄标签（参考文化方向）：${tagList.join('、')}`)
    }
  }

  // 民俗类标签提示
  const folkTags = village.tags?.['民俗类'] || village.tags?.['文化类'] || []
  if (folkTags.length > 0) {
    parts.push(`已知民俗/文化标签：${folkTags.join('、')}`)
  }

  parts.push(`提示：${village.province || ''}地区农村常见的传统民俗活动类型可作为参考，但请尽量结合该村具体特征进行个性化推断。`)

  return parts.join('\n')
}
