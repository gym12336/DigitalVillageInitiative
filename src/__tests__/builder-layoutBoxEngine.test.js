import { describe, it, expect } from 'vitest'
import { calcLayoutSlots, DEFAULT_RATIOS, LAYOUTS_FOR_COUNT } from '@/modules/builder/editor/layoutBoxEngine.js'

// 黄金测试（characterization test）：在重构 calcLayoutSlots 之前，
// 用重构前的真实输出固化每种布局的 slots/dividers。重构后必须逐字节一致，
// 这是"行为不变"的硬证明。golden 由重构前的实现对 800x600 容器生成。
const GOLDEN = {
  'horizontal|50,50|2': {"slots":[{"x":12,"y":12,"w":386,"h":576},{"x":402,"y":12,"w":386,"h":576}],"dividers":[{"x":398,"y":0,"w":4,"h":600,"dir":"h","index":0}]},
  'horizontal|33,33,34|3': {"slots":[{"x":12,"y":12,"w":253.44,"h":576},{"x":269.44,"y":12,"w":253.44,"h":576},{"x":526.88,"y":12,"w":261.12,"h":576}],"dividers":[{"x":265.44,"y":0,"w":4,"h":600,"dir":"h","index":0},{"x":522.88,"y":0,"w":4,"h":600,"dir":"h","index":1}]},
  'horizontal|25,25,25,25|4': {"slots":[{"x":12,"y":12,"w":191,"h":576},{"x":207,"y":12,"w":191,"h":576},{"x":402,"y":12,"w":191,"h":576},{"x":597,"y":12,"w":191,"h":576}],"dividers":[{"x":203,"y":0,"w":4,"h":600,"dir":"h","index":0},{"x":398,"y":0,"w":4,"h":600,"dir":"h","index":1},{"x":593,"y":0,"w":4,"h":600,"dir":"h","index":2}]},
  'vertical|50,50|2': {"slots":[{"x":12,"y":12,"w":776,"h":286},{"x":12,"y":302,"w":776,"h":286}],"dividers":[{"x":0,"y":298,"w":800,"h":4,"dir":"v","index":0}]},
  'vertical|33,33,34|3': {"slots":[{"x":12,"y":12,"w":776,"h":187.44},{"x":12,"y":203.44,"w":776,"h":187.44},{"x":12,"y":394.88,"w":776,"h":193.12}],"dividers":[{"x":0,"y":199.44,"w":800,"h":4,"dir":"v","index":0},{"x":0,"y":390.88,"w":800,"h":4,"dir":"v","index":1}]},
  'grid-2x2|50,50,50,50|4': {"slots":[{"x":12,"y":12,"w":386,"h":286},{"x":402,"y":12,"w":386,"h":286},{"x":12,"y":302,"w":386,"h":286},{"x":402,"y":302,"w":386,"h":286}],"dividers":[{"x":398,"y":0,"w":4,"h":600,"dir":"h","index":0},{"x":0,"y":298,"w":800,"h":4,"dir":"v","index":1}]},
  'main-right|67,33|2': {"slots":[{"x":12,"y":12,"w":519.92,"h":576},{"x":535.92,"y":12,"w":252.08000000000004,"h":576}],"dividers":[{"x":531.92,"y":0,"w":4,"h":600,"dir":"h","index":0}]},
  'main-left|33,67|2': {"slots":[{"x":12,"y":12,"w":256.08,"h":576},{"x":272.08,"y":12,"w":515.9200000000001,"h":576}],"dividers":[{"x":268.08,"y":0,"w":4,"h":600,"dir":"h","index":0}]},
  'main-bottom|67,33|2': {"slots":[{"x":12,"y":12,"w":776,"h":385.92},{"x":12,"y":401.92,"w":776,"h":186.07999999999998}],"dividers":[{"x":0,"y":397.92,"w":800,"h":4,"dir":"v","index":0}]},
  'main-top|33,67|2': {"slots":[{"x":12,"y":12,"w":776,"h":190.08},{"x":12,"y":206.08,"w":776,"h":381.91999999999996}],"dividers":[{"x":0,"y":202.08,"w":800,"h":4,"dir":"v","index":0}]},
  '1+2-right|60,50|3': {"slots":[{"x":12,"y":12,"w":463.2,"h":576},{"x":479.2,"y":12,"w":308.8,"h":286},{"x":479.2,"y":302,"w":308.8,"h":286}],"dividers":[{"x":475.2,"y":0,"w":4,"h":600,"dir":"h","index":0},{"x":479.2,"y":298,"w":308.8,"h":4,"dir":"v","index":1}]},
  '2+1-right|50,60|3': {"slots":[{"x":12,"y":12,"w":308.8,"h":286},{"x":12,"y":302,"w":308.8,"h":286},{"x":324.8,"y":12,"w":463.2,"h":576}],"dividers":[{"x":0,"y":298,"w":308.8,"h":4,"dir":"v","index":0},{"x":320.8,"y":0,"w":4,"h":600,"dir":"h","index":1}]},
  '1+2-bottom|60,50|3': {"slots":[{"x":12,"y":12,"w":776,"h":343.2},{"x":12,"y":359.2,"w":386,"h":228.8},{"x":402,"y":359.2,"w":386,"h":228.8}],"dividers":[{"x":0,"y":355.2,"w":800,"h":4,"dir":"v","index":0},{"x":398,"y":359.2,"w":4,"h":228.8,"dir":"h","index":1}]},
  '2+1-top|50,60|3': {"slots":[{"x":12,"y":12,"w":386,"h":343.2},{"x":402,"y":12,"w":386,"h":343.2},{"x":12,"y":359.2,"w":776,"h":228.8}],"dividers":[{"x":398,"y":12,"w":4,"h":343.2,"dir":"h","index":0},{"x":0,"y":355.2,"w":800,"h":4,"dir":"v","index":1}]},
  'unknown-fallback|50,50|2': {"slots":[{"x":12,"y":12,"w":386,"h":576},{"x":402,"y":12,"w":386,"h":576}],"dividers":[{"x":398,"y":0,"w":4,"h":600,"dir":"h","index":0}]},
  'horizontal||3': {"slots":[{"x":12,"y":12,"w":256,"h":576},{"x":272,"y":12,"w":256,"h":576},{"x":532,"y":12,"w":256,"h":576}],"dividers":[{"x":268,"y":0,"w":4,"h":600,"dir":"h","index":0},{"x":528,"y":0,"w":4,"h":600,"dir":"h","index":1}]},
}

const CASES = [
  ['horizontal', [50, 50], 2],
  ['horizontal', [33, 33, 34], 3],
  ['horizontal', [25, 25, 25, 25], 4],
  ['vertical', [50, 50], 2],
  ['vertical', [33, 33, 34], 3],
  ['grid-2x2', [50, 50, 50, 50], 4],
  ['main-right', [67, 33], 2],
  ['main-left', [33, 67], 2],
  ['main-bottom', [67, 33], 2],
  ['main-top', [33, 67], 2],
  ['1+2-right', [60, 50], 3],
  ['2+1-right', [50, 60], 3],
  ['1+2-bottom', [60, 50], 3],
  ['2+1-top', [50, 60], 3],
  ['unknown-fallback', [50, 50], 2],
  ['horizontal', [], 3],
]

describe('layoutBoxEngine.calcLayoutSlots · 黄金回归（行为不变）', () => {
  for (const [layout, ratios, count] of CASES) {
    const key = `${layout}|${ratios.join(',')}|${count}`
    it(`布局 ${key} 的输出与重构前逐字节一致`, () => {
      const got = calcLayoutSlots(800, 600, layout, ratios, count)
      expect(got).toEqual(GOLDEN[key])
    })
  }
})

describe('layoutBoxEngine.calcLayoutSlots · 结构与边界', () => {
  it('slots 数量等于 slotCount（等分布局）', () => {
    expect(calcLayoutSlots(800, 600, 'horizontal', [50, 50], 2).slots).toHaveLength(2)
    expect(calcLayoutSlots(800, 600, 'horizontal', [25, 25, 25, 25], 4).slots).toHaveLength(4)
  })

  it('未知布局回退到 horizontal（与 horizontal 同结构）', () => {
    const fallback = calcLayoutSlots(800, 600, 'no-such-layout', [50, 50], 2)
    const horiz = calcLayoutSlots(800, 600, 'horizontal', [50, 50], 2)
    expect(fallback).toEqual(horiz)
  })

  it('splitRatios 缺项时用等分兜底（不产生 NaN）', () => {
    const r = calcLayoutSlots(800, 600, 'horizontal', [], 3)
    for (const s of r.slots) {
      expect(Number.isNaN(s.w)).toBe(false)
      expect(Number.isNaN(s.h)).toBe(false)
    }
  })

  it('等分布局：所有 slot 宽度之和 + 分隔条宽度 = 内宽', () => {
    const containerW = 800
    const r = calcLayoutSlots(containerW, 600, 'horizontal', [50, 50], 2)
    const sumW = r.slots.reduce((a, s) => a + s.w, 0)
    const PAD = 12, DIV = 4
    expect(sumW + DIV).toBeCloseTo(containerW - PAD * 2, 6)
  })

  it('每种支持的布局都返回 slots 和 dividers 数组', () => {
    for (const [count, layouts] of Object.entries(LAYOUTS_FOR_COUNT)) {
      for (const layout of layouts) {
        const ratios = DEFAULT_RATIOS[layout]?.[count] || []
        const r = calcLayoutSlots(800, 600, layout, ratios, Number(count))
        expect(Array.isArray(r.slots)).toBe(true)
        expect(Array.isArray(r.dividers)).toBe(true)
      }
    }
  })
})
