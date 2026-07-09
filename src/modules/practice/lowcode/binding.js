// 低代码可视化平台 · 数据插槽解析（禁飞区）
// resolveBindings(work, dossier) → 「已填充数据的作品树」
// 遍历作品里每个组件的每个插槽，按绑定的数据源从实践档案取值灌入。
// 取不到数据时落空占位 + 标记「待补充」，不静默出错——这是「实践中上传 → 实践后成果」数据流的接缝。
//
// 输出结构：在每个 block 上挂一个 resolved 字段：
//   { <slotKey>: { source, kind, value, missing } }
// value 是取到的数据（list 源为数组、scalar 源为字符串）；missing=true 表示源里没数据。

import { REGISTRY, DATA_SOURCES } from './registry.js'

/** 按点路径从对象取值（'collected.metricValues' → obj.collected.metricValues）。 */
function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}

/**
 * 解析一份作品的所有数据绑定。纯函数，不改入参。
 * @param {object} work    - 作品 JSON（应已过 validateWork）
 * @param {object} dossier - 实践档案（含 collected / village / plan 等）
 * @returns 带 resolved 字段的作品树副本
 */
export function resolveBindings(work, dossier) {
  const blocks = Array.isArray(work && work.blocks) ? work.blocks : []
  const doc = dossier || {}
  return {
    ...work,
    blocks: blocks.map((block) => ({
      ...block,
      resolved: resolveBlock(block, doc),
    })),
  }
}

/** 解析单个组件的所有插槽。基础组件（无插槽）返回空对象。 */
function resolveBlock(block, dossier) {
  const def = REGISTRY[block && block.type]
  if (!def || !def.slots.length) return {}

  const bindings = (block && block.bindings) || {}
  const resolved = {}
  for (const slot of def.slots) {
    // 绑定优先用作品里的显式绑定，缺则回落插槽默认源。
    const source = bindings[slot.key] || slot.default
    resolved[slot.key] = resolveSlot(source, dossier)
  }
  return resolved
}

/** 解析单个插槽：按数据源定义取值，判定缺失。 */
function resolveSlot(source, dossier) {
  const srcDef = DATA_SOURCES[source]
  if (!srcDef) {
    // 源未知（理论上 validate 已拦），给一个明确的缺失占位。
    return { source, kind: 'unknown', value: null, missing: true }
  }
  const raw = getByPath(dossier, srcDef.path)

  if (srcDef.kind === 'list') {
    const value = Array.isArray(raw) ? raw : []
    return { source, kind: 'list', value, missing: value.length === 0 }
  }
  // scalar
  const str = raw == null ? '' : String(raw)
  return { source, kind: 'scalar', value: str, missing: str.trim() === '' }
}
