// 递归分级下钻状态机（纯函数、不可变）。默认末级 district。
// 层级可注入：createDrill(customLevels) 传入自定义层级即可扩展下钻深度，
// 例如 createDrill([...LEVELS, 'village']) 支持下钻到村庄级，无需改本文件其它逻辑。
// state 自带 levels 字段，各转换函数据此判断能否继续下钻并保留该字段。
export const LEVELS = ['country', 'province', 'city', 'district']

export function createDrill(levels = LEVELS) {
  return { stack: [{ level: levels[0], adcode: '100000', name: '全国' }], levels }
}

// 取该 state 生效的层级序列（兼容不带 levels 的旧 state：回退到默认 LEVELS）。
function levelsOf(state) {
  return state.levels || LEVELS
}

function currentLevelIndex(state) {
  const top = state.stack.at(-1)
  return levelsOf(state).indexOf(top.level)
}

// 是否还能继续下钻（未到末级）
export function canDrill(state) {
  return currentLevelIndex(state) < levelsOf(state).length - 1
}

// 进入下一级：target = { adcode, name }
export function drillDown(state, target) {
  if (!canDrill(state)) return state
  const nextLevel = levelsOf(state)[currentLevelIndex(state) + 1]
  return {
    ...state,
    stack: [...state.stack, { level: nextLevel, adcode: target.adcode, name: target.name }],
  }
}

// 返回上一级
export function drillUp(state) {
  if (state.stack.length <= 1) return state
  return { ...state, stack: state.stack.slice(0, -1) }
}

// 跳到指定深度（0 = 全国）。用于面包屑点击。
export function goToDepth(state, depth) {
  if (depth < 0 || depth >= state.stack.length) return state
  return { ...state, stack: state.stack.slice(0, depth + 1) }
}

export function current(state) {
  return state.stack.at(-1)
}

export function breadcrumb(state) {
  return state.stack.map((f) => f.name)
}
