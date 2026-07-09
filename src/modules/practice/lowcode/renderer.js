// 低代码可视化平台 · 渲染描述生成（禁飞区）
// renderWork(filledWork) → 一棵「与 Vue 无关的渲染描述」（纯数据）
// 输入是 resolveBindings 的产物（每个 block 带 resolved 数据）。
// 输出每个组件：{ id, type, grid:{x,y,w,h}, props（补齐默认）, view（各组件专属的、已算好的展示数据） }
//
// 「一套渲染逻辑，两个消费端」：
//   - 工作台里由 Vue 组件消费 view 交互式渲染
//   - 导出层拿同一棵渲染描述生成静态 HTML
// 所以这里只产纯数据，绝不产 Vue 组件 / HTML 字符串 / DOM。

import { GRID_COLS, REGISTRY } from './registry.js'

/**
 * 把已填充数据的作品树编译成渲染描述。纯函数。
 * @param {object} filledWork - resolveBindings 的输出
 */
export function renderWork(filledWork) {
  const work = filledWork || {}
  const cols = (work.layout && work.layout.cols) || GRID_COLS
  const blocks = Array.isArray(work.blocks) ? work.blocks : []
  return {
    title: work.title || '未命名成果',
    cols,
    nodes: blocks.map(renderBlock).filter(Boolean),
  }
}

/** 编译单个组件为渲染节点。未知类型跳过（返回 null，由上层 filter 掉）。 */
function renderBlock(block) {
  const def = REGISTRY[block && block.type]
  if (!def) return null

  const props = mergeProps(def, block.props || {})
  const resolved = block.resolved || {}

  return {
    id: block.id,
    type: block.type,
    grid: {
      x: intOr(block.x, 0),
      y: intOr(block.y, 0),
      w: intOr(block.w, def.defaultSize.w),
      h: intOr(block.h, def.defaultSize.h),
    },
    props,
    view: buildView(block.type, props, resolved),
  }
}

/** 属性补齐：registry 默认值打底，作品里的值覆盖。 */
function mergeProps(def, given) {
  const out = {}
  for (const p of def.props) {
    out[p.key] = Object.prototype.hasOwnProperty.call(given, p.key) ? given[p.key] : p.default
  }
  return out
}

function intOr(v, fallback) {
  return Number.isInteger(v) ? v : fallback
}

function isNum(v) {
  return v !== undefined && v !== null && String(v).trim() !== '' && !Number.isNaN(Number(v))
}

/**
 * 各组件把「属性 + 已解析插槽数据」算成最终展示数据 view。
 * 这是渲染的核心：所有派生计算（百分比、初始字母、缺失标记）都在这里做完，
 * 下游消费端（Vue / 静态 HTML）只负责把 view 摆出来。
 */
function buildView(type, props, resolved) {
  switch (type) {
    case 'heading':
      return { text: props.text, level: props.level, align: props.align }
    case 'text':
      return { content: props.content, align: props.align }
    case 'image':
      return { src: props.src, alt: props.alt, caption: props.caption }
    case 'kpiGrid':
      return viewKpi(props, resolved.items)
    case 'beforeAfter':
      return viewBeforeAfter(props, resolved.items)
    case 'timeline':
      return viewTimeline(props, resolved.events)
    case 'peopleWall':
      return viewPeopleWall(props, resolved.people)
    case 'mapPoint':
      return viewMapPoint(props, resolved.place)
    default:
      return {}
  }
}

function slot(res) {
  return res || { value: null, missing: true, kind: 'unknown' }
}

function viewKpi(props, res) {
  const s = slot(res)
  const items = (Array.isArray(s.value) ? s.value : [])
    .filter((m) => isNum(m.after) || isNum(m.before))
    .map((m) => ({
      name: m.name || '',
      unit: m.unit || '',
      value: isNum(m.after) ? Number(m.after) : Number(m.before),
    }))
  return { title: props.title, items, missing: s.missing }
}

function viewBeforeAfter(props, res) {
  const s = slot(res)
  const items = (Array.isArray(s.value) ? s.value : [])
    .filter((m) => isNum(m.before) && isNum(m.after))
    .map((m) => {
      const before = Number(m.before)
      const after = Number(m.after)
      const max = Math.max(before, after, 1)
      const delta = after - before
      return {
        name: m.name || '',
        unit: m.unit || '',
        before,
        after,
        beforePct: Math.round((before / max) * 100),
        afterPct: Math.round((after / max) * 100),
        up: delta > 0,
        down: delta < 0,
        deltaLabel: delta === 0 ? '持平' : (delta > 0 ? '▲ +' : '▼ ') + Math.abs(delta) + (m.unit || ''),
      }
    })
  return { title: props.title, items, missing: s.missing }
}

function viewTimeline(props, res) {
  const s = slot(res)
  const events = (Array.isArray(s.value) ? s.value : [])
    .filter((m) => m.name)
    .map((m) => ({ name: m.name, note: m.note || '', type: m.type || '材料' }))
  return { title: props.title, events, missing: s.missing }
}

const AVATAR_COLORS = ['#6b8c5c', '#c9a86a', '#4a8fbf', '#e07a5f', '#8a9a5b', '#b07d62']

function viewPeopleWall(props, res) {
  const s = slot(res)
  const people = (Array.isArray(s.value) ? s.value : [])
    .filter((p) => p.name)
    .map((p, i) => ({
      name: p.name,
      role: p.role || '',
      quote: p.quote || '',
      initial: String(p.name).trim().slice(0, 1),
      color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    }))
  return { title: props.title, people, missing: s.missing }
}

function viewMapPoint(props, res) {
  const s = slot(res)
  const place = s.kind === 'scalar' ? s.value : ''
  return { title: props.title, place, missing: s.missing }
}
