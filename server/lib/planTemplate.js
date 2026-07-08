// 规则版方案兜底：无 key/超时/LLM 坏输出时输出可用的分阶段任务方案。
// 结构与设计文档 §1 一致：goal/topic/targetVillage/expected/metrics 五旧字段 +
// background/methods/risks/phases/source/generatedAt 六新字段。纯函数、可单测。

// 选题库：命中关键词 → topic/expected/metrics + 三阶段任务模板 + 建议方法 + 风险。
// 顺序即优先级，第一个命中的作为主选题。
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
    methods: ['半结构化访谈', '影像记录', '口述史整理', '参与式观察'],
    risks: ['手艺人档期难约，需提前预约并留缓冲', '方言沟通障碍，备录音后期转写'],
    phaseTasks: {
      plan: [
        { text: '联系村委确认手艺人名单与拜访时间', output: '受访名单与档期表' },
        { text: '准备访谈提纲与口述史模板', output: '访谈提纲文档' },
        { text: '检查录音/摄影设备与存储卡', output: '设备清单' },
      ],
      track: [
        { text: '完成 3 位以上手艺人深度访谈并录音', output: '访谈录音' },
        { text: '拍摄工艺流程影像素材', output: '工艺影像' },
        { text: '现场速记关键工序与故事', output: '田野笔记' },
      ],
      result: [
        { text: '整理口述史稿并交叉核对', output: '口述史成稿' },
        { text: '产出文化传播物料（图文/短视频脚本）', output: '传播物料包' },
        { text: '撰写非遗活化建议提交村委', output: '活化建议报告' },
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
    methods: ['农户访谈', '产品拍摄', '电商平台对标分析', '品牌焦点访谈'],
    risks: ['农产品季节性强，采购/拍摄要卡时间窗', '直播/电商需实名，提前备好资质'],
    phaseTasks: {
      plan: [
        { text: '梳理目标村主打农产品与现价', output: '产品与定价清单' },
        { text: '对标 3 家同类电商店铺的定价与话术', output: '对标分析简表' },
        { text: '预约合作农户与走访路线', output: '走访计划' },
      ],
      track: [
        { text: '产品拍照并撰写卖点文案', output: '产品图与文案' },
        { text: '完成一次试直播或短视频带货', output: '带货记录' },
        { text: '记录合作农户数与试销订单', output: '销售流水' },
      ],
      result: [
        { text: '整理品牌视觉方案（logo/包装/主色）', output: '品牌视觉包' },
        { text: '产出电商上架建议清单', output: '上架建议' },
        { text: '撰写销量提升报告并回访农户反馈', output: '销量报告' },
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
    methods: ['课堂观察', '教师访谈', '学生问卷', '课程共同备课'],
    risks: ['学生年龄差异大，课程要分层备课', '天气/校车问题可能影响到课率，备线上补课方案'],
    phaseTasks: {
      plan: [
        { text: '与校方沟通授课时段与教室安排', output: '课程排班表' },
        { text: '按年级分层设计课程包大纲', output: '课程大纲' },
        { text: '筹备教具与打印材料', output: '教具清单' },
      ],
      track: [
        { text: '按排班完成课堂教学并签到', output: '课堂签到表' },
        { text: '每日课后收集一段学生成长小记', output: '成长小记' },
        { text: '与班主任每周复盘一次教学效果', output: '复盘纪要' },
      ],
      result: [
        { text: '整理完整课程包（教案/PPT/学习单）', output: '课程包资料' },
        { text: '撰写学生成长记录合集', output: '成长记录册' },
        { text: '产出长期结对与后续支教建议', output: '结对建议' },
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
    methods: ['实地踏勘', '村民访谈', '点位测绘', '游客问卷'],
    risks: ['雨季道路受阻，备线上访谈与延后踏勘', '生态点位偏远，提前联系向导'],
    phaseTasks: {
      plan: [
        { text: '规划踏勘路线与拟调研点位', output: '踏勘路线图' },
        { text: '准备村民与游客访谈提纲', output: '访谈提纲' },
        { text: '联系向导与借用测绘工具', output: '向导与装备表' },
      ],
      track: [
        { text: '完成各点位踏勘与影像记录', output: '踏勘影像' },
        { text: '访谈村民与游客并录音', output: '访谈素材' },
        { text: '在图上标注推荐分区', output: '分区草图' },
      ],
      result: [
        { text: '出具生态旅游规划建议', output: '规划建议书' },
        { text: '产出分区导览方案（图+文）', output: '导览方案' },
        { text: '整理环保行动清单与后续跟进', output: '环保行动记录' },
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
  methods: ['半结构化访谈', '问卷调查', '影像记录'],
  risks: ['首次进村不熟悉情况，安排缓冲日机动'],
  phaseTasks: {
    plan: [
      { text: '联系村委了解基本情况与拟走访对象', output: '走访名单' },
      { text: '准备问卷与访谈提纲', output: '调研工具' },
      { text: '规划行程与住宿', output: '行程表' },
    ],
    track: [
      { text: '完成入户走访与关键访谈', output: '访谈笔记' },
      { text: '记录村庄影像素材', output: '影像资料' },
      { text: '每日整理当日发现', output: '日志' },
    ],
    result: [
      { text: '撰写调研报告初稿', output: '报告初稿' },
      { text: '整理影像与访谈素材归档', output: '素材档案' },
      { text: '提出后续行动建议', output: '行动建议' },
    ],
  },
}

// —— 内部辅助 ——

// 从检索命中的村庄卡片里挑目标村（优先 village 来源），否则回落到 idea 里的村名。
// 与前端 planGen.js 保持一致，防止「乡村/农村/山村」这类泛称混入。
function pickTargetVillage(idea, refs = []) {
  const villageCard = (refs || []).find((r) => r && r.source === 'village')
  if (villageCard && villageCard.title) return villageCard.title
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

// 按 idea / topic 关键词与命中卡片文本挑主选题。
function pickTopic(idea, refs, topicHint) {
  const hay =
    String(idea || '') + ' ' +
    String(topicHint || '') + ' ' +
    (refs || []).map((r) => `${r?.title || ''} ${r?.sub || ''}`).join(' ')
  for (const t of TOPICS) {
    if (t.match.some((m) => hay.includes(m))) return t
  }
  return DEFAULT_TOPIC
}

// 从采纳的「乡village/demand」卡片里凑一句 background；没有则回落到 idea 概要。
function buildBackground(idea, refs, startDate, endDate) {
  const demand = (refs || []).find((r) => r?.source === 'demand')
  const village = (refs || []).find((r) => r?.source === 'village')
  const pieces = []
  if (demand?.title) pieces.push(`乡村之声：${demand.title}`)
  if (village?.sub) pieces.push(village.sub)
  if (!pieces.length && idea) pieces.push(String(idea).trim())
  const window = formatDateWindow(startDate, endDate)
  if (window) pieces.push(`实践时段：${window}`)
  return pieces.join('；')
}

function formatDateWindow(start, end) {
  const s = String(start || '').trim()
  const e = String(end || '').trim()
  if (s && e) return `${s} 至 ${e}`
  if (s) return `自 ${s} 起`
  if (e) return `截至 ${e}`
  return ''
}

/**
 * 生成规则版分阶段方案。输入 { idea, refs, village, topic, startDate, endDate }。
 * 返回完整新 plan 结构，`source: 'template'`，`generatedAt` 由调用方传入 now 决定。
 */
export function generateTemplatePlan(input = {}) {
  const {
    idea = '',
    refs = [],
    village = '',
    topic: topicHint = '',
    startDate = '',
    endDate = '',
    now,
  } = input

  const topic = pickTopic(idea, refs, topicHint)
  const targetVillage = pickTargetVillage(idea, refs) || String(village || '').trim()
  const background = buildBackground(idea, refs, startDate, endDate)

  const goal = targetVillage
    ? `围绕「${targetVillage}」开展${topic.topic}，${topic.expected.split(' + ')[0]}。`
    : `围绕${topic.topic}开展实践，形成可落地的成果。`

  const phases = ['plan', 'track', 'result'].map((stage) => ({
    stage,
    title: PHASE_TITLES[stage],
    tasks: (topic.phaseTasks?.[stage] || []).map((t) => ({
      text: t.text,
      output: t.output || '',
      done: false,
    })),
  }))

  const generatedAt =
    typeof now === 'number' ? new Date(now).toISOString() : new Date().toISOString()

  return {
    goal,
    topic: topic.topic,
    targetVillage,
    expected: topic.expected,
    metrics: topic.metrics.map((m) => ({ ...m })),
    background,
    methods: [...topic.methods],
    risks: [...topic.risks],
    phases,
    source: 'template',
    generatedAt,
  }
}

const PHASE_TITLES = {
  plan: '实践前准备',
  track: '实践中执行',
  result: '实践后总结',
}

export const _internals = { TOPICS, DEFAULT_TOPIC, PHASE_TITLES }
