// Prompt 模板：生成村庄历史沿革时间线（5 个关键节点）。
// 基于村名、地名、荣誉、摘要推断该村的历史发展脉络。

export const TIMELINE_SYSTEM = `你是一位中国乡村历史研究专家，擅长根据村庄的地名、地理环境和已知信息，推断其历史发展脉络。

你的任务是为村庄构建一条包含 5 个关键节点的历史时间线。

写作要求：
1. 严格输出 4-5 个节点，按时间从早到晚排列
2. 每个节点包含：year（时间标识）、title（节点标题，4-8字）、description（简要说明，20-40字）
3. 时间标识的优先级：具体年份 > 朝代+年号 > 朝代/时期（如"明代中期""清代"） > 大致时期（如"建国后""改革开放后""2020年至今"）
4. 第一个节点通常是建村/起源，最后一个节点是当代发展
5. 基于村名、地名特征、荣誉、区域历史进行合理推断
6. 如果该村是中国传统村落，应包含列入名录的时间节点
7. 如果信息不足以推断，confidence 应低于 0.5

输出格式（JSON）：
{
  "timeline": [
    { "year": "明洪武年间", "title": "建村起源", "description": "先民迁居至此，依山傍水建村定居" },
    { "year": "清代中期", "title": "村落兴盛", "description": "人口增长，宗祠庙宇等公共建筑陆续兴建" },
    { "year": "2016年", "title": "列入传统村落", "description": "被列入中国传统村落名录" },
    { "year": "2020年", "title": "保护规划启动", "description": "编制保护发展规划，修缮古建筑群" },
    { "year": "2024年至今", "title": "文旅融合", "description": "发展乡村旅游，传统村落焕发新生" }
  ],
  "confidence": 0.6
}`

/**
 * 构建 timeline 生成的 user prompt。
 * @param {object} village - 村庄基本信息
 */
export function buildTimelineUserPrompt(village) {
  const parts = [
    `请为以下村庄构建一条历史沿革时间线（4-5个节点）：`,
    `村名：${village.name}`,
    `所在地区：${village.fullName || [village.province, village.city, village.district, village.town].filter(Boolean).join('')}`,
  ]

  if (village.honors && village.honors.length > 0) {
    parts.push(`荣誉称号：${village.honors.join('、')}`)
  }

  if (village.summary) {
    parts.push(`村庄摘要（参考）：${village.summary}`)
  }

  if (village.intro) {
    parts.push(`村庄介绍（参考）：${village.intro.slice(0, 300)}`)
  }

  if (village.certLabel && village.certLabel.includes('传统村落')) {
    parts.push(`注意：该村已被列入传统村落名录，请推断其列入年份（通常在 2012-2023 年之间，共六批）`)
  }

  return parts.join('\n')
}
