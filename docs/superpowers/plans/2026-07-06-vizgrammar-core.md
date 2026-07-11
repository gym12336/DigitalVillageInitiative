# 可视化语法核心 (Visualization Grammar Core) 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现「可视化语法(Grammar of Graphics)」的前端核心——用一套受约束的 Schema 定义可视化原子零件,把一棵 Spec 组合树渲染成 ECharts 配置,并校验 Spec 合法性。这是禁飞区②(渲染引擎)与「约束边界」(schema)的落地,纯函数、零服务器依赖、全 TDD。

**Architecture:** 四个纯 JS 模块住在 `src/modules/practice/vizgrammar/`:`schema.js` 定义合法原子(marks / 编码通道 / 数据源 / 配色);`validate.js` 校验一棵 Spec 是否落在 schema 内;`result-charts.js` 是数据整形纯函数;`renderer.js` 遍历 Spec 树、按 mark 组装 ECharts option。renderer 与未来的 compile.js 靠 schema 解耦。

**Tech Stack:** Vue3 项目内的纯 ES 模块;Vitest(`vitest run`)测试,已配 `@` → `src` 别名与 jsdom 环境;ECharts 5(只组装 option 对象,不在单测里实例化图表)。

---

## File Structure

- `src/modules/practice/vizgrammar/schema.js` — 语法常量与「每个 mark 需要哪些编码通道」的映射。无逻辑,纯声明。
- `src/modules/practice/vizgrammar/result-charts.js` — 数据整形纯函数(从行数组取列、解析数据源)。renderer 依赖它保持自身轻薄。
- `src/modules/practice/vizgrammar/validate.js` — `validateSpec(spec)` → `{ valid, errors }`。只读 schema,不依赖 renderer。
- `src/modules/practice/vizgrammar/renderer.js` — `renderSpec(spec, data)` → 渲染结果树。禁飞区②。依赖 schema + result-charts。
- 测试全部放 `src/__tests__/`(沿用现有约定),文件名 `vizgrammar-<模块>.test.js`。

**依赖方向:** `schema` ← `validate`;`schema` + `result-charts` ← `renderer`。无循环依赖。

**Plan 1 范围内的 marks:** `bar`(通用柱状)、`dumbbell`(帮扶前后对比,旗舰)。外加非图表块 `narrative`(叙事,透传占位,由后续 AI 层填充)。`metric` / `line` / `timeline` / `pie` 留待后续计划扩展 schema——本计划不实现,以保持任务小而可证。

---

## Task 1: schema.js — 语法常量

**Files:**
- Create: `src/modules/practice/vizgrammar/schema.js`
- Test: `src/__tests__/vizgrammar-schema.test.js`

- [ ] **Step 1: 写失败测试**

```js
// src/__tests__/vizgrammar-schema.test.js
import { describe, it, expect } from 'vitest'
import { MARKS, BLOCK_KINDS, DATA_SOURCES, PALETTES, MARK_ENCODINGS } from '@/modules/practice/vizgrammar/schema'

describe('schema 常量', () => {
  it('marks 含 bar 与 dumbbell', () => {
    expect(MARKS).toContain('bar')
    expect(MARKS).toContain('dumbbell')
  })
  it('块类型含 chart 与 narrative', () => {
    expect(BLOCK_KINDS).toEqual(expect.arrayContaining(['chart', 'narrative']))
  })
  it('数据源覆盖结构化成果的五个集合', () => {
    expect(DATA_SOURCES).toEqual(
      expect.arrayContaining(['metrics', 'before_after', 'timeline', 'people', 'photos']),
    )
  })
  it('每种配色是颜色数组', () => {
    expect(Array.isArray(PALETTES['earth-green'])).toBe(true)
    expect(PALETTES['earth-green'].length).toBeGreaterThan(0)
  })
  it('每个 mark 声明了所需编码通道', () => {
    expect(MARK_ENCODINGS.bar).toEqual(['x', 'y'])
    expect(MARK_ENCODINGS.dumbbell).toEqual(['category', 'before', 'after'])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- vizgrammar-schema`
Expected: FAIL — 无法解析 `@/modules/practice/vizgrammar/schema`(模块不存在)。

- [ ] **Step 3: 写实现**

```js
// src/modules/practice/vizgrammar/schema.js
// 可视化语法的「约束边界」:AI(compile)与手写 renderer 都只认这里声明的原子。
// 改这里 = 扩展/收缩语法空间,是 compile 与 renderer 的唯一契约来源。

export const MARKS = ['bar', 'dumbbell']

export const BLOCK_KINDS = ['chart', 'narrative']

// 结构化成果数据里可被引用的集合名(见设计文档第 4 节 structured JSON)
export const DATA_SOURCES = ['metrics', 'before_after', 'timeline', 'people', 'photos']

// 配色原子:名称 → 颜色数组(喂给 ECharts 的 color 字段)
export const PALETTES = {
  'earth-green': ['#6b8e5a', '#a7c080', '#d8e0c0'],
  coral: ['#e0785a', '#f0a080', '#f8d0c0'],
  neutral: ['#7a7a7a', '#a0a0a0', '#c8c8c8'],
}

// 每个 mark 必须提供的编码通道(缺一即非法)
export const MARK_ENCODINGS = {
  bar: ['x', 'y'],
  dumbbell: ['category', 'before', 'after'],
}

export const DEFAULT_PALETTE = 'earth-green'
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- vizgrammar-schema`
Expected: PASS,5 个用例全绿。

- [ ] **Step 5: 提交**

```bash
git add src/modules/practice/vizgrammar/schema.js src/__tests__/vizgrammar-schema.test.js
git commit -m "feat(vizgrammar): 语法 Schema 常量与 mark 编码映射"
```

---

## Task 2: result-charts.js — 数据整形纯函数

**Files:**
- Create: `src/modules/practice/vizgrammar/result-charts.js`
- Test: `src/__tests__/vizgrammar-charts.test.js`

- [ ] **Step 1: 写失败测试**

```js
// src/__tests__/vizgrammar-charts.test.js
import { describe, it, expect } from 'vitest'
import { pluckColumn, resolveSource } from '@/modules/practice/vizgrammar/result-charts'

const data = {
  before_after: [
    { metric: '月销量', before: 200, after: 450, unit: '件' },
    { metric: '村集体收入', before: 3, after: 8, unit: '万元' },
  ],
  metrics: [{ label: '走访户数', value: 128, unit: '户' }],
}

describe('pluckColumn', () => {
  it('从行数组取某一列', () => {
    expect(pluckColumn(data.before_after, 'metric')).toEqual(['月销量', '村集体收入'])
    expect(pluckColumn(data.before_after, 'before')).toEqual([200, 3])
  })
  it('缺失字段的行取到 undefined', () => {
    expect(pluckColumn([{ a: 1 }], 'b')).toEqual([undefined])
  })
  it('不改入参', () => {
    const copy = JSON.parse(JSON.stringify(data.before_after))
    pluckColumn(data.before_after, 'metric')
    expect(data.before_after).toEqual(copy)
  })
})

describe('resolveSource', () => {
  it('按编码里带 from 的通道解析出数据集合', () => {
    const encoding = { category: { field: 'metric', from: 'before_after' }, before: { field: 'before' }, after: { field: 'after' } }
    expect(resolveSource(encoding, data)).toBe(data.before_after)
  })
  it('数据源不存在时返回空数组', () => {
    const encoding = { x: { field: 'label', from: 'nope' }, y: { field: 'value' } }
    expect(resolveSource(encoding, data)).toEqual([])
  })
  it('没有任何通道声明 from 时返回空数组', () => {
    expect(resolveSource({ x: { field: 'a' } }, data)).toEqual([])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- vizgrammar-charts`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: 写实现**

```js
// src/modules/practice/vizgrammar/result-charts.js
// 数据整形纯函数:renderer 用它把「结构化成果数据」压成图表要的列/集合,自身保持轻薄。

// 从行数组里取出某个字段构成的列。
export function pluckColumn(rows, field) {
  return (rows || []).map((row) => row[field])
}

// 一个块的编码里,带 from 的那个通道决定用哪一个数据集合。
// 返回该集合(数组);源不存在或无 from 时返回空数组。
export function resolveSource(encoding, data) {
  for (const channel of Object.values(encoding || {})) {
    if (channel && channel.from) {
      const rows = (data || {})[channel.from]
      return Array.isArray(rows) ? rows : []
    }
  }
  return []
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- vizgrammar-charts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/modules/practice/vizgrammar/result-charts.js src/__tests__/vizgrammar-charts.test.js
git commit -m "feat(vizgrammar): 数据整形纯函数 pluckColumn/resolveSource"
```

---

## Task 3: validate.js — Spec 校验

**Files:**
- Create: `src/modules/practice/vizgrammar/validate.js`
- Test: `src/__tests__/vizgrammar-validate.test.js`

- [ ] **Step 1: 写失败测试**

```js
// src/__tests__/vizgrammar-validate.test.js
import { describe, it, expect } from 'vitest'
import { validateSpec } from '@/modules/practice/vizgrammar/validate'

const goodSpec = {
  layout: { type: 'grid', slots: ['hero', 'body'] },
  blocks: [
    {
      slot: 'hero', kind: 'chart', mark: 'dumbbell',
      encoding: { category: { field: 'metric', from: 'before_after' }, before: { field: 'before' }, after: { field: 'after' } },
      palette: 'earth-green',
    },
    { slot: 'body', kind: 'narrative', source: 'narrate' },
  ],
}

describe('validateSpec', () => {
  it('合法 Spec 通过', () => {
    expect(validateSpec(goodSpec)).toEqual({ valid: true, errors: [] })
  })
  it('layout 缺失或非 grid 报错', () => {
    const r = validateSpec({ blocks: [] })
    expect(r.valid).toBe(false)
    expect(r.errors.join()).toMatch(/layout/)
  })
  it('未知 mark 报错', () => {
    const bad = { ...goodSpec, blocks: [{ ...goodSpec.blocks[0], mark: 'pie3d' }] }
    const r = validateSpec(bad)
    expect(r.valid).toBe(false)
    expect(r.errors.join()).toMatch(/mark/)
  })
  it('chart 块缺编码通道报错', () => {
    const bad = { ...goodSpec, blocks: [{ ...goodSpec.blocks[0], encoding: { category: { field: 'metric', from: 'before_after' } } }] }
    const r = validateSpec(bad)
    expect(r.valid).toBe(false)
    expect(r.errors.join()).toMatch(/before|after/)
  })
  it('块的 slot 不在 layout.slots 里报错', () => {
    const bad = { ...goodSpec, blocks: [{ ...goodSpec.blocks[0], slot: 'ghost' }] }
    const r = validateSpec(bad)
    expect(r.valid).toBe(false)
    expect(r.errors.join()).toMatch(/slot/)
  })
  it('未知 palette 报错', () => {
    const bad = { ...goodSpec, blocks: [{ ...goodSpec.blocks[0], palette: 'rainbow' }] }
    const r = validateSpec(bad)
    expect(r.valid).toBe(false)
    expect(r.errors.join()).toMatch(/palette/)
  })
  it('数据源不在白名单报错', () => {
    const bad = { ...goodSpec, blocks: [{ ...goodSpec.blocks[0], encoding: { category: { field: 'metric', from: 'evil' }, before: { field: 'before' }, after: { field: 'after' } } }] }
    const r = validateSpec(bad)
    expect(r.valid).toBe(false)
    expect(r.errors.join()).toMatch(/from|数据源/)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- vizgrammar-validate`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: 写实现**

```js
// src/modules/practice/vizgrammar/validate.js
// Spec 结构校验:确保一棵 Spec 完全落在 schema 约束内。
// 既是渲染前的防线,也是防 AI 输出污染/注入的安全闸(设计文档第 10 节)。
import { MARKS, BLOCK_KINDS, DATA_SOURCES, PALETTES, MARK_ENCODINGS } from './schema'

export function validateSpec(spec) {
  const errors = []

  if (!spec || typeof spec !== 'object') {
    return { valid: false, errors: ['spec 必须是对象'] }
  }

  const layout = spec.layout
  if (!layout || layout.type !== 'grid' || !Array.isArray(layout.slots)) {
    errors.push('layout 必须是 { type: "grid", slots: [...] }')
  }
  const slots = (layout && Array.isArray(layout.slots)) ? layout.slots : []

  if (!Array.isArray(spec.blocks)) {
    errors.push('blocks 必须是数组')
    return { valid: errors.length === 0, errors }
  }

  spec.blocks.forEach((block, i) => {
    const at = `blocks[${i}]`
    if (!BLOCK_KINDS.includes(block.kind)) {
      errors.push(`${at}.kind 非法:${block.kind}`)
    }
    if (!slots.includes(block.slot)) {
      errors.push(`${at}.slot "${block.slot}" 不在 layout.slots 内`)
    }

    if (block.kind === 'chart') {
      if (!MARKS.includes(block.mark)) {
        errors.push(`${at}.mark 非法:${block.mark}`)
      }
      const required = MARK_ENCODINGS[block.mark] || []
      const encoding = block.encoding || {}
      required.forEach((ch) => {
        if (!encoding[ch] || typeof encoding[ch].field !== 'string') {
          errors.push(`${at}.encoding 缺少通道 "${ch}"(mark=${block.mark})`)
        }
      })
      Object.entries(encoding).forEach(([ch, def]) => {
        if (def && def.from && !DATA_SOURCES.includes(def.from)) {
          errors.push(`${at}.encoding.${ch}.from 数据源非法:${def.from}`)
        }
      })
      if (block.palette && !PALETTES[block.palette]) {
        errors.push(`${at}.palette 非法:${block.palette}`)
      }
    }
  })

  return { valid: errors.length === 0, errors }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- vizgrammar-validate`
Expected: PASS,7 个用例全绿。

- [ ] **Step 5: 提交**

```bash
git add src/modules/practice/vizgrammar/validate.js src/__tests__/vizgrammar-validate.test.js
git commit -m "feat(vizgrammar): Spec 结构校验 validateSpec"
```

---

## Task 4: renderer.js — bar 组装

**Files:**
- Create: `src/modules/practice/vizgrammar/renderer.js`
- Test: `src/__tests__/vizgrammar-renderer.test.js`

- [ ] **Step 1: 写失败测试**

```js
// src/__tests__/vizgrammar-renderer.test.js
import { describe, it, expect } from 'vitest'
import { buildBar } from '@/modules/practice/vizgrammar/renderer'

const rows = [
  { label: '走访户数', value: 128 },
  { label: '活动场次', value: 12 },
]

describe('buildBar', () => {
  const enc = { x: { field: 'label', from: 'metrics' }, y: { field: 'value' } }
  it('x 轴取 category 列', () => {
    const opt = buildBar(rows, enc, ['#6b8e5a'])
    expect(opt.xAxis.data).toEqual(['走访户数', '活动场次'])
    expect(opt.xAxis.type).toBe('category')
  })
  it('series 是 bar 且数据取 y 列', () => {
    const opt = buildBar(rows, enc, ['#6b8e5a'])
    expect(opt.series[0].type).toBe('bar')
    expect(opt.series[0].data).toEqual([128, 12])
  })
  it('color 用传入的调色板', () => {
    expect(buildBar(rows, enc, ['#6b8e5a']).color).toEqual(['#6b8e5a'])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- vizgrammar-renderer`
Expected: FAIL — `buildBar` 未导出。

- [ ] **Step 3: 写实现**

```js
// src/modules/practice/vizgrammar/renderer.js
// 禁飞区②:遍历 Spec 树,把每个原子零件翻译成 ECharts option / 布局。纯函数。
import { pluckColumn } from './result-charts'

// bar:x 通道 → 类目轴,y 通道 → 数值系列
export function buildBar(rows, encoding, palette) {
  return {
    color: palette,
    tooltip: {},
    xAxis: { type: 'category', data: pluckColumn(rows, encoding.x.field) },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: pluckColumn(rows, encoding.y.field) }],
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- vizgrammar-renderer`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/modules/practice/vizgrammar/renderer.js src/__tests__/vizgrammar-renderer.test.js
git commit -m "feat(vizgrammar): renderer buildBar 柱状图组装"
```

---

## Task 5: renderer.js — dumbbell(帮扶前后对比,旗舰)组装

**Files:**
- Modify: `src/modules/practice/vizgrammar/renderer.js`
- Test: `src/__tests__/vizgrammar-renderer.test.js`(追加)

- [ ] **Step 1: 追加失败测试**

在 `vizgrammar-renderer.test.js` 顶部 import 改为:

```js
import { buildBar, buildDumbbell } from '@/modules/practice/vizgrammar/renderer'
```

追加:

```js
describe('buildDumbbell', () => {
  const baRows = [
    { metric: '月销量', before: 200, after: 450 },
    { metric: '村集体收入', before: 3, after: 8 },
  ]
  const enc = { category: { field: 'metric', from: 'before_after' }, before: { field: 'before' }, after: { field: 'after' } }

  it('y 轴取 category 列', () => {
    const opt = buildDumbbell(baRows, enc, ['#6b8e5a', '#e0785a'])
    expect(opt.yAxis.type).toBe('category')
    expect(opt.yAxis.data).toEqual(['月销量', '村集体收入'])
  })
  it('两个系列分别对应前值与后值', () => {
    const opt = buildDumbbell(baRows, enc, ['#6b8e5a', '#e0785a'])
    const before = opt.series.find((s) => s.name === '实践前')
    const after = opt.series.find((s) => s.name === '实践后')
    expect(before.data).toEqual([200, 3])
    expect(after.data).toEqual([450, 8])
  })
  it('数值轴横置(xAxis 为 value)', () => {
    expect(buildDumbbell(baRows, enc, ['#6b8e5a', '#e0785a']).xAxis.type).toBe('value')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- vizgrammar-renderer`
Expected: FAIL — `buildDumbbell` 未导出。

- [ ] **Step 3: 写实现(追加到 renderer.js)**

```js
// dumbbell:帮扶前后对比。类目横置在 y 轴,前/后两个散点系列在数值 x 轴上形成「哑铃」。
export function buildDumbbell(rows, encoding, palette) {
  return {
    color: palette,
    tooltip: {},
    legend: { data: ['实践前', '实践后'] },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: pluckColumn(rows, encoding.category.field) },
    series: [
      { name: '实践前', type: 'scatter', symbolSize: 16, data: pluckColumn(rows, encoding.before.field) },
      { name: '实践后', type: 'scatter', symbolSize: 16, data: pluckColumn(rows, encoding.after.field) },
    ],
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- vizgrammar-renderer`
Expected: PASS,buildBar + buildDumbbell 全绿。

- [ ] **Step 5: 提交**

```bash
git add src/modules/practice/vizgrammar/renderer.js src/__tests__/vizgrammar-renderer.test.js
git commit -m "feat(vizgrammar): renderer buildDumbbell 帮扶前后对比"
```

---

## Task 6: renderer.js — renderSpec 编排(遍历整棵 Spec 树)

**Files:**
- Modify: `src/modules/practice/vizgrammar/renderer.js`
- Test: `src/__tests__/vizgrammar-renderer.test.js`(追加)

- [ ] **Step 1: 追加失败测试**

import 改为:

```js
import { buildBar, buildDumbbell, renderSpec } from '@/modules/practice/vizgrammar/renderer'
```

追加:

```js
describe('renderSpec', () => {
  const data = {
    before_after: [{ metric: '月销量', before: 200, after: 450 }],
    metrics: [{ label: '走访户数', value: 128 }],
  }
  const spec = {
    layout: { type: 'grid', slots: ['hero', 'side', 'body'] },
    blocks: [
      { slot: 'hero', kind: 'chart', mark: 'dumbbell',
        encoding: { category: { field: 'metric', from: 'before_after' }, before: { field: 'before' }, after: { field: 'after' } },
        annotations: [{ at: '月销量', text: '翻倍', emphasis: true }], palette: 'earth-green' },
      { slot: 'side', kind: 'chart', mark: 'bar',
        encoding: { x: { field: 'label', from: 'metrics' }, y: { field: 'value' } } },
      { slot: 'body', kind: 'narrative', source: 'narrate', content: null },
    ],
  }

  it('透传 layout', () => {
    expect(renderSpec(spec, data).layout).toEqual(spec.layout)
  })
  it('chart 块产出带 option 的结果,按 mark 分派', () => {
    const out = renderSpec(spec, data)
    const hero = out.blocks.find((b) => b.slot === 'hero')
    expect(hero.kind).toBe('chart')
    expect(hero.mark).toBe('dumbbell')
    expect(hero.option.yAxis.data).toEqual(['月销量'])
  })
  it('bar 块用对应数据源', () => {
    const side = renderSpec(spec, data).blocks.find((b) => b.slot === 'side')
    expect(side.option.series[0].data).toEqual([128])
  })
  it('annotations 透传到结果块', () => {
    const hero = renderSpec(spec, data).blocks.find((b) => b.slot === 'hero')
    expect(hero.annotations).toEqual([{ at: '月销量', text: '翻倍', emphasis: true }])
  })
  it('narrative 块透传 content,不产 option', () => {
    const body = renderSpec(spec, data).blocks.find((b) => b.slot === 'body')
    expect(body.kind).toBe('narrative')
    expect(body.option).toBeUndefined()
    expect('content' in body).toBe(true)
  })
  it('缺省 palette 用默认色板', () => {
    const side = renderSpec(spec, data).blocks.find((b) => b.slot === 'side')
    expect(Array.isArray(side.option.color)).toBe(true)
    expect(side.option.color.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- vizgrammar-renderer`
Expected: FAIL — `renderSpec` 未导出。

- [ ] **Step 3: 写实现(追加到 renderer.js)**

在 renderer.js 顶部把 import 补全:

```js
import { pluckColumn, resolveSource } from './result-charts'
import { PALETTES, DEFAULT_PALETTE } from './schema'
```

追加编排函数:

```js
// 按 mark 分派到对应的 option 组装器
const CHART_BUILDERS = { bar: buildBar, dumbbell: buildDumbbell }

// 禁飞区②主入口:遍历 Spec 树,逐块渲染。假定 spec 已通过 validateSpec。
export function renderSpec(spec, data) {
  const blocks = (spec.blocks || []).map((block) => {
    if (block.kind === 'chart') {
      const rows = resolveSource(block.encoding, data)
      const palette = PALETTES[block.palette] || PALETTES[DEFAULT_PALETTE]
      const build = CHART_BUILDERS[block.mark]
      return {
        slot: block.slot,
        kind: 'chart',
        mark: block.mark,
        option: build(rows, block.encoding, palette),
        annotations: block.annotations || [],
      }
    }
    // narrative(及未来非图表块):透传 content 占位,由 AI 层填充
    return { slot: block.slot, kind: block.kind, content: block.content ?? null }
  })

  return { layout: spec.layout, blocks }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- vizgrammar-renderer`
Expected: PASS,全部 renderer 用例绿。

- [ ] **Step 5: 提交**

```bash
git add src/modules/practice/vizgrammar/renderer.js src/__tests__/vizgrammar-renderer.test.js
git commit -m "feat(vizgrammar): renderSpec 遍历 Spec 树按 mark 分派渲染"
```

---

## Task 7: 端到端集成测试(validate + render 一条链)

**Files:**
- Create: `src/modules/practice/vizgrammar/__fixtures__/sample-result.js`
- Test: `src/__tests__/vizgrammar-integration.test.js`

- [ ] **Step 1: 写 fixture**

```js
// src/modules/practice/vizgrammar/__fixtures__/sample-result.js
// 一份手写的样例:结构化成果数据 + 一棵合法 Spec。用于集成测试与后续 Studio 联调。
export const sampleData = {
  metrics: [
    { label: '走访户数', value: 128, unit: '户' },
    { label: '活动场次', value: 12, unit: '场' },
  ],
  before_after: [
    { metric: '月销量', before: 200, after: 450, unit: '件' },
    { metric: '村集体收入', before: 3, after: 8, unit: '万元' },
  ],
}

export const sampleSpec = {
  layout: { type: 'grid', slots: ['hero', 'side', 'body'] },
  blocks: [
    {
      slot: 'hero', kind: 'chart', mark: 'dumbbell',
      encoding: {
        category: { field: 'metric', from: 'before_after' },
        before: { field: 'before' },
        after: { field: 'after' },
      },
      annotations: [{ at: '月销量', text: '翻倍', emphasis: true }],
      palette: 'earth-green',
    },
    {
      slot: 'side', kind: 'chart', mark: 'bar',
      encoding: { x: { field: 'label', from: 'metrics' }, y: { field: 'value' } },
      palette: 'coral',
    },
    { slot: 'body', kind: 'narrative', source: 'narrate', content: null },
  ],
}
```

- [ ] **Step 2: 写失败测试**

```js
// src/__tests__/vizgrammar-integration.test.js
import { describe, it, expect } from 'vitest'
import { validateSpec } from '@/modules/practice/vizgrammar/validate'
import { renderSpec } from '@/modules/practice/vizgrammar/renderer'
import { sampleData, sampleSpec } from '@/modules/practice/vizgrammar/__fixtures__/sample-result'

describe('vizgrammar 端到端', () => {
  it('样例 Spec 通过校验', () => {
    expect(validateSpec(sampleSpec)).toEqual({ valid: true, errors: [] })
  })
  it('校验通过后可渲染出三块,mark 正确', () => {
    const { valid } = validateSpec(sampleSpec)
    expect(valid).toBe(true)
    const out = renderSpec(sampleSpec, sampleData)
    expect(out.blocks.map((b) => b.slot)).toEqual(['hero', 'side', 'body'])
    expect(out.blocks[0].option.series).toHaveLength(2) // dumbbell 前/后
    expect(out.blocks[1].option.series[0].type).toBe('bar')
    expect(out.blocks[2].kind).toBe('narrative')
  })
  it('DIY 场景:改 Spec 换轴后仍合法且渲染变化', () => {
    const edited = JSON.parse(JSON.stringify(sampleSpec))
    edited.blocks[1].palette = 'neutral'
    expect(validateSpec(edited).valid).toBe(true)
    const out = renderSpec(edited, sampleData)
    expect(out.blocks[1].option.color).toEqual(['#7a7a7a', '#a0a0a0', '#c8c8c8'])
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npm test -- vizgrammar-integration`
Expected: FAIL — fixture 模块首次运行前若拼错路径会报解析失败;正常应因断言未满足或模块缺失而失败。

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- vizgrammar-integration`
Expected: PASS,3 个集成用例全绿(实现已在 Task 1-6 完成,本任务只加 fixture 与集成断言)。

- [ ] **Step 5: 跑全量测试确认无回归**

Run: `npm test`
Expected: 现有全部测试 + 新增 vizgrammar 四个测试文件全绿,无回归。

- [ ] **Step 6: 提交**

```bash
git add src/modules/practice/vizgrammar/__fixtures__/sample-result.js src/__tests__/vizgrammar-integration.test.js
git commit -m "test(vizgrammar): validate→render 端到端集成测试与样例 fixture"
```

---

## 完成标准

- `src/modules/practice/vizgrammar/` 下四个模块 + fixture 全部就位。
- `npm test` 全绿,无回归。
- 能力自证:给定一份结构化成果数据 + 一棵手写 Spec,`validateSpec` 判合法、`renderSpec` 产出可交给 ECharts 的 option 树;非法 Spec(坏 mark / 缺通道 / 越界数据源 / 坏配色)被 `validateSpec` 拦下。
- 这套语法核心即禁飞区②与约束边界,可独立于服务器与 AI 层演示与讲解。

## 后续计划衔接(不在本计划范围)

- **Plan 2 服务器地基**:Express + SQLite + JWT(禁飞区③)+ 上传 + 文档解析。
- **Plan 3 AI 层**:extract + compile(禁飞区①,产出的 Spec 必须过本计划的 `validateSpec`)+ narrate。
- **Plan 4 搭建台 UI**:ResultStudioView/ResultView 消费本计划的 `renderSpec`,实现「上传→意图→渲染→DIY 微调」闭环。
