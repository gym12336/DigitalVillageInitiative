// 方案生成（前端）：主路径调后端 /api/plan/generate（LLM + 后端规则兜底），
// 网络断/后端挂时用本地精简模板兜底，保证永远能拿到结构合法的 plan。
//
// 契约保持：export function generatePlan(idea, refs) → plan（但改为 async）。
// StagePlan.vue 调用时 await 即可，其他形状不变。

import { extractKeywords } from './retrieval.js'
import { apiGeneratePlan } from './api.js'

// —— 本地兜底所需的选题库（与后端 planTemplate 保持一致，但精简；仅在后端不可达时用） ——
const TOPICS = [
  {
    key: '文化',
    match: ['竹编', '非遗', '文化', '手艺', '技艺', '传承', '木雕', '古建', '宗祠'],
    topic: '非遗文化挖掘与活化',
    expected: '一套口述史记录 + 文化传播物料 + 非遗活化建议',
    metrics: [
      { name: '受访手艺人数', unit: '人' },
      { name: '整理口述史', unit: '篇' },
      { name: '拍摄影像素材', unit: '条' },
    ],
    methods: ['半结构化访谈', '影像记录'],
    risks: ['手艺人档期难约，提前预约留缓冲'],
    phaseTasks: {
      plan: [
        { text: '联系村委确认手艺人名单', output: '受访名单' },
        { text: '准备访谈提纲与设备', output: '提纲与设备清单' },
      ],
      track: [
        { text: '完成 3 位以上手艺人深度访谈', output: '访谈录音' },
        { text: '拍摄工艺流程影像', output: '影像素材' },
      ],
      result: [
        { text: '整理口述史稿', output: '口述史成稿' },
        { text: '产出传播物料与活化建议', output: '物料 + 建议' },
      ],
    },
  },
  {
    key: '产业',
    match: ['卖', '销售', '电商', '产业', '农产品', '品牌', '增收', '直播', '带货', '好物'],
    topic: '特色产业帮扶与品牌推广',
    expected: '一套品牌视觉方案 + 电商上架建议 + 销量提升报告',
    metrics: [
      { name: '月销售额', unit: '元' },
      { name: '合作农户数', unit: '户' },
      { name: '上架商品数', unit: '件' },
    ],
    methods: ['农户访谈', '产品拍摄'],
    risks: ['农产品季节性强，卡时间窗'],
    phaseTasks: {
      plan: [
        { text: '梳理主打农产品与现价', output: '产品清单' },
        { text: '对标同类电商店铺', output: '对标简表' },
      ],
      track: [
        { text: '产品拍照并撰写卖点文案', output: '产品图 + 文案' },
        { text: '试直播或短视频带货', output: '带货记录' },
      ],
      result: [
        { text: '整理品牌视觉方案', output: '品牌视觉包' },
        { text: '撰写销量提升报告', output: '销量报告' },
      ],
    },
  },
  {
    key: '教育',
    match: ['支教', '教育', '孩子', '学生', '课程', '学校', '留守'],
    topic: '教育支援与课程共建',
    expected: '一套支教课程包 + 学生成长记录 + 长期结对建议',
    metrics: [
      { name: '开设课程数', unit: '门' },
      { name: '受益学生数', unit: '人' },
      { name: '志愿课时', unit: '课时' },
    ],
    methods: ['课堂观察', '教师访谈'],
    risks: ['天气/校车影响到课率，备线上补课'],
    phaseTasks: {
      plan: [
        { text: '与校方沟通授课时段', output: '排班表' },
        { text: '按年级分层设计课程大纲', output: '课程大纲' },
      ],
      track: [
        { text: '按排班完成课堂教学', output: '签到表' },
        { text: '收集学生成长小记', output: '成长小记' },
      ],
      result: [
        { text: '整理完整课程包', output: '课程包资料' },
        { text: '撰写长期结对建议', output: '结对建议' },
      ],
    },
  },
  {
    key: '生态',
    match: ['生态', '旅游', '环保', '森林', '保护', '规划', '民宿'],
    topic: '生态旅游与可持续规划',
    expected: '一套生态旅游规划建议 + 分区导览方案 + 环保行动记录',
    metrics: [
      { name: '调研点位数', unit: '处' },
      { name: '访谈村民数', unit: '人' },
      { name: '规划建议条数', unit: '条' },
    ],
    methods: ['实地踏勘', '村民访谈'],
    risks: ['雨季道路受阻，备线上访谈'],
    phaseTasks: {
      plan: [
        { text: '规划踏勘路线与拟调研点位', output: '踏勘路线图' },
        { text: '准备访谈提纲与向导', output: '提纲 + 向导表' },
      ],
      track: [
        { text: '完成各点位踏勘与影像记录', output: '踏勘影像' },
        { text: '访谈村民与游客', output: '访谈素材' },
      ],
      result: [
        { text: '出具生态旅游规划建议', output: '规划建议书' },
        { text: '产出分区导览方案', output: '导览方案' },
      ],
    },
  },
]

const DEFAULT_TOPIC = {
  topic: '乡村综合调研',
  expected: '一份实践调研报告 + 影像记录 + 后续行动建议',
  metrics: [
    { name: '走访村民数', unit: '人' },
    { name: '整理素材数', unit: '条' },
    { name: '产出报告', unit: '份' },
  ],
  methods: ['半结构化访谈', '问卷调查'],
  risks: ['首次进村不熟悉情况，安排缓冲日机动'],
  phaseTasks: {
    plan: [
      { text: '联系村委了解基本情况', output: '走访名单' },
      { text: '准备问卷与访谈提纲', output: '调研工具' },
    ],
    track: [
      { text: '完成入户走访与关键访谈', output: '访谈笔记' },
      { text: '记录村庄影像素材', output: '影像资料' },
    ],
    result: [
      { text: '撰写调研报告初稿', output: '报告初稿' },
      { text: '提出后续行动建议', output: '行动建议' },
    ],
  },
}

const PHASE_TITLES = { plan: '实践前准备', track: '实践中执行', result: '实践后总结' }

// 从检索命中的村庄卡片里挑目标村（优先 village 来源），否则回落到 idea 里的村名。
function pickTargetVillage(idea, refs = []) {
  const villageCard = (refs || []).find((r) => r && r.source === 'village')
  if (villageCard) return villageCard.title
  const text = String(idea || '')
  const re = /(?:去|到|在|帮|为|给|助)?([一-龥]{2,4}村)/g
  let m
  while ((m = re.exec(text))) {
    const name = m[1]
    if (/(乡村|农村|山村)$/.test(name)) continue
    return name
  }
  return ''
}

// 按 idea 关键词与命中卡片类型选主选题。
function pickTopic(keywords, refs = []) {
  const hay = keywords.join(' ') + ' ' + (refs || []).map((r) => `${r?.title || ''} ${r?.sub || ''}`).join(' ')
  for (const t of TOPICS) {
    if (t.match.some((m) => hay.includes(m))) return t
  }
  return DEFAULT_TOPIC
}

/**
 * 前端本地兜底：接口彻底失败（网络断/后端挂）时用。
 * 结构与后端 planTemplate 输出一致，`source:'template'`。
 */
export function localTemplatePlan(idea, refs = []) {
  const keywords = extractKeywords(idea)
  const topic = pickTopic(keywords, refs)
  const targetVillage = pickTargetVillage(idea, refs)
  const goal = targetVillage
    ? `围绕「${targetVillage}」开展${topic.topic}，${topic.expected.split(' + ')[0]}。`
    : `围绕${topic.topic}开展实践，形成可落地的成果。`

  const demand = (refs || []).find((r) => r?.source === 'demand')
  const village = (refs || []).find((r) => r?.source === 'village')
  const bg = []
  if (demand?.title) bg.push(`乡村之声：${demand.title}`)
  if (village?.sub) bg.push(village.sub)
  if (!bg.length && idea) bg.push(String(idea).trim())

  const phases = ['plan', 'track', 'result'].map((stage) => ({
    stage,
    title: PHASE_TITLES[stage],
    tasks: (topic.phaseTasks?.[stage] || []).map((t) => ({
      text: t.text,
      output: t.output || '',
      done: false,
    })),
  }))

  return {
    goal,
    topic: topic.topic,
    targetVillage,
    expected: topic.expected,
    metrics: topic.metrics.map((m) => ({ ...m })),
    background: bg.join('；'),
    methods: [...topic.methods],
    risks: [...topic.risks],
    phases,
    source: 'template',
    generatedAt: new Date().toISOString(),
  }
}

/**
 * 生成方案初稿。async：主路径调后端；失败兜到本地模板。
 * opts 可传：{ village, topic, startDate, endDate }（透传给后端，做更贴合的方案）。
 */
export async function generatePlan(idea, refs = [], opts = {}) {
  try {
    const plan = await apiGeneratePlan({
      idea,
      refs,
      village: opts.village || '',
      topic: opts.topic || '',
      startDate: opts.startDate || '',
      endDate: opts.endDate || '',
    })
    if (plan && Array.isArray(plan.phases)) return plan
    // 后端返回残缺（罕见）：走本地兜底。
    return localTemplatePlan(idea, refs)
  } catch {
    // 未登录/网络断/后端挂：都吞成本地模板；上层不阻塞。
    return localTemplatePlan(idea, refs)
  }
}
