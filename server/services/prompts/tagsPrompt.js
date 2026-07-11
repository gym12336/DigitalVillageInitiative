// Prompt 模板：生成村庄六大类标签体系。
// 标签分类：文化类 / 生态类 / 产业类 / 历史类 / 民俗类 / 美食类

/** 六大类标签候选池（调优时可扩展） */
export const TAG_POOL = {
  文化类: [
    '非遗文化', '书院文化', '宗祠文化', '古道文化', '红色文化', '耕读文化',
    '楹联文化', '诗画文化', '戏曲文化', '武术文化', '围棋文化', '禅修文化',
    '雕刻艺术', '壁画艺术', '剪纸艺术', '刺绣文化', '陶瓷文化',
  ],
  生态类: [
    '山水田园', '古树名木', '梯田景观', '湿地生态', '温泉资源', '峡谷地貌',
    '溶洞奇观', '丹霞地貌', '喀斯特', '高山草甸', '茶园风光', '竹海景观',
    '花海景观', '候鸟栖息地',
  ],
  产业类: [
    '特色农业', '传统手工业', '乡村旅游', '电商示范村', '合作社经济',
    '茶叶产业', '中药材种植', '林果经济', '水产养殖', '民宿经济',
    '研学基地', '康养产业', '文化创意',
  ],
  历史类: [
    '千年古村', '明清建筑', '古城遗址', '名人故里', '革命老区', '商帮故里',
    '古驿道', '古战场', '古墓群', '摩崖石刻', '古桥古塔', '历史街区',
    '名人墓葬',
  ],
  民俗类: [
    '传统节庆', '民间艺术', '戏曲传承', '祭祀仪式', '方言保护', '婚俗传统',
    '龙舟文化', '灯会庙会', '舞龙舞狮', '皮影戏', '傩戏', '民歌民谣',
    '社火表演',
  ],
  美食类: [
    '地方特产', '传统小吃', '农家菜系', '非遗美食', '地理标志产品',
    '特色酿造', '农家腊味', '时令山珍', '河鲜湖鲜', '豆腐文化',
    '糕点制作', '茶点文化',
  ],
}

export const TAGS_SYSTEM = `你是一位中国乡村文化分类专家。你的任务是根据村庄信息，从预定义的六大类标签体系中为该村选择最匹配的标签。

标签选择规则：
1. 每类至少选 1 个标签，最多选 5 个标签
2. 标签必须从候选池中选择，不可自创
3. 按匹配度从高到低排序
4. 每个标签附带匹配理由（10字以内）
5. 每类输出一个 categoryScore（0-1），表示该类别与该村的相关度

候选标签池：
- 文化类：${TAG_POOL.文化类.join('、')}
- 生态类：${TAG_POOL.生态类.join('、')}
- 产业类：${TAG_POOL.产业类.join('、')}
- 历史类：${TAG_POOL.历史类.join('、')}
- 民俗类：${TAG_POOL.民俗类.join('、')}
- 美食类：${TAG_POOL.美食类.join('、')}

输出格式（JSON）：
{
  "文化类": {
    "score": 0.85,
    "tags": [{"name": "宗祠文化", "reason": "村内保存完好的宗祠建筑群"}],
    "confidence": 0.8
  },
  "生态类": { "score": 0.6, "tags": [...], "confidence": 0.7 },
  "产业类": { "score": 0.5, "tags": [...], "confidence": 0.6 },
  "历史类": { "score": 0.9, "tags": [...], "confidence": 0.85 },
  "民俗类": { "score": 0.4, "tags": [...], "confidence": 0.5 },
  "美食类": { "score": 0.3, "tags": [...], "confidence": 0.4 },
  "overallConfidence": 0.7
}`

/**
 * 构建 tags 生成的 user prompt。
 * @param {object} village
 */
export function buildTagsUserPrompt(village) {
  const parts = [
    `请为以下村庄选择合适的分类标签：`,
    `村名：${village.name}`,
    `所在地区：${village.fullName || [village.province, village.city, village.district, village.town].filter(Boolean).join('')}`,
  ]

  if (village.intro) {
    parts.push(`村庄介绍（前300字）：${village.intro.slice(0, 300)}`)
  } else if (village.summary) {
    parts.push(`村庄摘要：${village.summary}`)
  }

  if (village.honors && village.honors.length > 0) {
    parts.push(`荣誉称号：${village.honors.join('、')}`)
  }

  if (village.specialties && village.specialties.length > 0) {
    parts.push(`特产：${village.specialties.join('、')}`)
  }

  if (village.festivals && village.festivals.length > 0) {
    parts.push(`节庆活动：${village.festivals.join('、')}`)
  }

  return parts.join('\n')
}

