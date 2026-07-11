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
export function calcLayoutSlots(containerW, containerH, layout, splitRatios, slotCount) {
  const innerW = containerW - PAD * 2
  const innerH = containerH - PAD * 2
  const slots = []
  const dividers = []

  switch (layout) {
    case 'horizontal': {
      const totalDiv = (slotCount - 1) * DIV
      const availW = innerW - totalDiv
      let cx = PAD
      for (let i = 0; i < slotCount; i++) {
        const sw = availW * (splitRatios[i] || (100 / slotCount)) / 100
        slots.push({ x: cx, y: PAD, w: sw, h: innerH })
        cx += sw
        if (i < slotCount - 1) {
          dividers.push({ x: cx, y: 0, w: DIV, h: containerH, dir: 'h', index: i })
          cx += DIV
        }
      }
      break
    }
    case 'vertical': {
      const totalDiv = (slotCount - 1) * DIV
      const availH = innerH - totalDiv
      let cy = PAD
      for (let i = 0; i < slotCount; i++) {
        const sh = availH * (splitRatios[i] || (100 / slotCount)) / 100
        slots.push({ x: PAD, y: cy, w: innerW, h: sh })
        cy += sh
        if (i < slotCount - 1) {
          dividers.push({ x: 0, y: cy, w: containerW, h: DIV, dir: 'v', index: i })
          cy += DIV
        }
      }
      break
    }
    case 'grid-2x2': {
      const availW = innerW - DIV
      const availH = innerH - DIV
      const leftW = availW * (splitRatios[0] || 50) / 100
      const rightW = availW * (splitRatios[1] || 50) / 100
      const topH = availH * (splitRatios[2] || 50) / 100
      const bottomH = availH * (splitRatios[3] || 50) / 100
      slots.push({ x: PAD, y: PAD, w: leftW, h: topH })
      slots.push({ x: PAD + leftW + DIV, y: PAD, w: rightW, h: topH })
      slots.push({ x: PAD, y: PAD + topH + DIV, w: leftW, h: bottomH })
      slots.push({ x: PAD + leftW + DIV, y: PAD + topH + DIV, w: rightW, h: bottomH })
      dividers.push({ x: PAD + leftW, y: 0, w: DIV, h: containerH, dir: 'h', index: 0 })
      dividers.push({ x: 0, y: PAD + topH, w: containerW, h: DIV, dir: 'v', index: 1 })
      break
    }
    case 'main-right': {
      const leftW = innerW * (splitRatios[0] || 67) / 100
      const rightW = innerW - DIV - leftW
      slots.push({ x: PAD, y: PAD, w: leftW, h: innerH })
      slots.push({ x: PAD + leftW + DIV, y: PAD, w: rightW, h: innerH })
      dividers.push({ x: PAD + leftW, y: 0, w: DIV, h: containerH, dir: 'h', index: 0 })
      break
    }
    case 'main-left': {
      const leftW = innerW * (splitRatios[0] || 33) / 100
      const rightW = innerW - DIV - leftW
      slots.push({ x: PAD, y: PAD, w: leftW, h: innerH })
      slots.push({ x: PAD + leftW + DIV, y: PAD, w: rightW, h: innerH })
      dividers.push({ x: PAD + leftW, y: 0, w: DIV, h: containerH, dir: 'h', index: 0 })
      break
    }
    case 'main-bottom': {
      const topH = innerH * (splitRatios[0] || 67) / 100
      const bottomH = innerH - DIV - topH
      slots.push({ x: PAD, y: PAD, w: innerW, h: topH })
      slots.push({ x: PAD, y: PAD + topH + DIV, w: innerW, h: bottomH })
      dividers.push({ x: 0, y: PAD + topH, w: containerW, h: DIV, dir: 'v', index: 0 })
      break
    }
    case 'main-top': {
      const topH = innerH * (splitRatios[0] || 33) / 100
      const bottomH = innerH - DIV - topH
      slots.push({ x: PAD, y: PAD, w: innerW, h: topH })
      slots.push({ x: PAD, y: PAD + topH + DIV, w: innerW, h: bottomH })
      dividers.push({ x: 0, y: PAD + topH, w: containerW, h: DIV, dir: 'v', index: 0 })
      break
    }
    case '1+2-right': {
      const leftW = (innerW - DIV) * (splitRatios[0] || 50) / 100
      const rightW = innerW - DIV - leftW
      const rightTopH = (innerH - DIV) * (splitRatios[1] || 50) / 100
      const rightBottomH = innerH - DIV - rightTopH
      slots.push({ x: PAD, y: PAD, w: leftW, h: innerH })
      slots.push({ x: PAD + leftW + DIV, y: PAD, w: rightW, h: rightTopH })
      slots.push({ x: PAD + leftW + DIV, y: PAD + rightTopH + DIV, w: rightW, h: rightBottomH })
      dividers.push({ x: PAD + leftW, y: 0, w: DIV, h: containerH, dir: 'h', index: 0 })
      dividers.push({ x: PAD + leftW + DIV, y: PAD + rightTopH, w: rightW, h: DIV, dir: 'v', index: 1 })
      break
    }
    case '2+1-right': {
      const rightW = (innerW - DIV) * (splitRatios[1] || 33) / 100
      const leftW = innerW - DIV - rightW
      const leftTopH = (innerH - DIV) * (splitRatios[0] || 50) / 100
      const leftBottomH = innerH - DIV - leftTopH
      slots.push({ x: PAD, y: PAD, w: leftW, h: leftTopH })
      slots.push({ x: PAD, y: PAD + leftTopH + DIV, w: leftW, h: leftBottomH })
      slots.push({ x: PAD + leftW + DIV, y: PAD, w: rightW, h: innerH })
      dividers.push({ x: 0, y: PAD + leftTopH, w: leftW, h: DIV, dir: 'v', index: 0 })
      dividers.push({ x: PAD + leftW, y: 0, w: DIV, h: containerH, dir: 'h', index: 1 })
      break
    }
    case '1+2-bottom': {
      const topH = (innerH - DIV) * (splitRatios[0] || 50) / 100
      const bottomH = innerH - DIV - topH
      const bottomLeftW = (innerW - DIV) * (splitRatios[1] || 50) / 100
      const bottomRightW = innerW - DIV - bottomLeftW
      slots.push({ x: PAD, y: PAD, w: innerW, h: topH })
      slots.push({ x: PAD, y: PAD + topH + DIV, w: bottomLeftW, h: bottomH })
      slots.push({ x: PAD + bottomLeftW + DIV, y: PAD + topH + DIV, w: bottomRightW, h: bottomH })
      dividers.push({ x: 0, y: PAD + topH, w: containerW, h: DIV, dir: 'v', index: 0 })
      dividers.push({ x: PAD + bottomLeftW, y: PAD + topH + DIV, w: DIV, h: bottomH, dir: 'h', index: 1 })
      break
    }
    case '2+1-top': {
      const topH = (innerH - DIV) * (splitRatios[1] || 50) / 100
      const bottomH = innerH - DIV - topH
      const topLeftW = (innerW - DIV) * (splitRatios[0] || 50) / 100
      const topRightW = innerW - DIV - topLeftW
      slots.push({ x: PAD, y: PAD, w: topLeftW, h: topH })
      slots.push({ x: PAD + topLeftW + DIV, y: PAD, w: topRightW, h: topH })
      slots.push({ x: PAD, y: PAD + topH + DIV, w: innerW, h: bottomH })
      dividers.push({ x: PAD + topLeftW, y: PAD, w: DIV, h: topH, dir: 'h', index: 0 })
      dividers.push({ x: 0, y: PAD + topH, w: containerW, h: DIV, dir: 'v', index: 1 })
      break
    }
    default: {
      // Fallback to horizontal
      const totalDiv = (slotCount - 1) * DIV
      const availW = innerW - totalDiv
      let cx = PAD
      for (let i = 0; i < slotCount; i++) {
        const sw = availW * (splitRatios[i] || (100 / slotCount)) / 100
        slots.push({ x: cx, y: PAD, w: sw, h: innerH })
        cx += sw
        if (i < slotCount - 1) {
          dividers.push({ x: cx, y: 0, w: DIV, h: containerH, dir: 'h', index: i })
          cx += DIV
        }
      }
    }
  }

  return { slots, dividers }
}
