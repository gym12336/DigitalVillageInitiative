// 低代码可视化平台 · 作品 JSON 校验（禁飞区）
// validateWork(work) → { valid, errors }
// 渲染前防线 + 防 AI 脏输出/注入的安全闸。只读 registry，不依赖 renderer / Vue。
//
// 校验维度：
//   1. 顶层结构合法（blocks 是数组，layout.cols 合规）
//   2. 每个 block 的 type 在 registry 内
//   3. 栅格坐标合规（x/y/w/h 为非负整数，w≥1，且 x+w 不超总列数）
//   4. 每个必填属性齐全（缺失的属性不算错——渲染时回落默认；但 props 必须是对象）
//   5. 插槽绑定的数据源在白名单内，且被该插槽的 accepts 接受
//   6. 未声明的插槽 key 绑定视为非法（防注入越权字段）

import { GRID_COLS, REGISTRY, DATA_SOURCES, isKnownType } from './registry.js'

/**
 * 校验一棵作品 JSON。返回 { valid, errors:[{ path, message }] }。
 * 不抛异常——把所有问题收集齐一次性返回，供 UI 逐条提示。
 */
export function validateWork(work) {
  const errors = []
  const add = (path, message) => errors.push({ path, message })

  if (!work || typeof work !== 'object' || Array.isArray(work)) {
    return { valid: false, errors: [{ path: '', message: '作品必须是一个对象' }] }
  }

  // —— 布局 ——
  const cols = work.layout && work.layout.cols
  if (cols !== undefined && (!Number.isInteger(cols) || cols < 1)) {
    add('layout.cols', 'layout.cols 必须是正整数')
  }
  const totalCols = Number.isInteger(cols) && cols >= 1 ? cols : GRID_COLS

  // —— blocks ——
  if (!Array.isArray(work.blocks)) {
    add('blocks', 'blocks 必须是数组')
    return { valid: errors.length === 0, errors }
  }

  work.blocks.forEach((block, i) => {
    const base = `blocks[${i}]`
    if (!block || typeof block !== 'object' || Array.isArray(block)) {
      add(base, '组件必须是一个对象')
      return
    }

    // 类型
    if (!isKnownType(block.type)) {
      add(`${base}.type`, `未知组件类型「${block.type}」`)
      return // 类型未知，后续插槽/属性校验无从谈起
    }
    const def = REGISTRY[block.type]

    // 栅格坐标
    validateGrid(block, base, totalCols, add)

    // props 必须是对象（缺字段允许，渲染回落默认）
    if (block.props !== undefined && (typeof block.props !== 'object' || block.props === null || Array.isArray(block.props))) {
      add(`${base}.props`, 'props 必须是对象')
    }

    // 插槽绑定
    validateBindings(block, def, base, add)
  })

  return { valid: errors.length === 0, errors }
}

/** 栅格坐标校验：x/y 非负整数、w/h 正整数、x+w 不越界。 */
function validateGrid(block, base, totalCols, add) {
  const ints = { x: block.x, y: block.y, w: block.w, h: block.h }
  for (const [k, v] of Object.entries(ints)) {
    if (v === undefined) {
      add(`${base}.${k}`, `缺少栅格坐标 ${k}`)
      continue
    }
    if (!Number.isInteger(v)) add(`${base}.${k}`, `${k} 必须是整数`)
  }
  if (Number.isInteger(block.x) && block.x < 0) add(`${base}.x`, 'x 不能为负')
  if (Number.isInteger(block.y) && block.y < 0) add(`${base}.y`, 'y 不能为负')
  if (Number.isInteger(block.w) && block.w < 1) add(`${base}.w`, 'w 至少为 1')
  if (Number.isInteger(block.h) && block.h < 1) add(`${base}.h`, 'h 至少为 1')
  if (Number.isInteger(block.x) && Number.isInteger(block.w) && block.x + block.w > totalCols) {
    add(`${base}`, `组件越界：x(${block.x}) + w(${block.w}) 超过总列数 ${totalCols}`)
  }
}

/** 插槽绑定校验：只允许 def 声明的插槽 key；源在白名单内且被 accepts 接受。 */
function validateBindings(block, def, base, add) {
  const bindings = block.bindings
  if (bindings === undefined) return // 无绑定合法（渲染回落默认源）
  if (typeof bindings !== 'object' || bindings === null || Array.isArray(bindings)) {
    add(`${base}.bindings`, 'bindings 必须是对象')
    return
  }
  const slotKeys = new Set(def.slots.map((s) => s.key))
  for (const [slotKey, sourceKey] of Object.entries(bindings)) {
    if (!slotKeys.has(slotKey)) {
      add(`${base}.bindings.${slotKey}`, `组件「${block.type}」没有插槽「${slotKey}」`)
      continue
    }
    if (!Object.prototype.hasOwnProperty.call(DATA_SOURCES, sourceKey)) {
      add(`${base}.bindings.${slotKey}`, `未知数据源「${sourceKey}」`)
      continue
    }
    const slot = def.slots.find((s) => s.key === slotKey)
    if (slot.accepts && !slot.accepts.includes(sourceKey)) {
      add(`${base}.bindings.${slotKey}`, `插槽「${slotKey}」不接受数据源「${sourceKey}」`)
    }
  }
}
