export const GUIDE_STAGE_ALL = 'all'
export const GUIDE_TYPE_ALL = 'all'

export const GUIDE_STAGES = [
  {
    id: 'before',
    name: '实践前',
    shortName: '准备实践',
    cta: '我正在准备实践',
    desc: '从选题、组队、联系村庄到策划书和行前安全，把出发前最容易漏掉的事情先理顺。',
    topics: ['选题与项目设计', '联系村庄或实践单位', '策划书与立项申报', '经费预算', '保险、安全与行前准备'],
  },
  {
    id: 'during',
    name: '实践中',
    shortName: '到达实践地',
    cta: '我已经到达实践地',
    desc: '围绕访谈、问卷、观察、影像采集、宣传投稿和票据留存，帮助团队在现场有序推进。',
    topics: ['村干部和村民访谈', '问卷设计与发放', '田野观察与实践日志', '图片视频采集', '新闻稿和推文'],
  },
  {
    id: 'after',
    name: '实践后',
    shortName: '整理成果',
    cta: '我正在整理成果',
    desc: '把现场材料转化为报告、结项材料、展示 PPT 和可复盘档案，避免实践结束后才发现证据不足。',
    topics: ['访谈资料整理', '问卷数据分析', '调研报告写作', '结项材料准备', '答辩 PPT 与常见问题'],
  },
]

export const GUIDE_TYPES = ['攻略', '模板', '清单', '案例', '工具']

export const HOT_KEYWORDS = [
  '联系村庄',
  '策划书',
  '经费预算',
  '访谈提纲',
  '新闻稿',
  '应急预案',
  '调研报告',
  '结项答辩',
]

export function stageName(stageId) {
  return GUIDE_STAGES.find((stage) => stage.id === stageId)?.name || stageId
}
