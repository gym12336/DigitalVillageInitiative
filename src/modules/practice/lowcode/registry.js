// 低代码可视化平台 · 组件白名单（约束边界，禁飞区）
// AI、校验器、渲染器三方唯一契约来源：改这里 = 增减平台能力。无逻辑，纯声明。
//
// 一份「成果作品」= 一棵 JSON：
//   { id, title, villageId, source, layout:{cols}, blocks:[ blockInstance ] }
// 每个 blockInstance:
//   { id, type, x, y, w, h, props:{...}, bindings:{ <slotKey>: <sourceKey> } }
//
// 组件分两类：
//   basic     —— 静态基础组件（文本/标题/图片），只有 props、无数据插槽
//   composite —— 大组件（KPI/对比/时间轴/人物墙/地图点位），带「数据插槽」
//                插槽在使用时绑定到一份实践档案 dossier 的某个数据源字段。
//
// 数据源词汇沿用实践档案 dossier.collected 已有结构，不新造模型：
//   metricValues —— [{ name, unit, before, after }]
//   materials    —— [{ name, note, type }]
//   people       —— [{ name, role, quote }]
// 另有标量源（village / topic / targetVillage），供文本类插槽取用。

// 栅格总列数（画布固定 12 列，组件宽度以列为单位）。
export const GRID_COLS = 12

/**
 * 数据源白名单：插槽只能绑定到这里声明的源。
 * kind='list' 是数组源（大组件遍历渲染），kind='scalar' 是标量源（文本填充）。
 * path 是从 dossier 根取值的点路径。
 */
export const DATA_SOURCES = {
  metricValues: { label: '指标数据', kind: 'list', path: 'collected.metricValues' },
  materials: { label: '实践材料', kind: 'list', path: 'collected.materials' },
  people: { label: '人物访谈', kind: 'list', path: 'collected.people' },
  village: { label: '目标村庄', kind: 'scalar', path: 'village' },
  topic: { label: '实践主题', kind: 'scalar', path: 'plan.topic' },
  targetVillage: { label: '目标村（方案）', kind: 'scalar', path: 'plan.targetVillage' },
}

/**
 * 组件注册表。每个条目声明该组件的契约：
 *   category  —— 'basic' | 'composite'
 *   name/icon —— 面板展示
 *   defaultSize —— 拖入画布时的默认 { w, h }（w 以栅格列计，h 以行计）
 *   props     —— 可编辑属性 [{ key, label, type, default }]
 *                 type ∈ 'text' | 'textarea' | 'select' | 'number'；select 带 options
 *   slots     —— 数据插槽 [{ key, label, accepts:[sourceKey...], default }]
 *                accepts 限定该插槽能绑哪些数据源；default 是初始绑定
 */
export const REGISTRY = {
  // —— 基础组件 ——
  heading: {
    category: 'basic',
    name: '标题',
    icon: '🔠',
    defaultSize: { w: 12, h: 1 },
    props: [
      { key: 'text', label: '标题文字', type: 'text', default: '成果标题' },
      { key: 'level', label: '层级', type: 'select', options: ['h1', 'h2', 'h3'], default: 'h2' },
      { key: 'align', label: '对齐', type: 'select', options: ['left', 'center', 'right'], default: 'left' },
    ],
    slots: [],
  },
  text: {
    category: 'basic',
    name: '文本',
    icon: '📝',
    defaultSize: { w: 6, h: 2 },
    props: [
      { key: 'content', label: '正文', type: 'textarea', default: '在这里写一段说明文字。' },
      { key: 'align', label: '对齐', type: 'select', options: ['left', 'center', 'right'], default: 'left' },
    ],
    slots: [],
  },
  image: {
    category: 'basic',
    name: '图片',
    icon: '🖼',
    defaultSize: { w: 6, h: 3 },
    props: [
      { key: 'src', label: '图片地址', type: 'text', default: '' },
      { key: 'alt', label: '替代文本', type: 'text', default: '' },
      { key: 'caption', label: '图注', type: 'text', default: '' },
    ],
    slots: [],
  },

  // —— 大组件（带数据插槽）——
  kpiGrid: {
    category: 'composite',
    name: 'KPI 指标卡',
    icon: '🎯',
    defaultSize: { w: 12, h: 2 },
    props: [{ key: 'title', label: '卡组标题', type: 'text', default: '关键指标' }],
    slots: [
      { key: 'items', label: '指标来源', accepts: ['metricValues'], default: 'metricValues' },
    ],
  },
  beforeAfter: {
    category: 'composite',
    name: '帮扶前后对比',
    icon: '📊',
    defaultSize: { w: 6, h: 3 },
    props: [{ key: 'title', label: '标题', type: 'text', default: '帮扶前后对比' }],
    slots: [
      { key: 'items', label: '指标来源', accepts: ['metricValues'], default: 'metricValues' },
    ],
  },
  timeline: {
    category: 'composite',
    name: '实践时间轴',
    icon: '🧭',
    defaultSize: { w: 6, h: 4 },
    props: [{ key: 'title', label: '标题', type: 'text', default: '实践足迹' }],
    slots: [
      { key: 'events', label: '事件来源', accepts: ['materials'], default: 'materials' },
    ],
  },
  peopleWall: {
    category: 'composite',
    name: '人物故事墙',
    icon: '👥',
    defaultSize: { w: 6, h: 3 },
    props: [{ key: 'title', label: '标题', type: 'text', default: '人物故事墙' }],
    slots: [
      { key: 'people', label: '人物来源', accepts: ['people'], default: 'people' },
    ],
  },
  mapPoint: {
    category: 'composite',
    name: '地图点位',
    icon: '📍',
    defaultSize: { w: 6, h: 4 },
    props: [{ key: 'title', label: '标题', type: 'text', default: '实践地点' }],
    slots: [
      { key: 'place', label: '地点来源', accepts: ['village', 'targetVillage'], default: 'village' },
    ],
  },
}

/** 组件类型是否已注册。 */
export function isKnownType(type) {
  return Object.prototype.hasOwnProperty.call(REGISTRY, type)
}

/** 取某组件的定义（未注册返回 undefined）。 */
export function getDef(type) {
  return REGISTRY[type]
}

/** 取某组件某属性的默认值（无则 undefined）。 */
export function propDefault(type, key) {
  const def = REGISTRY[type]
  if (!def) return undefined
  const p = def.props.find((x) => x.key === key)
  return p ? p.default : undefined
}

/** 数据源是否在白名单内。 */
export function isKnownSource(sourceKey) {
  return Object.prototype.hasOwnProperty.call(DATA_SOURCES, sourceKey)
}

/** 组件面板用：按 category 分组的组件清单 [{ type, ...def }]。 */
export function listComponents() {
  return Object.entries(REGISTRY).map(([type, def]) => ({ type, ...def }))
}
