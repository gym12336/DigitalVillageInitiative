# 图表渲染补全 — 第一批 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为堆叠柱状图、哑铃图、涨跌徽标 3 个占位图表实现真实 SVG 渲染。

**Architecture:** 在现有 `chartRenderer.js` 中新增 3 组解析器+渲染器，每个新增图表类型独立函数，通过 `renderChartSvg()` 的 switch 分发。不改动组件模型和画布逻辑。

**Tech Stack:** JavaScript (ESM), SVG（纯字符串拼接，零依赖）

## Global Constraints

- 纯 SVG 渲染，不引入 ECharts 或其他图表库
- 复用现有 `COLORS` 色板
- CSV 解析向后兼容——现有双列 CSV 不会报错
- 走现有 `renderChartSvg()` 分发，EditorCanvas 不感知具体图表类型

---

## 文件结构

| 文件 | 职责 | 操作 |
|------|------|------|
| `src/modules/builder/editor/chartRenderer.js` | 所有图表解析+渲染，单一入口 `renderChartSvg()` | 修改 |
| `src/modules/builder/editor/PropertyPanel.vue` | 属性面板，chartType 下拉选项 | 修改 |
| `src/modules/builder/editor/ComponentLibrary.vue` | 组件库条目，指定默认 chartType | 修改 |
| `src/__tests__/builder-chartRenderer.test.js` | 3 个新渲染器的单元测试 | 新建 |

**不改动：** `componentFactory.js`、`stageEditor.js`、`EditorCanvas.vue`、`sensorRenderer.js`、后端

---

### Task 1: 新增堆叠柱状图解析器 + 渲染器 + 测试

**Files:**
- Modify: `src/modules/builder/editor/chartRenderer.js`
- Create: `src/__tests__/builder-chartRenderer.test.js`

**Interfaces:**
- Produces: `parseCSVMultiSeries(csvText)` → `{ labels: string[], series: { name: string, values: number[] }[], totals: number[] }`
- Produces: `renderStackedBarChart(data, w, h, { title })` → SVG string

- [ ] **Step 1: 创建测试文件并写 parseCSVMultiSeries 的测试**

在 `src/__tests__/builder-chartRenderer.test.js`：

```js
import { describe, it, expect } from 'vitest'
import {
  parseCSV,
  parseCSVMultiSeries,
  parseCSVDumbbell,
  parseCSVTrendBadge,
  renderBarChart,
  renderPieChart,
  renderLineChart,
  renderStackedBarChart,
  renderDumbbellChart,
  renderTrendBadge,
  renderChartSvg,
} from '../modules/builder/editor/chartRenderer.js'

describe('parseCSVMultiSeries', () => {
  it('parses multi-column CSV into labels, series, and totals', () => {
    const csv = 'label,茶叶,水果\n李家村,210,85\n张家村,150,120'
    const result = parseCSVMultiSeries(csv)
    expect(result.labels).toEqual(['李家村', '张家村'])
    expect(result.series).toHaveLength(2)
    expect(result.series[0].name).toBe('茶叶')
    expect(result.series[0].values).toEqual([210, 85])
    expect(result.series[1].name).toBe('水果')
    expect(result.series[1].values).toEqual([150, 120])
    expect(result.totals).toEqual([360, 205])
  })

  it('returns empty arrays for insufficient data', () => {
    expect(parseCSVMultiSeries('').labels).toEqual([])
    expect(parseCSVMultiSeries('label\n李家村,100').labels).toEqual([])
  })

  it('handles CSV with no label column', () => {
    const csv = 'name,value\nA,10'
    const result = parseCSVMultiSeries(csv)
    expect(result.labels).toEqual([])
  })
})

describe('renderStackedBarChart', () => {
  it('returns SVG with stacked rects for each bar', () => {
    const data = {
      labels: ['李家村', '张家村'],
      series: [
        { name: '茶叶', values: [210, 150] },
        { name: '水果', values: [85, 120] },
      ],
      totals: [295, 270],
    }
    const svg = renderStackedBarChart(data, 520, 320, { title: '产量' })
    expect(svg).toContain('<svg')
    expect(svg).toContain('产量')
    // Should have 4 rects (2 bars × 2 series)
    expect(svg.match(/<rect/g).length).toBeGreaterThanOrEqual(4)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/__tests__/builder-chartRenderer.test.js
```
Expected: FAIL — `parseCSVMultiSeries is not defined` / `renderStackedBarChart is not defined`

- [ ] **Step 3: 在 chartRenderer.js 顶部添加 parseCSVMultiSeries**

在 `parseCSV` 函数之后插入：

```js
export function parseCSVMultiSeries(csvText) {
  const lines = csvText.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return { labels: [], series: [], totals: [] }
  const headers = lines[0].split(',').map(h => h.trim())
  const labelIdx = headers.indexOf('label')
  if (labelIdx === -1) return { labels: [], series: [], totals: [] }

  const seriesNames = headers.filter((_, i) => i !== labelIdx)
  if (seriesNames.length === 0) return { labels: [], series: [], totals: [] }

  const series = seriesNames.map(name => ({ name, values: [] }))
  const labels = []
  const totals = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim())
    labels.push(cols[labelIdx] || '')
    let total = 0
    seriesNames.forEach((sname, si) => {
      const colIdx = headers.indexOf(sname)
      const val = parseFloat(cols[colIdx]) || 0
      series[si].values.push(val)
      total += val
    })
    totals.push(total)
  }

  return { labels, series, totals }
}
```

- [ ] **Step 4: 在 chartRenderer.js 中添加 renderStackedBarChart**

在 `renderLineChart` 之后插入：

```js
export function renderStackedBarChart(data, w, h, { title = '' } = {}) {
  const { labels, series, totals } = data
  const pad = { top: 40, right: 20, bottom: 50, left: 60 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const maxTotal = Math.max(...totals, 1)
  const barGap = 8
  const barW = Math.max(4, (chartW - barGap * (labels.length + 1)) / labels.length)

  let bars = ''
  labels.forEach((label, i) => {
    const bx = pad.left + barGap + i * (barW + barGap)
    let yStack = 0
    series.forEach((s, si) => {
      const bh = (s.values[i] / maxTotal) * chartH
      if (bh <= 0) return
      const by = pad.top + chartH - yStack - bh
      const isTop = si === series.length - 1 || series.slice(si + 1).every(ss => ss.values[i] === 0)
      bars += `<rect x="${bx}" y="${by}" width="${barW}" height="${bh}" fill="${COLORS[si % COLORS.length]}" rx="${isTop ? '3' : '0'}"/>`
      if (bh > 16) {
        bars += `<text x="${bx + barW / 2}" y="${by + bh / 2 + 4}" text-anchor="middle" font-size="10" fill="#fff" font-weight="600">${s.values[i]}</text>`
      }
      yStack += bh
    })
    bars += `<text x="${bx + barW / 2}" y="${pad.top + chartH - yStack - 5}" text-anchor="middle" font-size="10" fill="#627586" font-weight="600">${totals[i]}</text>`
    bars += `<text x="${bx + barW / 2}" y="${pad.top + chartH + 18}" text-anchor="middle" font-size="10" fill="#687b8b">${label}</text>`
  })

  // Y axis + grid
  const yTicks = 4
  let yAxis = ''
  for (let i = 0; i <= yTicks; i++) {
    const val = Math.round((maxTotal / yTicks) * i)
    const yy = pad.top + chartH - (i / yTicks) * chartH
    yAxis += `<text x="${pad.left - 8}" y="${yy + 4}" text-anchor="end" font-size="10" fill="#687b8b">${val}</text>`
    yAxis += `<line x1="${pad.left}" y1="${yy}" x2="${w - pad.right}" y2="${yy}" stroke="rgba(101,126,152,0.12)" stroke-dasharray="3,3"/>`
  }

  // Legend
  let legend = ''
  series.forEach((s, i) => {
    const lx = pad.left + i * 110
    const ly = 28
    legend += `<rect x="${lx}" y="${ly - 6}" width="10" height="10" rx="2" fill="${COLORS[i % COLORS.length]}"/>`
    legend += `<text x="${lx + 14}" y="${ly + 2}" font-size="10" fill="#627586">${s.name}</text>`
  })

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="18" text-anchor="middle" font-size="14" font-weight="600" fill="#1c2834">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fafdfe"/>
    ${titleSvg}
    ${legend}
    ${yAxis}
    ${bars}
  </svg>`
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
npx vitest run src/__tests__/builder-chartRenderer.test.js
```
Expected: PASS (parseCSVMultiSeries + renderStackedBarChart 相关测试)

- [ ] **Step 6: 提交**

```bash
git add src/modules/builder/editor/chartRenderer.js src/__tests__/builder-chartRenderer.test.js
git commit -m "feat: add stacked bar chart renderer with multi-series CSV parser"
```

---

### Task 2: 新增哑铃图解析器 + 渲染器 + 测试

**Files:**
- Modify: `src/modules/builder/editor/chartRenderer.js`
- Modify: `src/__tests__/builder-chartRenderer.test.js`

**Interfaces:**
- Produces: `parseCSVDumbbell(csvText)` → `{ label: string, start: number, end: number }[]`
- Produces: `renderDumbbellChart(data, w, h, { title })` → SVG string

- [ ] **Step 1: 写测试**

追加到 `builder-chartRenderer.test.js`：

```js
describe('parseCSVDumbbell', () => {
  it('parses start/end columns', () => {
    const csv = 'label,start,end\n茶叶产量,120,210\n农户收入,8000,18500'
    const result = parseCSVDumbbell(csv)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ label: '茶叶产量', start: 120, end: 210 })
    expect(result[1]).toEqual({ label: '农户收入', start: 8000, end: 18500 })
  })

  it('returns empty array for missing columns', () => {
    expect(parseCSVDumbbell('label,value\nA,10')).toEqual([])
    expect(parseCSVDumbbell('')).toEqual([])
  })
})

describe('renderDumbbellChart', () => {
  it('returns SVG with paired circles and connecting lines', () => {
    const data = [
      { label: '茶叶产量', start: 120, end: 210 },
      { label: '农户收入', start: 8000, end: 18500 },
    ]
    const svg = renderDumbbellChart(data, 520, 320, { title: '变化对比' })
    expect(svg).toContain('<svg')
    expect(svg).toContain('变化对比')
    // Should have 4 circles (2 per row)
    expect(svg.match(/<circle/g).length).toBe(4)
    // Should have connecting lines
    expect(svg).toContain('<line')
    // Should show +75.0% for 120→210
    expect(svg).toContain('+75.0%')
    // Should show +131.3% for 8000→18500
    expect(svg).toContain('+131.3%')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/__tests__/builder-chartRenderer.test.js
```
Expected: FAIL — `parseCSVDumbbell is not defined`

- [ ] **Step 3: 添加 parseCSVDumbbell**

在 `chartRenderer.js` 中 `parseCSVMultiSeries` 之后插入：

```js
export function parseCSVDumbbell(csvText) {
  const lines = csvText.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  const labelIdx = headers.indexOf('label')
  const startIdx = headers.indexOf('start')
  const endIdx = headers.indexOf('end')
  if (labelIdx === -1 || startIdx === -1 || endIdx === -1) return []

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim())
    return {
      label: cols[labelIdx] || '',
      start: parseFloat(cols[startIdx]) || 0,
      end: parseFloat(cols[endIdx]) || 0,
    }
  })
}
```

- [ ] **Step 4: 添加 renderDumbbellChart**

在 `renderStackedBarChart` 之后插入：

```js
export function renderDumbbellChart(data, w, h, { title = '' } = {}) {
  const n = data.length
  const rowH = Math.min(60, (h - 80) / Math.max(n, 1))
  const startY = 55
  const leftPad = 120
  const rightPad = 80
  const chartW = w - leftPad - rightPad

  const allVals = data.flatMap(d => [d.start, d.end])
  const minVal = Math.min(...allVals)
  const maxVal = Math.max(...allVals)
  const range = maxVal - minVal || 1

  const toX = (val) => leftPad + ((val - minVal) / range) * chartW

  let rows = ''
  data.forEach((d, i) => {
    const cy = startY + i * rowH + rowH / 2
    const x1 = toX(d.start)
    const x2 = toX(d.end)
    const change = d.start !== 0 ? ((d.end - d.start) / d.start * 100) : 0
    const changeStr = (change >= 0 ? '+' : '') + change.toFixed(1) + '%'
    const changeColor = change >= 0 ? '#6fcf97' : '#eb5757'
    const arrow = change >= 0 ? '▲' : '▼'

    rows += `<text x="${leftPad - 10}" y="${cy + 4}" text-anchor="end" font-size="12" fill="#627586">${d.label}</text>`
    rows += `<circle cx="${x1}" cy="${cy}" r="7" fill="#a0c4d8" stroke="#fff" stroke-width="2"/>`
    rows += `<line x1="${x1 + 7}" y1="${cy}" x2="${x2 - 7}" y2="${cy}" stroke="rgba(101,126,152,0.35)" stroke-width="2.5" stroke-dasharray="4,3"/>`
    rows += `<circle cx="${x2}" cy="${cy}" r="9" fill="#2c7da0" stroke="#fff" stroke-width="2"/>`
    rows += `<text x="${x1}" y="${cy - 12}" text-anchor="middle" font-size="10" fill="#687b8b">${d.start}</text>`
    rows += `<text x="${x2}" y="${cy - 14}" text-anchor="middle" font-size="12" fill="#1c2834" font-weight="600">${d.end}</text>`
    rows += `<text x="${w - 10}" y="${cy + 4}" text-anchor="end" font-size="12" font-weight="600" fill="${changeColor}">${arrow} ${changeStr}</text>`
  })

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="#1c2834">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fafdfe"/>
    ${titleSvg}
    ${rows}
  </svg>`
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
npx vitest run src/__tests__/builder-chartRenderer.test.js
```
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/modules/builder/editor/chartRenderer.js src/__tests__/builder-chartRenderer.test.js
git commit -m "feat: add dumbbell chart renderer with start/end comparison"
```

---

### Task 3: 新增涨跌徽标解析器 + 渲染器 + 测试

**Files:**
- Modify: `src/modules/builder/editor/chartRenderer.js`
- Modify: `src/__tests__/builder-chartRenderer.test.js`

**Interfaces:**
- Produces: `parseCSVTrendBadge(csvText)` → `{ label: string, value: string, change: string }[]`
- Produces: `renderTrendBadge(data, w, h, { title })` → SVG string

- [ ] **Step 1: 写测试**

追加到 `builder-chartRenderer.test.js`：

```js
describe('parseCSVTrendBadge', () => {
  it('parses label, value, and optional change columns', () => {
    const csv = 'label,value,change\n茶叶总产量,210,+75%\n农户收入,18500,+131%'
    const result = parseCSVTrendBadge(csv)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ label: '茶叶总产量', value: '210', change: '+75%' })
    expect(result[1]).toEqual({ label: '农户收入', value: '18500', change: '+131%' })
  })

  it('handles missing change column', () => {
    const csv = 'label,value\n产量,210'
    const result = parseCSVTrendBadge(csv)
    expect(result[0].change).toBe('')
  })

  it('returns empty array for invalid CSV', () => {
    expect(parseCSVTrendBadge('x,y\n1,2')).toEqual([])
  })
})

describe('renderTrendBadge', () => {
  it('returns SVG with large number and trend arrow', () => {
    const data = [
      { label: '茶叶总产量', value: '210', change: '+75%' },
    ]
    const svg = renderTrendBadge(data, 320, 200, { title: '关键指标' })
    expect(svg).toContain('<svg')
    expect(svg).toContain('关键指标')
    expect(svg).toContain('210')
    expect(svg).toContain('+75%')
    // Green for positive change
    expect(svg).toContain('#6fcf97')
  })

  it('uses red for negative change', () => {
    const data = [{ label: '产量', value: '80', change: '-33%' }]
    const svg = renderTrendBadge(data, 320, 200, {})
    expect(svg).toContain('#eb5757')
  })

  it('renders multi-row grid for multiple items', () => {
    const data = [
      { label: 'A', value: '100', change: '+10%' },
      { label: 'B', value: '200', change: '-5%' },
      { label: 'C', value: '300', change: '+20%' },
    ]
    const svg = renderTrendBadge(data, 600, 300, {})
    expect(svg).toContain('A')
    expect(svg).toContain('B')
    expect(svg).toContain('C')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/__tests__/builder-chartRenderer.test.js
```
Expected: FAIL — `parseCSVTrendBadge is not defined`

- [ ] **Step 3: 添加 parseCSVTrendBadge**

在 `parseCSVDumbbell` 之后插入：

```js
export function parseCSVTrendBadge(csvText) {
  const lines = csvText.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  const labelIdx = headers.indexOf('label')
  const valueIdx = headers.indexOf('value')
  if (labelIdx === -1 || valueIdx === -1) return []
  const changeIdx = headers.indexOf('change')

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim())
    return {
      label: cols[labelIdx] || '',
      value: cols[valueIdx] || '',
      change: changeIdx !== -1 ? (cols[changeIdx] || '') : '',
    }
  })
}
```

- [ ] **Step 4: 添加 renderTrendBadge**

在 `renderDumbbellChart` 之后插入：

```js
export function renderTrendBadge(data, w, h, { title = '' } = {}) {
  const n = data.length
  const cols = Math.min(n, 3)
  const cellW = (w - 16) / cols
  const rows = Math.ceil(n / cols)
  const cellH = (h - (title ? 30 : 0) - 8) / rows

  let badges = ''
  data.forEach((d, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = 8 + col * cellW
    const cy = (title ? 30 : 0) + 4 + row * cellH
    const isUp = d.change.startsWith('+')
    const isDown = d.change.startsWith('-')
    const trendColor = isUp ? '#6fcf97' : isDown ? '#eb5757' : '#687b8b'
    const arrow = isUp ? '▲' : isDown ? '▼' : ''

    const valSize = n === 1
      ? Math.min(64, h * 0.38)
      : Math.min(36, cellH * 0.32)
    const changeSize = n === 1 ? 18 : 14

    badges += `
      <g transform="translate(${cx}, ${cy})">
        <rect x="4" y="4" width="${cellW - 8}" height="${cellH - 8}" rx="12" fill="rgba(44,125,160,0.02)" stroke="rgba(44,125,160,0.06)"/>
        <text x="${cellW / 2}" y="${cellH * 0.32}" text-anchor="middle" font-size="12" fill="#687b8b">${d.label}</text>
        <text x="${cellW / 2}" y="${cellH * 0.32 + valSize + 4}" text-anchor="middle" font-size="${valSize}" font-weight="800" fill="#1c2834">${d.value}</text>
        <text x="${cellW / 2}" y="${cellH * 0.32 + valSize + changeSize + 14}" text-anchor="middle" font-size="${changeSize}" font-weight="600" fill="${trendColor}">${arrow} ${d.change}</text>
      </g>`
  })

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="18" text-anchor="middle" font-size="14" font-weight="600" fill="#1c2834">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fafdfe"/>
    ${titleSvg}
    ${badges}
  </svg>`
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
npx vitest run src/__tests__/builder-chartRenderer.test.js
```
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/modules/builder/editor/chartRenderer.js src/__tests__/builder-chartRenderer.test.js
git commit -m "feat: add trend badge renderer for up/down indicator display"
```

---

### Task 4: 更新 renderChartSvg 分发器

**Files:**
- Modify: `src/modules/builder/editor/chartRenderer.js`

**Interfaces:**
- Modifies: `renderChartSvg(component)` — switch 新增 3 个 case: `stacked-bar`, `dumbbell`, `trend-badge`

- [ ] **Step 1: 替换 renderChartSvg 函数体**

用以下内容替换 `chartRenderer.js` 中的 `renderChartSvg` 函数：

```js
export function renderChartSvg(component) {
  const { props, width, height } = component

  const emptySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#f8fbfd"/>
    <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="14" fill="#687b8b">无数据</text>
  </svg>`

  const opts = { title: props.title }

  switch (props.chartType) {
    case 'pie': {
      const data = parseCSV(props.csvText)
      return data.length ? renderPieChart(data, width, height, opts) : emptySvg
    }
    case 'line': {
      const data = parseCSV(props.csvText)
      return data.length ? renderLineChart(data, width, height, opts) : emptySvg
    }
    case 'stacked-bar': {
      const data = parseCSVMultiSeries(props.csvText)
      return data.labels.length ? renderStackedBarChart(data, width, height, opts) : emptySvg
    }
    case 'dumbbell': {
      const data = parseCSVDumbbell(props.csvText)
      return data.length ? renderDumbbellChart(data, width, height, opts) : emptySvg
    }
    case 'trend-badge': {
      const data = parseCSVTrendBadge(props.csvText)
      return data.length ? renderTrendBadge(data, width, height, opts) : emptySvg
    }
    case 'bar':
    default: {
      const data = parseCSV(props.csvText)
      return data.length ? renderBarChart(data, width, height, opts) : emptySvg
    }
  }
}
```

- [ ] **Step 2: 运行全部测试确认向后兼容**

```bash
npx vitest run src/__tests__/builder-chartRenderer.test.js
```
Expected: 全部 PASS

- [ ] **Step 3: 提交**

```bash
git add src/modules/builder/editor/chartRenderer.js
git commit -m "feat: wire new chart types into renderChartSvg dispatcher"
```

---

### Task 5: 更新 PropertyPanel 和 ComponentLibrary

**Files:**
- Modify: `src/modules/builder/editor/PropertyPanel.vue` (添加 3 个 chartType 选项)
- Modify: `src/modules/builder/editor/ComponentLibrary.vue` (修正 3 个条目的 chartType)

- [ ] **Step 1: PropertyPanel.vue — chartType 下拉框添加选项**

在 `PropertyPanel.vue` 的 chart 部分，找到 `<select v-model="comp.props.chartType">`，替换为：

```html
<select v-model="comp.props.chartType">
  <option value="bar">柱状图</option>
  <option value="stacked-bar">堆叠柱状图</option>
  <option value="pie">饼图</option>
  <option value="line">折线图</option>
  <option value="dumbbell">哑铃图</option>
  <option value="trend-badge">涨跌徽标</option>
</select>
```

具体改动位置：`src/modules/builder/editor/PropertyPanel.vue:139-143`，将原有的 3 个 `<option>` 替换为以上 6 个。

- [ ] **Step 2: ComponentLibrary.vue — 修正 3 个条目的 chartType**

在 `ComponentLibrary.vue` 的 `COMPONENT_CATEGORIES` 常量中：

**堆叠柱**（第 61 行，`composition` 分类下）：
```js
// 改前
{ label: '堆叠柱', icon: '📊', type: 'chart', chartType: 'bar' },
// 改后
{ label: '堆叠柱', icon: '📊', type: 'chart', chartType: 'stacked-bar' },
```

**哑铃图**（第 40 行，`change` 分类下）：
```js
// 改前
{ label: '哑铃图', icon: '🔗', type: 'chart', chartType: 'bar' },
// 改后
{ label: '哑铃图', icon: '🔗', type: 'chart', chartType: 'dumbbell' },
```

**涨跌徽标**（第 41 行，`change` 分类下）：
```js
// 改前
{ label: '涨跌徽标', icon: '📈', type: 'chart', chartType: 'bar' },
// 改后
{ label: '涨跌徽标', icon: '📈', type: 'chart', chartType: 'trend-badge' },
```

- [ ] **Step 3: 验证（手动检查）**

启动开发服务器，确认：
- 属性面板的图表类型下拉显示 6 个选项
- 组件库中堆叠柱、哑铃图、涨跌徽标拖到画布上渲染正确

```bash
npm run dev
```

- [ ] **Step 4: 提交**

```bash
git add src/modules/builder/editor/PropertyPanel.vue src/modules/builder/editor/ComponentLibrary.vue
git commit -m "feat: wire new chart types into PropertyPanel and ComponentLibrary"
```

---

### Task 6: 运行全量测试 + 最终验证

- [ ] **Step 1: 运行 builder 相关全部测试**

```bash
npx vitest run src/__tests__/builder-
```
Expected: 全部 PASS（包括已有的 componentFactory、stageEditor、bigComponentStore、displayWorkbench 测试）

- [ ] **Step 2: 运行全量测试套件**

```bash
npx vitest run
```
Expected: 全部 PASS 或与改动无关的已有失败

- [ ] **Step 3: 最终提交**

```bash
git add -A
git commit -m "test: verify all builder tests pass with new chart renderers"
```
