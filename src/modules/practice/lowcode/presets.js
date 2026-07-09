// 低代码可视化平台 · 预置大组件 + 作品/组件构造助手
// 本期工作台一（从零造大组件）只做骨架，故这里内置一批「预置大组件」，
// 保证工作台二有料可拼。每个预置项 = 一个可直接拖入画布的组件模板
// （type + 默认 props + 默认 bindings）。
//
// 也提供 createBlock / createEmptyWork 两个纯构造函数供工作台使用（可注入 id 生成器以便测试）。

import { REGISTRY, GRID_COLS, getDef } from './registry.js'

let seq = 0
/** 默认 block id 生成器（可被测试替换）。不依赖 Date/随机，保证可复现。 */
function defaultGenId() {
  seq += 1
  return `b${seq}`
}

/**
 * 造一个组件实例（block）。props/bindings 用 registry 默认值打底，opts 覆盖。
 * @param {string} type
 * @param {object} [opts] - { x, y, w, h, props, bindings, genId }
 */
export function createBlock(type, opts = {}) {
  const def = getDef(type)
  if (!def) throw new Error(`未知组件类型：${type}`)
  const genId = opts.genId || defaultGenId

  const props = {}
  for (const p of def.props) props[p.key] = p.default
  Object.assign(props, opts.props || {})

  const bindings = {}
  for (const s of def.slots) bindings[s.key] = s.default
  Object.assign(bindings, opts.bindings || {})

  return {
    id: genId(),
    type,
    x: Number.isInteger(opts.x) ? opts.x : 0,
    y: Number.isInteger(opts.y) ? opts.y : 0,
    w: Number.isInteger(opts.w) ? opts.w : def.defaultSize.w,
    h: Number.isInteger(opts.h) ? opts.h : def.defaultSize.h,
    props,
    bindings,
  }
}

/** 造一份空作品。 */
export function createEmptyWork(opts = {}) {
  return {
    id: opts.id || '',
    title: opts.title || '未命名成果',
    villageId: opts.villageId || '',
    source: opts.source || '', // 关联的实践档案 id
    layout: { cols: opts.cols || GRID_COLS },
    blocks: [],
  }
}

/**
 * 预置大组件库：工作台二组件面板直接列出。
 * 每项 { key, name, icon, category, make() }，make 返回一个新 block（未定位，x/y 由画布分配）。
 */
export const PRESETS = [
  {
    key: 'preset-heading',
    name: '成果标题',
    icon: '🔠',
    category: 'basic',
    make: () => createBlock('heading', { props: { text: '实践成果', level: 'h1', align: 'center' } }),
  },
  {
    key: 'preset-text',
    name: '说明文本',
    icon: '📝',
    category: 'basic',
    make: () => createBlock('text'),
  },
  {
    key: 'preset-image',
    name: '图片',
    icon: '🖼',
    category: 'basic',
    make: () => createBlock('image'),
  },
  {
    key: 'preset-kpi',
    name: 'KPI 指标卡',
    icon: '🎯',
    category: 'composite',
    make: () => createBlock('kpiGrid'),
  },
  {
    key: 'preset-beforeafter',
    name: '帮扶前后对比',
    icon: '📊',
    category: 'composite',
    make: () => createBlock('beforeAfter'),
  },
  {
    key: 'preset-timeline',
    name: '实践时间轴',
    icon: '🧭',
    category: 'composite',
    make: () => createBlock('timeline'),
  },
  {
    key: 'preset-people',
    name: '人物故事墙',
    icon: '👥',
    category: 'composite',
    make: () => createBlock('peopleWall'),
  },
  {
    key: 'preset-map',
    name: '地图点位',
    icon: '📍',
    category: 'composite',
    make: () => createBlock('mapPoint'),
  },
]

/** 校验：每个预置项 make() 出来的 type 都在 registry 内（防面板列出坏组件）。 */
export function presetTypesAreValid() {
  return PRESETS.every((p) => {
    try {
      const b = p.make()
      return !!REGISTRY[b.type]
    } catch {
      return false
    }
  })
}
