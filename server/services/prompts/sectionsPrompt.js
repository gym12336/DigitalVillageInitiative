// Prompt 模板：生成村庄四大板块深度介绍（地理风貌 / 历史人文 / 特色产业 / 保护活化）。
// 对标陈家铺村的 sections 格式，为村庄详情页"深入了解"板块提供内容。

export const SECTIONS_SYSTEM = `你是一位中国乡村文化研究专家与地方志撰写人，擅长以散文式笔触撰写村庄的深度介绍。

你的任务是为村庄撰写四个板块的深度介绍。每个板块独立成文，内容互不重复。

写作要求：
1. 四个板块：地理风貌、历史人文、特色产业、保护活化
2. 每段严格控制在 100-180 字之间
3. 语言风格：散文式叙述，具体细节优先于空泛形容词
4. 不同板块之间信息不重复
5. 保护活化板块可为空字符串（如果该村尚未经历明显的保护/活化进程）

板块内容指南：
- **地理风貌**：地形地貌、山水格局、气候特征、自然资源、村落空间形态
- **历史人文**：建村渊源、姓氏宗族、历史事件、建筑遗存、文化传统
- **特色产业**：传统农业/手工业、特色经济、乡村旅游、电商新业态等
- **保护活化**：传统村落保护措施、古建修缮、文旅开发、青年返乡、高校合作等

输出格式（JSON）：
{
  "sections": {
    "地理风貌": "村庄坐落于...（100-180字）...四季各有其独特的乡居意境。",
    "历史人文": "该村始建于...（100-180字）...记录着数百年的宗族记忆。",
    "特色产业": "...是村里最鲜明的名片...（100-180字）...实现了传统产业的现代转型。",
    "保护活化": "近年来...（100-180字，若无明显保护活化进程则留空字符串）"
  },
  "confidence": 0.6
}`

/**
 * 构建 sections 生成的 user prompt。
 * @param {object} village - 村庄基本信息
 */
export function buildSectionsUserPrompt(village) {
  const parts = [
    `请为以下村庄撰写四个板块的深度介绍：`,
    `村名：${village.name}`,
    `所在地区：${village.fullName || [village.province, village.city, village.district, village.town].filter(Boolean).join('')}`,
  ]

  if (village.summary) {
    parts.push(`村庄摘要（关键参考）：${village.summary}`)
  }

  if (village.intro) {
    parts.push(`村庄介绍（关键参考）：${village.intro}`)
  }

  if (village.honors && village.honors.length > 0) {
    parts.push(`荣誉称号：${village.honors.join('、')}`)
  }

  if (village.certLabel) {
    parts.push(`认证信息：${village.certLabel}`)
  }

  if (village.tags && typeof village.tags === 'object') {
    const tagParts = []
    for (const [cat, tags] of Object.entries(village.tags)) {
      if (Array.isArray(tags) && tags.length > 0) {
        tagParts.push(`${cat}: ${tags.join('、')}`)
      }
    }
    if (tagParts.length > 0) {
      parts.push(`村庄标签体系：\n${tagParts.join('\n')}`)
    }
  }

  return parts.join('\n')
}
