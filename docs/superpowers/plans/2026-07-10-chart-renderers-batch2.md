# 图表渲染补全 — 第二批 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为雷达图、时间轴、数据表 3 个占位组件实现真实渲染——雷达图走 chart 子类型 SVG，时间轴和数据表走独立 type HTML。

**Architecture:** 雷达图在 `chartRenderer.js` 中新增解析器+渲染器+dispatch case；时间轴和数据表各自新建 renderer 文件（HTML），在 `componentFactory.js` 注册新 type，在 `EditorCanvas.vue` / `buildPreview.js` / `PropertyPanel.vue` 中新增对应的渲染分支和编辑区。不改动 `stageEditor.js` 和 `sensorRenderer.js`。

**Tech Stack:** JavaScript (ESM), SVG（雷达图纯字符串拼接）, HTML + inline CSS（时间轴/数据表）, Vue 3（PropertyPanel 模板）

## Global Constraints

- 零依赖，不引入第三方图表库或表格库
- 雷达图复用现有 `COLORS` 色板
- 时间轴和数据表为纯 HTML 渲染（非 SVG）
- CSV 解析向后兼容——无效数据返回空结果不报错
- 不改动 `stageEditor.js`、后端 API、`sensorRenderer.js`

---

## 文件结构

| 文件 | 职责 | 操作 |
|------|------|------|
| `src/modules/builder/editor/chartRenderer.js` | 雷达图解析器+渲染器+dispatch case | 修改 |
| `src/modules/builder/editor/componentFactory.js` | 新增 timeline/datatable type + radar 默认 CSV | 修改 |
| `src/modules/builder/editor/timelineRenderer.js` | 时间轴 HTML 渲染器 | **新建** |
| `src/modules/builder/editor/datatableRenderer.js` | 数据表 HTML 渲染器 | **新建** |
| `src/modules/builder/editor/EditorCanvas.vue` | 渲染 switch + 工具栏按钮 | 修改 |
| `src/modules/builder/editor/PropertyPanel.vue` | 雷达图 chartType 选项 + timeline/datatable 编辑区 | 修改 |
| `src/modules/builder/editor/buildPreview.js` | 渲染 switch 新增 timeline/datatable case | 修改 |
| `src/modules/builder/editor/ComponentLibrary.vue` | 3 个条目的 type/chartType 修正 | 修改 |
| `src/modules/builder/display/DisplayComponentLibrary.vue` | 同上 | 修改 |
| `src/__tests__/builder-chartRenderer.test.js` | 雷达图解析器+渲染器测试 | 修改 |
| `src/__tests__/builder-timelineRenderer.test.js` | 时间轴渲染器测试 | **新建** |
| `src/__tests__/builder-datatableRenderer.test.js` | 数据表渲染器测试 | **新建** |

---

### Task 1: 雷达图 — 解析器 + 渲染器 + 测试 + 分发 + 工厂

**Files:**
- Modify: `src/modules/builder/editor/chartRenderer.js`
- Modify: `src/modules/builder/editor/componentFactory.js`
- Modify: `src/__tests__/builder-chartRenderer.test.js`

**Interfaces:**
- Produces: `parseCSVRadar(csvText)` → `{ labels: string[], dimensions: string[], series: { name: string, values: number[] }[] }`
- Produces: `renderRadarChart(data, w, h, { title })` → SVG string
- Modifies: `renderChartSvg(component)` — switch 新增 `case 'radar'`
- Modifies: `defaultCsvFor(chartType)` — 新增 `case 'radar'`

- [ ] **Step 1: 写雷达图解析器+渲染器测试**

追加到 `src/__tests__/builder-chartRenderer.test.js` 文件末尾：

```js
describe('parseCSVRadar', () => {
  it('parses multi-dimension CSV into labels, dimensions, and series', () => {
    const csv = 'label,产业兴旺,生态宜居,乡风文明\n李家村,80,65,72\n全县平均,60,55,58'
    const result = parseCSVRadar(csv)
    expect(result.labels).toEqual(['李家村', '全县平均'])
    expect(result.dimensions).toEqual(['产业兴旺', '生态宜居', '乡风文明'])
    expect(result.series).toHaveLength(2)
    expect(result.series[0].name).toBe('李家村')
    expect(result.series[0].values).toEqual([80, 65, 72])
    expect(result.series[1].name).toBe('全县平均')
    expect(result.series[1].values).toEqual([60, 55, 58])
  })

  it('returns empty data for insufficient columns', () => {
    const csv = 'label,onlyone\n李家村,80'
    expect(parseCSVRadar(csv).dimensions).toEqual([])
    expect(parseCSVRadar('').dimensions).toEqual([])
  })

  it('returns empty data when label column is missing', () => {
    const csv = 'name,a,b\nA,10,20'
    expect(parseCSVRadar(csv).dimensions).toEqual([])
  })
})

describe('renderRadarChart', () => {
  it('returns SVG with polygon and axis lines', () => {
    const data = {
      labels: ['李家村', '全县平均'],
      dimensions: ['产业兴旺', '生态宜居', '乡风文明', '治理有效', '生活富裕'],
      series: [
        { name: '李家村', values: [80, 65, 72, 88, 70] },
        { name: '全县平均', values: [60, 55, 58, 62, 50] },
      ],
    }
    const svg = renderRadarChart(data, 520, 380, { title: '五维画像' })
    expect(svg).toContain('<svg')
    expect(svg).toContain('五维画像')
    // Should have 2 polygons (one per series)
    expect(svg.match(/<polygon/g).length).toBe(2)
    // Should have 5 axis lines (one per dimension)
    expect(svg.match(/<line/g).length).toBeGreaterThanOrEqual(5)
    // Should have dimension labels
    expect(svg).toContain('产业兴旺')
    expect(svg).toContain('生态宜居')
    // Should have legend
    expect(svg).toContain('李家村')
    expect(svg).toContain('全县平均')
  })

  it('handles single series', () => {
    const data = {
      labels: ['李家村'],
      dimensions: ['A', 'B', 'C'],
      series: [{ name: '李家村', values: [50, 60, 70] }],
    }
    const svg = renderRadarChart(data, 400, 300, {})
    expect(svg).toContain('<svg')
    expect(svg.match(/<polygon/g).length).toBe(1)
  })
})
```

同时，在文件顶部的 import 语句中加入 `parseCSVRadar` 和 `renderRadarChart`：

```js
import {
  parseCSV,
  parseCSVMultiSeries,
  parseCSVDumbbell,
  parseCSVTrendBadge,
  parseCSVRadar,
  renderBarChart,
  renderPieChart,
  renderLineChart,
  renderStackedBarChart,
  renderDumbbellChart,
  renderTrendBadge,
  renderRadarChart,
  renderChartSvg,
} from '../modules/builder/editor/chartRenderer.js'
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/__tests__/builder-chartRenderer.test.js
```

Expected: FAIL — `parseCSVRadar is not defined` / `renderRadarChart is not defined`

- [ ] **Step 3: 在 chartRenderer.js 添加 parseCSVRadar**

在 `parseCSVTrendBadge` 函数之后插入（`parseCSV` 函数之前或之后任意位置）：

```js
export function parseCSVRadar(csvText) {
  const lines = csvText.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return { labels: [], dimensions: [], series: [] }
  const headers = lines[0].split(',').map(h => h.trim())
  const labelIdx = headers.indexOf('label')
  if (labelIdx === -1) return { labels: [], dimensions: [], series: [] }

  const dimensions = headers.filter((_, i) => i !== labelIdx)
  if (dimensions.length < 2) return { labels: [], dimensions: [], series: [] }

  const labels = []
  const series = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim())
    labels.push(cols[labelIdx] || '')
    const values = dimensions.map((_, di) => {
      const colIdx = headers.indexOf(dimensions[di])
      return parseFloat(cols[colIdx]) || 0
    })
    series.push({ name: cols[labelIdx] || '', values })
  }

  return { labels, dimensions, series }
}
```

- [ ] **Step 4: 在 chartRenderer.js 添加 renderRadarChart**

在 `renderTrendBadge` 函数之后插入：

```js
export function renderRadarChart(data, w, h, { title = '' } = {}) {
  const { dimensions, series } = data
  const n = dimensions.length
  if (n < 3) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" fill="#f8fbfd"/>
      <text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-size="14" fill="#687b8b">无数据</text>
    </svg>`
  }

  const cx = w / 2
  const cy = h / 2 + (title ? 14 : 0)
  const r = Math.min(w, h) / 2 - 52
  const innerR = r * 0.15
  const dataR = r - innerR
  const levels = 5
  const labelR = r + 18

  // 所有数据中的最大值，向上取整
  const allVals = series.flatMap(s => s.values)
  const maxVal = Math.max(...allVals, 1)
  const ceilMax = maxVal <= 1 ? 1
    : maxVal <= 10 ? Math.ceil(maxVal)
    : Math.ceil(maxVal / Math.pow(10, Math.floor(Math.log10(maxVal)) - 1))
      * Math.pow(10, Math.floor(Math.log10(maxVal)) - 1)

  // 同心多边形环 (虚线)
  let rings = ''
  for (let level = 1; level <= levels; level++) {
    const lr = innerR + (dataR * level) / levels
    const pts = []
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
      pts.push(`${cx + lr * Math.cos(angle)},${cy + lr * Math.sin(angle)}`)
    }
    rings += `<polygon points="${pts.join(' ')}" fill="none" stroke="rgba(101,126,152,0.1)" stroke-dasharray="3,3"/>`
    // 刻度值——标在第一条轴左侧
    const val = Math.round((ceilMax / levels) * level)
    const labelAngle = -Math.PI / 2
    const lx = cx + (lr + 2) * Math.cos(labelAngle)
    const ly = cy + (lr + 2) * Math.sin(labelAngle)
    rings += `<text x="${lx - 8}" y="${ly + 4}" text-anchor="end" font-size="9" fill="#687b8b">${val}</text>`
  }

  // 轴线 (从 innerR 到 r)
  let axes = ''
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
    const x1 = cx + innerR * Math.cos(angle)
    const y1 = cy + innerR * Math.sin(angle)
    const x2 = cx + r * Math.cos(angle)
    const y2 = cy + r * Math.sin(angle)
    axes += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(101,126,152,0.2)" stroke-width="1"/>`
  }

  // 维度标签
  let dimLabels = ''
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
    const lx = cx + labelR * Math.cos(angle)
    const ly = cy + labelR * Math.sin(angle)
    const anchor = angle > Math.PI / 2 || angle < -Math.PI / 2 ? 'end' : 'start'
    const fontSize = n >= 6 ? 10 : 12
    dimLabels += `<text x="${lx}" y="${ly + 4}" text-anchor="${anchor}" font-size="${fontSize}" fill="#627586" font-weight="500">${dimensions[i]}</text>`
  }

  // 数据多边形 + 数据点
  let polys = ''
  series.forEach((s, si) => {
    const color = COLORS[si % COLORS.length]
    const pts = []
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
      const dist = innerR + (s.values[i] / ceilMax) * dataR
      pts.push(`${cx + dist * Math.cos(angle)},${cy + dist * Math.sin(angle)}`)
    }
    // 填充多边形
    polys += `<polygon points="${pts.join(' ')}" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`
    // 数据点
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
      const dist = innerR + (s.values[i] / ceilMax) * dataR
      polys += `<circle cx="${cx + dist * Math.cos(angle)}" cy="${cy + dist * Math.sin(angle)}" r="3.5" fill="${color}" stroke="#fff" stroke-width="1"/>`
    }
  })

  // 图例 —— 底部居中
  let legend = ''
  const legendY = h - 14
  const totalLegendW = series.length * 100 - 10
  const legendStartX = cx - totalLegendW / 2
  series.forEach((s, i) => {
    const lx = legendStartX + i * 100
    legend += `<rect x="${lx}" y="${legendY - 6}" width="10" height="10" rx="2" fill="${COLORS[i % COLORS.length]}"/>`
    legend += `<text x="${lx + 14}" y="${legendY + 2}" font-size="10" fill="#627586">${s.name}</text>`
  })

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="#1c2834">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fafdfe"/>
    ${titleSvg}
    ${rings}
    ${axes}
    ${dimLabels}
    ${polys}
    ${legend}
  </svg>`
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
npx vitest run src/__tests__/builder-chartRenderer.test.js
```

Expected: PASS（parseCSVRadar + renderRadarChart 相关测试）

- [ ] **Step 6: 在 renderChartSvg 中添加 radar case**

在 `renderChartSvg` 函数的 switch 中，`case 'trend-badge'` 之后、`case 'bar'` 之前插入：

```js
    case 'radar': {
      const data = parseCSVRadar(props.csvText)
      return data.dimensions.length ? renderRadarChart(data, width, height, opts) : emptySvg
    }
```

- [ ] **Step 7: 在 componentFactory.js 的 defaultCsvFor 中添加 radar**

在 `defaultCsvFor` 函数的 switch 中，`case 'trend-badge'` 之后插入：

```js
    case 'radar':
      return 'label,产业兴旺,生态宜居,乡风文明,治理有效,生活富裕\n李家村,80,65,72,88,70\n全县平均,60,55,58,62,50'
```

- [ ] **Step 8: 提交**

```bash
git add src/modules/builder/editor/chartRenderer.js src/modules/builder/editor/componentFactory.js src/__tests__/builder-chartRenderer.test.js
git commit -m "feat: add radar chart renderer with multi-series spider/axis SVG"
```

---

### Task 2: 时间轴 — renderer + factory + 测试

**Files:**
- Create: `src/modules/builder/editor/timelineRenderer.js`
- Modify: `src/modules/builder/editor/componentFactory.js`
- Create: `src/__tests__/builder-timelineRenderer.test.js`

**Interfaces:**
- Produces: `renderTimelineMarkup(component)` → HTML string
- Produces: `createTimelineComponent(x, y)` → component object

- [ ] **Step 1: 创建时间轴渲染器测试**

创建文件 `src/__tests__/builder-timelineRenderer.test.js`：

```js
import { describe, it, expect } from 'vitest'
import { renderTimelineMarkup } from '../modules/builder/editor/timelineRenderer.js'

describe('renderTimelineMarkup', () => {
  const makeComponent = (overrides = {}) => ({
    type: 'timeline',
    width: 600,
    height: 360,
    props: {
      title: '发展历程',
      events: [
        { date: '2020-03', title: '驻村工作队进驻', description: '3名队员入驻' },
        { date: '2021-06', title: '茶叶合作社成立', description: '带动86户农户' },
      ],
      ...overrides,
    },
  })

  it('returns HTML with timeline structure', () => {
    const html = renderTimelineMarkup(makeComponent())
    expect(html).toContain('发展历程')
    expect(html).toContain('驻村工作队进驻')
    expect(html).toContain('3名队员入驻')
    expect(html).toContain('茶叶合作社成立')
    expect(html).toContain('2020-03')
    expect(html).toContain('2021-06')
  })

  it('renders event cards with alternating positions', () => {
    const html = renderTimelineMarkup(makeComponent())
    // Should have event container elements
    expect(html.match(/timeline-event/g).length).toBeGreaterThanOrEqual(2)
  })

  it('handles empty events gracefully', () => {
    const comp = makeComponent({ events: [] })
    const html = renderTimelineMarkup(comp)
    expect(html).toContain('暂无事件')
  })

  it('handles single event', () => {
    const comp = makeComponent({
      events: [{ date: '2020-03', title: '唯一事件', description: '描述' }],
    })
    const html = renderTimelineMarkup(comp)
    expect(html).toContain('唯一事件')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/__tests__/builder-timelineRenderer.test.js
```

Expected: FAIL — `Cannot find module .../timelineRenderer.js`

- [ ] **Step 3: 创建 timelineRenderer.js**

创建文件 `src/modules/builder/editor/timelineRenderer.js`：

```js
// src/modules/builder/editor/timelineRenderer.js

const COLORS = [
  '#2f80ed', '#56ccf2', '#6fcf97', '#f2c94c',
  '#9b51e0', '#eb5757', '#f2994a', '#2c7da0',
  '#6fcf97', '#5d9cec',
]

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderTimelineMarkup(component) {
  const { props, width, height } = component
  const { title, events } = props

  if (!events || events.length === 0) {
    return `
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fafdfe;border-radius:14px;border:1px solid rgba(44,125,160,0.08);color:#687b8b;font-size:14px;">
        暂无事件
      </div>`
  }

  const n = events.length
  const lineY = height * 0.38
  const cardW = Math.min(200, (width - 40) / Math.max(n, 1) - 16)
  const stepX = (width - 20) / Math.max(n, 1)

  let eventHtml = ''
  events.forEach((ev, i) => {
    const cx = 10 + stepX * i + stepX / 2
    const isAbove = i % 2 === 0
    const color = COLORS[i % COLORS.length]
    const cardTop = isAbove ? 12 : lineY + 28
    const cardH = Math.min(80, (height - lineY - 40))

    eventHtml += `
      <div class="timeline-event" style="position:absolute;left:${cx}px;top:0;width:0;height:100%;pointer-events:none;">
        <!-- connector line from dot to card -->
        <div style="position:absolute;left:0;top:${isAbove ? cardTop + cardH : lineY}px;width:1px;height:${isAbove ? lineY - cardTop - cardH : cardTop - lineY}px;background:${color};opacity:0.3;transform:translateX(-0.5px);"></div>
        <!-- dot on timeline -->
        <div style="position:absolute;left:-7px;top:${lineY - 7}px;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 3px ${color}22;pointer-events:auto;"></div>
        <!-- card -->
        <div style="position:absolute;left:${-cardW / 2}px;top:${cardTop}px;width:${cardW}px;background:rgba(44,125,160,0.03);border:1px solid rgba(44,125,160,0.06);border-radius:10px;padding:10px 12px;pointer-events:auto;">
          <div style="font-size:10px;color:#687b8b;margin-bottom:3px;">${esc(ev.date)}</div>
          <div style="font-size:13px;font-weight:700;color:#1c2834;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(ev.title)}</div>
          <div style="font-size:11px;color:#627586;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(ev.description)}</div>
        </div>
      </div>`
  })

  // 时间轴线
  const lineHtml = `<div style="position:absolute;left:20px;right:20px;top:${lineY}px;height:2px;background:#a5d7e4;border-radius:1px;"></div>`

  let titleHtml = ''
  if (title) {
    titleHtml = `<h3 style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1c2834;padding:0 4px;">${esc(title)}</h3>`
  }

  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;padding:16px 20px;box-sizing:border-box;overflow:hidden;background:#fafdfe;border-radius:14px;border:1px solid rgba(44,125,160,0.08);">
      ${titleHtml}
      <div style="flex:1;position:relative;min-height:0;">
        ${lineHtml}
        ${eventHtml}
      </div>
    </div>`
}
```

- [ ] **Step 4: 在 componentFactory.js 添加 timeline type**

在 `createComponent` 函数的 switch 中，`case 'agri-sensor'` 之前插入：

```js
    case 'timeline':    return createTimelineComponent(x, y)
```

在文件末尾 `createSensorComponent` 之前添加工厂函数：

```js
export function createTimelineComponent(x, y) {
  return {
    type: 'timeline',
    x, y,
    width: 600,
    height: 360,
    props: {
      title: '发展历程',
      events: [
        { date: '2020-03', title: '事件标题', description: '事件描述' },
        { date: '2021-06', title: '事件标题', description: '事件描述' },
        { date: '2022-12', title: '事件标题', description: '事件描述' },
      ],
    },
  }
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
npx vitest run src/__tests__/builder-timelineRenderer.test.js
```

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/modules/builder/editor/timelineRenderer.js src/modules/builder/editor/componentFactory.js src/__tests__/builder-timelineRenderer.test.js
git commit -m "feat: add timeline component type with HTML renderer and factory"
```

---

### Task 3: 数据表 — renderer + factory + 测试

**Files:**
- Create: `src/modules/builder/editor/datatableRenderer.js`
- Modify: `src/modules/builder/editor/componentFactory.js`
- Create: `src/__tests__/builder-datatableRenderer.test.js`

**Interfaces:**
- Produces: `renderDatatableMarkup(component)` → HTML string
- Produces: `createDatatableComponent(x, y)` → component object

- [ ] **Step 1: 创建数据表渲染器测试**

创建文件 `src/__tests__/builder-datatableRenderer.test.js`：

```js
import { describe, it, expect } from 'vitest'
import { renderDatatableMarkup } from '../modules/builder/editor/datatableRenderer.js'

describe('renderDatatableMarkup', () => {
  const makeComponent = (overrides = {}) => ({
    type: 'datatable',
    width: 560,
    height: 340,
    props: {
      title: '荣誉资质',
      columns: ['荣誉名称', '颁发单位', '时间'],
      rows: [
        ['全国文明村', '中央文明办', '2021'],
        ['省级美丽乡村', '省农业农村厅', '2022'],
      ],
      ...overrides,
    },
  })

  it('returns HTML table with header and data rows', () => {
    const html = renderDatatableMarkup(makeComponent())
    expect(html).toContain('荣誉资质')
    expect(html).toContain('<table')
    expect(html).toContain('<thead')
    expect(html).toContain('<tbody')
    expect(html).toContain('荣誉名称')
    expect(html).toContain('颁发单位')
    expect(html).toContain('全国文明村')
    expect(html).toContain('中央文明办')
    expect(html).toContain('省级美丽乡村')
  })

  it('renders alternating row backgrounds', () => {
    const html = renderDatatableMarkup(makeComponent())
    // Should have white and light blue rows
    expect(html).toContain('#ffffff')
    expect(html).toContain('rgba(44,125,160,0.03)')
  })

  it('handles empty rows gracefully', () => {
    const comp = makeComponent({ rows: [] })
    const html = renderDatatableMarkup(comp)
    expect(html).toContain('暂无数据')
  })

  it('handles empty columns gracefully', () => {
    const comp = makeComponent({ columns: [], rows: [] })
    const html = renderDatatableMarkup(comp)
    expect(html).toContain('暂无数据')
  })

  it('renders all columns and cells', () => {
    const comp = makeComponent({
      columns: ['A', 'B', 'C', 'D'],
      rows: [['1', '2', '3', '4']],
    })
    const html = renderDatatableMarkup(comp)
    expect(html.match(/<th/g).length).toBe(4)
    expect(html.match(/<td/g).length).toBe(4)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/__tests__/builder-datatableRenderer.test.js
```

Expected: FAIL — `Cannot find module .../datatableRenderer.js`

- [ ] **Step 3: 创建 datatableRenderer.js**

创建文件 `src/modules/builder/editor/datatableRenderer.js`：

```js
// src/modules/builder/editor/datatableRenderer.js

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderDatatableMarkup(component) {
  const { props, width, height } = component
  const { title, columns, rows } = props

  if (!columns || columns.length === 0 || !rows || rows.length === 0) {
    return `
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fafdfe;border-radius:14px;border:1px solid rgba(44,125,160,0.08);color:#687b8b;font-size:14px;">
        暂无数据
      </div>`
  }

  // 表头
  let headerCells = ''
  columns.forEach(col => {
    headerCells += `<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;">${esc(col)}</th>`
  })

  // 数据行
  let bodyRows = ''
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? '#ffffff' : 'rgba(44,125,160,0.03)'
    const hoverBg = 'rgba(44,125,160,0.06)'
    let cells = ''
    row.forEach((cell, ci) => {
      const val = ci < columns.length ? (cell || '') : ''
      cells += `<td style="padding:10px 14px;font-size:12px;color:#627586;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;">${esc(String(val))}</td>`
    })
    bodyRows += `<tr style="background:${bg};" onmouseenter="this.style.background='${hoverBg}'" onmouseleave="this.style.background='${bg}'">${cells}</tr>`
  })

  let titleHtml = ''
  if (title) {
    titleHtml = `<div style="padding:14px 16px 10px;border-bottom:1px solid rgba(44,125,160,0.06);"><h3 style="margin:0;font-size:15px;font-weight:700;color:#1c2834;">${esc(title)}</h3></div>`
  }

  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;background:#fafdfe;border-radius:14px;border:1px solid rgba(44,125,160,0.08);">
      ${titleHtml}
      <div style="flex:1;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;table-layout:auto;">
          <thead>
            <tr style="background:#245a73;position:sticky;top:0;">
              ${headerCells}
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
        </table>
      </div>
    </div>`
}
```

- [ ] **Step 4: 在 componentFactory.js 添加 datatable type**

在 `createComponent` 函数的 switch 中，`case 'agri-sensor'` 之前插入：

```js
    case 'datatable':   return createDatatableComponent(x, y)
```

在文件末尾 `createSensorComponent` 之前添加工厂函数：

```js
export function createDatatableComponent(x, y) {
  return {
    type: 'datatable',
    x, y,
    width: 560,
    height: 340,
    props: {
      title: '荣誉资质',
      columns: ['荣誉名称', '颁发单位', '时间'],
      rows: [
        ['示例荣誉', '示例单位', '2024'],
        ['示例荣誉', '示例单位', '2023'],
      ],
    },
  }
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
npx vitest run src/__tests__/builder-datatableRenderer.test.js
```

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/modules/builder/editor/datatableRenderer.js src/modules/builder/editor/componentFactory.js src/__tests__/builder-datatableRenderer.test.js
git commit -m "feat: add datatable component type with HTML table renderer and factory"
```

---

### Task 4: 接入 EditorCanvas 渲染分发 + 工具栏

**Files:**
- Modify: `src/modules/builder/editor/EditorCanvas.vue`

**Interfaces:**
- Adds: `case 'timeline'` and `case 'datatable'` to `renderComponentMarkup`
- Adds: toolbar buttons for timeline and datatable

- [ ] **Step 1: 在 EditorCanvas.vue 顶部 import 新的 renderers**

在 `<script setup>` 区域，`import { renderSensorMarkup } from './sensorRenderer.js'` 之后加入：

```js
import { renderTimelineMarkup } from './timelineRenderer.js'
import { renderDatatableMarkup } from './datatableRenderer.js'
```

- [ ] **Step 2: 在 renderComponentMarkup 的 switch 中添加新 case**

在 `case 'agri-sensor':` 之后、switch 结束之前，加入：

```js
    case 'timeline':
      inner = renderTimelineMarkup(c)
      break
    case 'datatable':
      inner = renderDatatableMarkup(c)
      break
```

定位方式：在 `case 'agri-sensor':` 块的 `break` 之后的前一个 `}` 之前。当前代码：

```js
    case 'agri-sensor':
      inner = renderSensorMarkup(c)
      break
  }
```

改为：

```js
    case 'agri-sensor':
      inner = renderSensorMarkup(c)
      break
    case 'timeline':
      inner = renderTimelineMarkup(c)
      break
    case 'datatable':
      inner = renderDatatableMarkup(c)
      break
  }
```

- [ ] **Step 3: 在工具栏添加按钮**

在「🌡 传感器」按钮之后（即 `addToCanvas('agri-sensor')` 按钮后），添加：

```html
<button class="tb-btn" @click="addToCanvas('timeline')">⏱ 时间轴</button>
<button class="tb-btn" @click="addToCanvas('datatable')">📋 数据表</button>
```

当前工具栏代码（约第 7-13 行）：

```html
<div class="ec-tb-left">
  <button class="tb-btn" @click="goBack" title="返回Hub">← 返回</button>
  <span class="tb-sep"></span>
  <button class="tb-btn" @click="addToCanvas('text')">T 文本</button>
  <button class="tb-btn" @click="addToCanvas('chart')">📊 图表</button>
  <button class="tb-btn" @click="addToCanvas('image')">🖼 图片</button>
  <button class="tb-btn" @click="addToCanvas('agri-sensor')">🌡 传感器</button>
</div>
```

改为：

```html
<div class="ec-tb-left">
  <button class="tb-btn" @click="goBack" title="返回Hub">← 返回</button>
  <span class="tb-sep"></span>
  <button class="tb-btn" @click="addToCanvas('text')">T 文本</button>
  <button class="tb-btn" @click="addToCanvas('chart')">📊 图表</button>
  <button class="tb-btn" @click="addToCanvas('image')">🖼 图片</button>
  <button class="tb-btn" @click="addToCanvas('agri-sensor')">🌡 传感器</button>
  <button class="tb-btn" @click="addToCanvas('timeline')">⏱ 时间轴</button>
  <button class="tb-btn" @click="addToCanvas('datatable')">📋 数据表</button>
</div>
```

- [ ] **Step 4: 手动验证渲染**

启动开发服务器，确认工具栏出现新按钮，点击时间轴和数据表按钮能在画布上渲染：

```bash
npm run dev
```

确认：
- 点击「⏱ 时间轴」→ 画布出现带时间线和事件卡片的组件
- 点击「📋 数据表」→ 画布出现带表头和数据的表格组件
- 点击「📊 图表」→ 仍然正常渲染柱状图

- [ ] **Step 5: 提交**

```bash
git add src/modules/builder/editor/EditorCanvas.vue
git commit -m "feat: wire timeline and datatable into EditorCanvas render dispatch and toolbar"
```

---

### Task 5: 接入 PropertyPanel（雷达图选项 + 时间轴 + 数据表编辑区）

**Files:**
- Modify: `src/modules/builder/editor/PropertyPanel.vue`

- [ ] **Step 1: 雷达图 — chartType 下拉添加选项**

在 chart 编辑区的 `<select v-model="comp.props.chartType">` 中，`trend-badge` 之后添加：

```html
<option value="radar">雷达图</option>
```

定位方式：找到 `<option value="trend-badge">涨跌徽标</option>`（约第 145 行），在其后添加一行。

- [ ] **Step 2: 时间轴 — 添加属性编辑区**

在 sensor 编辑区（`v-if="comp.type === 'agri-sensor'"`）之后，添加 timeline 编辑区。找到 sensor 编辑区结束的 `</div>` 标签，在其后插入：

```html
<!-- Timeline props -->
<div v-if="comp.type === 'timeline'" class="pp-section">
  <div class="pp-field">
    <label>标题</label>
    <input type="text" v-model="comp.props.title" />
  </div>
  <h4 class="pp-subtitle">
    事件列表
    <button class="pp-add" @click="addTimelineEvent(comp)">+ 添加事件</button>
  </h4>
  <div v-for="(ev, i) in comp.props.events" :key="i" class="pp-timeline-row">
    <div class="pp-timeline-fields">
      <input type="text" v-model="ev.date" placeholder="日期" class="pp-tl-date" />
      <input type="text" v-model="ev.title" placeholder="标题" class="pp-tl-title" />
    </div>
    <textarea v-model="ev.description" placeholder="描述" rows="2" class="pp-tl-desc"></textarea>
    <button class="pp-sr-del" @click="removeTimelineEvent(comp, i)">×</button>
  </div>
</div>
```

**注意：** sensor 编辑区的 `</div>` 是 `v-if="comp.type === 'agri-sensor'"` 对应的结束标签。新 timeline 块放在这个 `</div>` 之后、`</template>` 之前。

- [ ] **Step 3: 数据表 — 添加属性编辑区**

在 timeline 编辑区之后，添加 datatable 编辑区：

```html
<!-- Datatable props -->
<div v-if="comp.type === 'datatable'" class="pp-section">
  <div class="pp-field">
    <label>标题</label>
    <input type="text" v-model="comp.props.title" />
  </div>
  <h4 class="pp-subtitle">
    列定义
    <button class="pp-add" @click="addDatatableColumn(comp)">+ 添加列</button>
  </h4>
  <div class="pp-dt-columns">
    <div v-for="(col, ci) in comp.props.columns" :key="'col'+ci" class="pp-dt-col-item">
      <input type="text" v-model="comp.props.columns[ci]" placeholder="列名" class="pp-dt-col-input" />
      <button v-if="comp.props.columns.length > 1" class="pp-sr-del" @click="removeDatatableColumn(comp, ci)">×</button>
    </div>
  </div>
  <h4 class="pp-subtitle">
    数据行
    <button class="pp-add" @click="addDatatableRow(comp)">+ 添加行</button>
  </h4>
  <div v-for="(row, ri) in comp.props.rows" :key="'row'+ri" class="pp-dt-row">
    <div class="pp-dt-row-inputs">
      <input v-for="(col, ci) in comp.props.columns" :key="ci" type="text" v-model="comp.props.rows[ri][ci]" :placeholder="col" class="pp-dt-cell" />
    </div>
    <button v-if="comp.props.rows.length > 1" class="pp-sr-del" @click="removeDatatableRow(comp, ri)">×</button>
  </div>
</div>
```

- [ ] **Step 4: 添加时间轴和数据表的方法**

在 `<script setup>` 区域中现有的 `addSensor` 和 `removeSensor` 方法之后，添加：

```js
// Timeline helpers
function addTimelineEvent(comp) {
  comp.props.events.push({ date: '', title: '', description: '' })
}
function removeTimelineEvent(comp, i) {
  if (comp.props.events.length > 1) comp.props.events.splice(i, 1)
}

// Datatable helpers
function addDatatableColumn(comp) {
  const newCol = '新列'
  comp.props.columns.push(newCol)
  comp.props.rows.forEach(row => row.push(''))
}
function removeDatatableColumn(comp, ci) {
  if (comp.props.columns.length > 1) {
    comp.props.columns.splice(ci, 1)
    comp.props.rows.forEach(row => row.splice(ci, 1))
  }
}
function addDatatableRow(comp) {
  const newRow = new Array(comp.props.columns.length).fill('')
  comp.props.rows.push(newRow)
}
function removeDatatableRow(comp, ri) {
  if (comp.props.rows.length > 1) comp.props.rows.splice(ri, 1)
}
```

- [ ] **Step 5: 添加时间轴和数据表的 CSS**

在 `<style scoped>` 区域末尾添加：

```css
/* Timeline editor rows */
.pp-timeline-row {
  display: flex; flex-direction: column; gap: 4px;
  padding: 8px; margin-bottom: 6px;
  border: 1px solid var(--color-border-light);
  border-radius: 10px;
  background: rgba(44,125,160,0.02);
  position: relative;
}
.pp-timeline-fields { display: flex; gap: 6px; }
.pp-tl-date { flex: 0 0 90px; }
.pp-tl-title { flex: 1; }
.pp-tl-desc {
  font-size: 0.78rem; padding: 4px 8px;
  border: 1px solid var(--color-border-light);
  border-radius: 6px; outline: none; resize: vertical;
  background: var(--color-bg); color: var(--color-text);
  font-family: inherit;
}

/* Datatable editor */
.pp-dt-columns { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
.pp-dt-col-item { display: flex; align-items: center; gap: 2px; }
.pp-dt-col-input { width: 80px; }
.pp-dt-row { display: flex; align-items: flex-start; gap: 4px; margin-bottom: 4px; }
.pp-dt-row-inputs { display: flex; gap: 4px; flex: 1; overflow-x: auto; }
.pp-dt-cell { width: 80px; flex-shrink: 0; }
```

**注意：** `.pp-tl-date`、`.pp-tl-title`、`.pp-tl-desc` 等 input/textarea 继承 `.pp-field input` 和 `.pp-field textarea` 的通用样式即可，无需重复声明 padding/border/outline。

- [ ] **Step 6: 提交**

```bash
git add src/modules/builder/editor/PropertyPanel.vue
git commit -m "feat: add radar chartType option and timeline/datatable property editors"
```

---

### Task 6: 接入 buildPreview.js

**Files:**
- Modify: `src/modules/builder/editor/buildPreview.js`

- [ ] **Step 1: 在 buildPreview.js 顶部 import 新 renderers**

在 `import { renderSensorMarkup } from './sensorRenderer.js'` 之后加入：

```js
import { renderTimelineMarkup } from './timelineRenderer.js'
import { renderDatatableMarkup } from './datatableRenderer.js'
```

- [ ] **Step 2: 在 renderComponentHtml 的 switch 中添加新 case**

在 `case 'agri-sensor':` 之后：

```js
    case 'timeline':
      inner = renderTimelineMarkup(c)
      break
    case 'datatable':
      inner = renderDatatableMarkup(c)
      break
```

当前代码（约第 26-28 行）：

```js
    case 'agri-sensor':
      inner = renderSensorMarkup(c)
      break
  }
```

改为：

```js
    case 'agri-sensor':
      inner = renderSensorMarkup(c)
      break
    case 'timeline':
      inner = renderTimelineMarkup(c)
      break
    case 'datatable':
      inner = renderDatatableMarkup(c)
      break
  }
```

- [ ] **Step 3: 提交**

```bash
git add src/modules/builder/editor/buildPreview.js
git commit -m "feat: wire timeline and datatable into buildPreview render dispatch"
```

---

### Task 7: 更新 ComponentLibrary + DisplayComponentLibrary

**Files:**
- Modify: `src/modules/builder/editor/ComponentLibrary.vue`
- Modify: `src/modules/builder/display/DisplayComponentLibrary.vue`

- [ ] **Step 1: ComponentLibrary.vue — 修改 3 个条目**

**雷达图**（`overview` 分类下，第 48 行）：
```js
// 改前
{ label: '雷达图', icon: '🕸️', type: 'chart', chartType: 'bar' },
// 改后
{ label: '雷达图', icon: '🕸️', type: 'chart', chartType: 'radar' },
```

**时间轴**（`timeline` 分类下，第 54 行）：
```js
// 改前
{ label: '时间轴', icon: '📋', type: 'chart', chartType: 'bar' },
// 改后
{ label: '时间轴', icon: '📋', type: 'timeline' },
```

**数据表**（`honor` 分类下，第 110 行）：
```js
// 改前
{ label: '数据表', icon: '📋', type: 'chart', chartType: 'bar' },
// 改后
{ label: '数据表', icon: '📋', type: 'datatable' },
```

- [ ] **Step 2: DisplayComponentLibrary.vue — 同样修改 3 个条目**

**雷达图**（`overview` 分类下，第 69 行）：
```js
// 改前
{ label: '雷达图', icon: '🕸️', type: 'chart', chartType: 'bar' },
// 改后
{ label: '雷达图', icon: '🕸️', type: 'chart', chartType: 'radar' },
```

**时间轴**（`timeline` 分类下，第 75 行）：
```js
// 改前
{ label: '时间轴', icon: '📋', type: 'chart', chartType: 'bar' },
// 改后
{ label: '时间轴', icon: '📋', type: 'timeline' },
```

**数据表**（`honor` 分类下，第 131 行）：
```js
// 改前
{ label: '数据表', icon: '📋', type: 'chart', chartType: 'bar' },
// 改后
{ label: '数据表', icon: '📋', type: 'datatable' },
```

**注意：** 时间轴和数据表去掉 `chartType` 属性。拖拽数据格式 `JSON.stringify({ type: item.type, chartType: item.chartType })` 中，`chartType` 为 `undefined` 时会被序列化为忽略字段，不影响 `addComponentAt()` 的调用——`chartType` 参数为 `undefined` 时工厂函数使用默认值。

- [ ] **Step 3: 提交**

```bash
git add src/modules/builder/editor/ComponentLibrary.vue src/modules/builder/display/DisplayComponentLibrary.vue
git commit -m "feat: update component library entries for radar, timeline, datatable"
```

---

### Task 8: 全量测试 + 最终验证

- [ ] **Step 1: 运行 builder 相关全部测试**

```bash
npx vitest run src/__tests__/builder-
```

Expected: 全部 PASS（含已有的 chartRenderer / componentFactory / stageEditor / bigComponentStore / displayWorkbench 测试 + 新增的 timelineRenderer / datatableRenderer 测试）

- [ ] **Step 2: 运行全量测试套件**

```bash
npx vitest run
```

Expected: 全部 PASS 或仅存在与本次改动无关的已有失败

- [ ] **Step 3: 手动验证拖拽渲染**

启动开发服务器，逐一验证：

```bash
npm run dev
```

| 验证项 | 预期结果 |
|--------|----------|
| 组件库中雷达图拖到画布 | 渲染蛛网雷达图，5 维 2 组数据 |
| 组件库中时间轴拖到画布 | 渲染时间线，3 个事件交替上下排列 |
| 组件库中数据表拖到画布 | 渲染表格，表头 + 2 行数据 |
| 属性面板选中雷达图 | 标题输入 + chartType 下拉含「雷达图」选项 + CSV textarea |
| 属性面板选中时间轴 | 标题输入 + 事件列表（日期/标题/描述） + 可增删事件 |
| 属性面板选中数据表 | 标题输入 + 列管理 + 行管理 + 可增删行列 |
| 预览按钮 | 新开窗口，3 种组件正确渲染 |
| 已有的 6 种图表类型 | 仍然正常渲染（向后兼容） |

- [ ] **Step 4: 更新组件使用说明文档**

在 `docs/builder-component-guide.md` 中：
- 替换"雷达图、桑基图、地图散点等目前为预留条目"的表述，改为仅标注未实现的
- 在图表组件部分添加第 7 种图表类型「雷达图」的说明
- 新增「时间轴组件」和「数据表组件」的说明章节

- [ ] **Step 5: 最终提交**

```bash
git add -A
git commit -m "docs: update component guide with radar, timeline, datatable documentation
Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
