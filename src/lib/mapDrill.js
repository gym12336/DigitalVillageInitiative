// 递归分级下钻状态机（纯函数、不可变）。首版末级 district；C 阶段可在末尾加 'village'。
export const LEVELS = ['country', 'province', 'city', 'district']

export function createDrill() {
  return { stack: [{ level: 'country', adcode: '100000', name: '全国' }] }
}

function currentLevelIndex(state) {
  const top = state.stack.at(-1)
  return LEVELS.indexOf(top.level)
}

// 是否还能继续下钻（未到末级）
export function canDrill(state) {
  return currentLevelIndex(state) < LEVELS.length - 1
}

// 进入下一级：target = { adcode, name }
export function drillDown(state, target) {
  if (!canDrill(state)) return state
  const nextLevel = LEVELS[currentLevelIndex(state) + 1]
  return {
    stack: [...state.stack, { level: nextLevel, adcode: target.adcode, name: target.name }],
  }
}

// 返回上一级
export function drillUp(state) {
  if (state.stack.length <= 1) return state
  return { stack: state.stack.slice(0, -1) }
}

// 跳到指定深度（0 = 全国）。用于面包屑点击。
export function goToDepth(state, depth) {
  if (depth < 0 || depth >= state.stack.length) return state
  return { stack: state.stack.slice(0, depth + 1) }
}

export function current(state) {
  return state.stack.at(-1)
}

export function breadcrumb(state) {
  return state.stack.map((f) => f.name)
}
