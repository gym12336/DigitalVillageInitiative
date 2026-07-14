// src/modules/builder/editor/layoutBoxEngine.js
// Shared layout calculation engine for layout-box components.
// Used by both EditorCanvas.vue (editor) and buildPreview.js (preview).

const PAD = 12
const DIV = 4

export const DEFAULT_RATIOS = {
  'horizontal': { 2: [50, 50], 3: [33, 33, 34], 4: [25, 25, 25, 25] },
  'vertical': { 2: [50, 50], 3: [33, 33, 34], 4: [25, 25, 25, 25] },
  'grid-2x2': { 4: [50, 50, 50, 50] },
  'main-right': { 2: [67, 33] },
  'main-left': { 2: [33, 67] },
  'main-bottom': { 2: [67, 33] },
  'main-top': { 2: [33, 67] },
  '1+2-right': { 3: [60, 50] },
  '2+1-right': { 3: [50, 60] },
  '1+2-bottom': { 3: [60, 50] },
  '2+1-top': { 3: [50, 60] },
}

export const LAYOUT_LABELS = {
  'horizontal': '水平等分',
  'vertical': '垂直等分',
  'grid-2x2': '田字格',
  'main-right': '主+右',
  'main-left': '左+主',
  'main-bottom': '主+下',
  'main-top': '上+主',
  '1+2-right': '左大+右二',
  '2+1-right': '左二+右大',
  '1+2-bottom': '上大+下二',
  '2+1-top': '上二+下大',
}

export const LAYOUTS_FOR_COUNT = {
  2: ['horizontal', 'vertical', 'main-right', 'main-left', 'main-bottom', 'main-top'],
  3: ['horizontal', 'vertical', '1+2-right', '2+1-right', '1+2-bottom', '2+1-top'],
  4: ['horizontal', 'vertical', 'grid-2x2'],
}

/**
 * Calculate slot rectangles and divider placements for a layout-box.
 *
 * @param {number} containerW - Full width of the layout-box component
 * @param {number} containerH - Full height of the layout-box component
 * @param {string} layout - Layout key (e.g. 'horizontal', 'grid-2x2', '1+2-right')
 * @param {number[]} splitRatios - Ratio percentages for each split
 * @param {number} slotCount - Number of slots (2-4)
 * @returns {{ slots: Array<{x: number, y: number, w: number, h: number}>,
 *             dividers: Array<{x: number, y: number, w: number, h: number, dir: string, index: number}> }}
 */
// —— 各布局的独立生成器 ——
// 每个生成器接收统一的几何上下文 ctx，返回 { slots, dividers }。
// calcLayoutSlots 只负责按 layout 键分派到对应生成器（未知键回退 horizontal），
// 把原本 12 分支的巨型 switch 拆成一组低复杂度的纯函数。
// ctx: { PAD, DIV, innerW, innerH, containerW, containerH, splitRatios, slotCount }

// 等分：水平或垂直方向按比例切 slotCount 份（horizontal / vertical / 未知回退共用）。
function buildEqualSplit(ctx, dir) {
  const { PAD, DIV, innerW, innerH, containerW, containerH, splitRatios, slotCount } = ctx
  const slots = []
  const dividers = []
  const horizontal = dir === 'h'
  const avail = (horizontal ? innerW : innerH) - (slotCount - 1) * DIV
  let cursor = PAD
  for (let i = 0; i < slotCount; i++) {
    const size = avail * (splitRatios[i] || (100 / slotCount)) / 100
    if (horizontal) slots.push({ x: cursor, y: PAD, w: size, h: innerH })
    else slots.push({ x: PAD, y: cursor, w: innerW, h: size })
    cursor += size
    if (i < slotCount - 1) {
      if (horizontal) dividers.push({ x: cursor, y: 0, w: DIV, h: containerH, dir: 'h', index: i })
      else dividers.push({ x: 0, y: cursor, w: containerW, h: DIV, dir: 'v', index: i })
      cursor += DIV
    }
  }
  return { slots, dividers }
}

// 二等分（一条分隔条）：主+次两块，dir 决定分隔方向，ratio 是第一块的默认占比。
function buildSplit2(ctx, dir, firstDefault) {
  const { PAD, DIV, innerW, innerH, containerW, containerH, splitRatios } = ctx
  const horizontal = dir === 'h'
  const total = horizontal ? innerW : innerH
  const first = total * (splitRatios[0] || firstDefault) / 100
  const second = total - DIV - first
  if (horizontal) {
    return {
      slots: [
        { x: PAD, y: PAD, w: first, h: innerH },
        { x: PAD + first + DIV, y: PAD, w: second, h: innerH },
      ],
      dividers: [{ x: PAD + first, y: 0, w: DIV, h: containerH, dir: 'h', index: 0 }],
    }
  }
  return {
    slots: [
      { x: PAD, y: PAD, w: innerW, h: first },
      { x: PAD, y: PAD + first + DIV, w: innerW, h: second },
    ],
    dividers: [{ x: 0, y: PAD + first, w: containerW, h: DIV, dir: 'v', index: 0 }],
  }
}

function buildGrid2x2(ctx) {
  const { PAD, DIV, innerW, innerH, containerW, containerH, splitRatios } = ctx
  const availW = innerW - DIV
  const availH = innerH - DIV
  const leftW = availW * (splitRatios[0] || 50) / 100
  const rightW = availW * (splitRatios[1] || 50) / 100
  const topH = availH * (splitRatios[2] || 50) / 100
  const bottomH = availH * (splitRatios[3] || 50) / 100
  return {
    slots: [
      { x: PAD, y: PAD, w: leftW, h: topH },
      { x: PAD + leftW + DIV, y: PAD, w: rightW, h: topH },
      { x: PAD, y: PAD + topH + DIV, w: leftW, h: bottomH },
      { x: PAD + leftW + DIV, y: PAD + topH + DIV, w: rightW, h: bottomH },
    ],
    dividers: [
      { x: PAD + leftW, y: 0, w: DIV, h: containerH, dir: 'h', index: 0 },
      { x: 0, y: PAD + topH, w: containerW, h: DIV, dir: 'v', index: 1 },
    ],
  }
}

function build1plus2Right(ctx) {
  const { PAD, DIV, innerW, innerH, containerH, splitRatios } = ctx
  const leftW = (innerW - DIV) * (splitRatios[0] || 50) / 100
  const rightW = innerW - DIV - leftW
  const rightTopH = (innerH - DIV) * (splitRatios[1] || 50) / 100
  const rightBottomH = innerH - DIV - rightTopH
  return {
    slots: [
      { x: PAD, y: PAD, w: leftW, h: innerH },
      { x: PAD + leftW + DIV, y: PAD, w: rightW, h: rightTopH },
      { x: PAD + leftW + DIV, y: PAD + rightTopH + DIV, w: rightW, h: rightBottomH },
    ],
    dividers: [
      { x: PAD + leftW, y: 0, w: DIV, h: containerH, dir: 'h', index: 0 },
      { x: PAD + leftW + DIV, y: PAD + rightTopH, w: rightW, h: DIV, dir: 'v', index: 1 },
    ],
  }
}

function build2plus1Right(ctx) {
  const { PAD, DIV, innerW, innerH, containerH, splitRatios } = ctx
  const rightW = (innerW - DIV) * (splitRatios[1] || 33) / 100
  const leftW = innerW - DIV - rightW
  const leftTopH = (innerH - DIV) * (splitRatios[0] || 50) / 100
  const leftBottomH = innerH - DIV - leftTopH
  return {
    slots: [
      { x: PAD, y: PAD, w: leftW, h: leftTopH },
      { x: PAD, y: PAD + leftTopH + DIV, w: leftW, h: leftBottomH },
      { x: PAD + leftW + DIV, y: PAD, w: rightW, h: innerH },
    ],
    dividers: [
      { x: 0, y: PAD + leftTopH, w: leftW, h: DIV, dir: 'v', index: 0 },
      { x: PAD + leftW, y: 0, w: DIV, h: containerH, dir: 'h', index: 1 },
    ],
  }
}

function build1plus2Bottom(ctx) {
  const { PAD, DIV, innerW, innerH, containerW, splitRatios } = ctx
  const topH = (innerH - DIV) * (splitRatios[0] || 50) / 100
  const bottomH = innerH - DIV - topH
  const bottomLeftW = (innerW - DIV) * (splitRatios[1] || 50) / 100
  const bottomRightW = innerW - DIV - bottomLeftW
  return {
    slots: [
      { x: PAD, y: PAD, w: innerW, h: topH },
      { x: PAD, y: PAD + topH + DIV, w: bottomLeftW, h: bottomH },
      { x: PAD + bottomLeftW + DIV, y: PAD + topH + DIV, w: bottomRightW, h: bottomH },
    ],
    dividers: [
      { x: 0, y: PAD + topH, w: containerW, h: DIV, dir: 'v', index: 0 },
      { x: PAD + bottomLeftW, y: PAD + topH + DIV, w: DIV, h: bottomH, dir: 'h', index: 1 },
    ],
  }
}

function build2plus1Top(ctx) {
  const { PAD, DIV, innerW, innerH, containerW, splitRatios } = ctx
  const topH = (innerH - DIV) * (splitRatios[1] || 50) / 100
  const bottomH = innerH - DIV - topH
  const topLeftW = (innerW - DIV) * (splitRatios[0] || 50) / 100
  const topRightW = innerW - DIV - topLeftW
  return {
    slots: [
      { x: PAD, y: PAD, w: topLeftW, h: topH },
      { x: PAD + topLeftW + DIV, y: PAD, w: topRightW, h: topH },
      { x: PAD, y: PAD + topH + DIV, w: innerW, h: bottomH },
    ],
    dividers: [
      { x: PAD + topLeftW, y: PAD, w: DIV, h: topH, dir: 'h', index: 0 },
      { x: 0, y: PAD + topH, w: containerW, h: DIV, dir: 'v', index: 1 },
    ],
  }
}

// 布局键 → 生成器分派表。未知键回退到 horizontal（见 calcLayoutSlots）。
const LAYOUT_BUILDERS = {
  'horizontal': (ctx) => buildEqualSplit(ctx, 'h'),
  'vertical': (ctx) => buildEqualSplit(ctx, 'v'),
  'grid-2x2': buildGrid2x2,
  'main-right': (ctx) => buildSplit2(ctx, 'h', 67),
  'main-left': (ctx) => buildSplit2(ctx, 'h', 33),
  'main-bottom': (ctx) => buildSplit2(ctx, 'v', 67),
  'main-top': (ctx) => buildSplit2(ctx, 'v', 33),
  '1+2-right': build1plus2Right,
  '2+1-right': build2plus1Right,
  '1+2-bottom': build1plus2Bottom,
  '2+1-top': build2plus1Top,
}

export function calcLayoutSlots(containerW, containerH, layout, splitRatios, slotCount) {
  const ctx = {
    PAD, DIV,
    innerW: containerW - PAD * 2,
    innerH: containerH - PAD * 2,
    containerW, containerH, splitRatios, slotCount,
  }
  const build = LAYOUT_BUILDERS[layout] || ((c) => buildEqualSplit(c, 'h'))
  return build(ctx)
}
