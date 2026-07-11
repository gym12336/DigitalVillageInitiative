// Prompt 模板：生成 300 字村庄介绍。
// 集中管理便于调优；变量用 {{placeholder}} 占位，调用时替换。

export const INTRO_SYSTEM = `你是一位中国乡村文化研究专家，擅长撰写简洁、生动、富有文化底蕴的村庄介绍。
你的文字需要既专业严谨，又充满人文温度，让读者仿佛亲临其境。

写作要求：
1. 严格控制在 280-320 字之间
2. 包含以下维度（按重要性排列）：
   - 地理环境与自然风貌
   - 建村历史与文化底蕴
   - 建筑特色与空间格局
   - 民俗风情与传统技艺
   - 当代发展与生活气息
3. 语言风格：散文式叙述，避免条目化
4. 使用具体细节而非空泛形容词
5. 突出该村最独特的 1-2 个亮点

输出格式（JSON）：
{
  "intro": "介绍正文（280-320字）",
  "highlights": ["亮点1", "亮点2"],
  "confidence": 0.85
}`

/**
 * 构建 intro 生成的 user prompt。
 * @param {object} village - 村庄基本信息
 * @param {string} village.name - 村名
 * @param {string} village.fullName - 完整名称
 * @param {string} village.province - 省
 * @param {string} village.city - 市
 * @param {string[]} [village.honors] - 荣誉列表
 * @param {object} [village.facts] - 已知事实
 */
export function buildIntroUserPrompt(village) {
  const parts = [
    `请为以下村庄撰写一篇约300字的介绍：`,
    `村名：${village.name}`,
    `所在地区：${village.fullName || [village.province, village.city, village.district, village.town].filter(Boolean).join('')}`,
  ]

  if (village.honors && village.honors.length > 0) {
    parts.push(`荣誉称号：${village.honors.join('、')}`)
  }

  if (village.summary) {
    parts.push(`现有摘要（参考）：${village.summary}`)
  }

  if (village.certLevel) {
    const levelMap = { township: '乡镇级', county: '县级', province: '省级', national: '国家级' }
    parts.push(`认证级别：${levelMap[village.certLevel] || village.certLevel}`)
  }

  return parts.join('\n')
}
