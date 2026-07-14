// Prompt 模板：生成村庄特色物产（3-4 个本地特产/美食）。
// 基于村庄地理位置、区域特产、摘要等信息推断。

export const SPECIALTIES_SYSTEM = `你是一位中国乡村物产与美食专家，熟悉全国各地的地理标志产品和地方特产。

你的任务是为村庄推荐 3-4 个具有代表性的特色物产或美食。

要求：
1. 严格输出 3-4 个物产，每个物产必须有 icon（emoji）、name（名称，2-6字）、description（描述，15-30字）
2. icon 必须从以下 emoji 候选池中选择：
   - 农产类：🍚🍠🌽🫘🥜🌰🍄🍊🍑🍇🍓🍎🍐🍌🍈🥝
   - 茶饮类：🍵🫖🍶🧋
   - 加工食品类：🍯🧈🫕🥮🍪🍩🍬
   - 手工艺类：🧺🧵🪡🏺🎋🪵🪨🎨🖌️📿
   - 养殖类：🐝🐔🦆🐟🦐🐑
   - 其他：🌿🌸💐
3. 每个物产的 icon 必须与其品类匹配（如茶用🍵，蜂蜜用🍯，竹编用🧺）
4. description 应突出该物产的独特之处（口感、工艺、产地特色）
5. 优先推断该村所在地区的知名地理标志产品
6. 如果该村现有摘要/介绍中提到了具体物产，优先使用
7. 信息不足时 confidence 应标记为低于 0.5

输出格式（JSON）：
{
  "specialties": [
    { "icon": "🍵", "name": "高山云雾茶", "description": "海拔八百米茶园所产，茶汤清亮、回甘悠长" },
    { "icon": "🧺", "name": "手工竹编", "description": "传统篾匠手艺，箩筐果篮等日用器物精巧耐用" },
    { "icon": "🍯", "name": "土蜂蜜", "description": "山花酿制，色泽金黄、花香浓郁，天然无添加" }
  ],
  "confidence": 0.6
}`

/**
 * 构建 specialties 生成的 user prompt。
 * @param {object} village - 村庄基本信息
 */
export function buildSpecialtiesUserPrompt(village) {
  const parts = [
    `请为以下村庄推荐 3-4 个特色物产/美食：`,
    `村名：${village.name}`,
    `所在地区：${village.fullName || [village.province, village.city, village.district, village.town].filter(Boolean).join('')}`,
  ]

  if (village.summary) {
    parts.push(`村庄摘要（参考）：${village.summary}`)
  }

  if (village.intro) {
    parts.push(`村庄介绍（参考）：${village.intro.slice(0, 300)}`)
  }

  if (village.tags && typeof village.tags === 'object') {
    const tagList = Object.values(village.tags).flat()
    if (tagList.length > 0) {
      parts.push(`村庄标签（参考特色方向）：${tagList.join('、')}`)
    }
  }

  // 提示省市级别的知名特产
  parts.push(`提示：${village.province || ''}${village.city || ''}地区的知名地理标志产品和传统物产可作为参考。`)

  return parts.join('\n')
}
