# 成果搭建台 · 大组件编辑台 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-dependency big-component editor with a three-panel layout (component library → canvas → property panel), driven by reactive state + innerHTML canvas rendering.

**Architecture:** Vue 3 reactive state (`stageEditor.js`) as single source of truth → `renderStage()` produces innerHTML for the canvas → Vue templates with v-model handle property panel forms. Components are pure data objects created by factory functions. No external drag/UI/chart libraries.

**Tech Stack:** Vue 3.5 + Vite 6 + ECharts (already in project, for reference only — charts are hand-written SVG), no new dependencies.

**Source Spec:** `docs/superpowers/specs/2026-07-09-builder-big-component-editor-design.md`

## Global Constraints

- Zero new external dependencies — no drag-and-drop libraries, no chart libraries
- Vue 3 Composition API (`<script setup>`) for all `.vue` files
- Reuse project CSS variables from `src/assets/theme/theme.css`
- File naming: kebab-case for modules, PascalCase for Vue components
- Module auto-discovery: routes.js default export, picked up by `src/router/index.js`
- Module registration: add entry in `src/modules.config.js`
- Commit messages: `type: description` format with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Module Scaffolding — Routes, Config, DisplayWorkbench Placeholder

**Files:**
- Create: `src/modules/builder/routes.js`
- Create: `src/modules/builder/display/DisplayWorkbench.vue`
- Modify: `src/modules.config.js`

**Interfaces:**
- Produces: Routes `/builder`, `/builder/editor`, `/builder/display` registered in router
- Produces: `modules.config.js` entry for builder module

- [ ] **Step 1: Create routes.js**

```javascript
// src/modules/builder/routes.js
import BuilderHub from './BuilderHub.vue'
import BigComponentEditor from './editor/BigComponentEditor.vue'
import DisplayWorkbench from './display/DisplayWorkbench.vue'

export default [
  { path: '/builder', name: 'builder', component: BuilderHub },
  { path: '/builder/editor', name: 'builder-editor', component: BigComponentEditor },
  { path: '/builder/display', name: 'builder-display', component: DisplayWorkbench },
]
```

- [ ] **Step 2: Create DisplayWorkbench placeholder**

```vue
<!-- src/modules/builder/display/DisplayWorkbench.vue -->
<template>
  <section class="dw-placeholder">
    <div class="dw-card">
      <p class="dw-emoji">🖥️</p>
      <h1>大屏展示工作台</h1>
      <p>排版所有组件，生成展示页面并一键导出。</p>
      <span class="dw-badge">即将开放</span>
    </div>
  </section>
</template>

<script setup>
</script>

<style scoped>
.dw-placeholder {
  display: flex; align-items: center; justify-content: center;
  min-height: calc(100vh - 60px); padding: 3rem;
}
.dw-card {
  text-align: center; padding: 3rem 4rem;
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow-card);
}
.dw-emoji { font-size: 3rem; margin: 0 0 1rem; }
.dw-card h1 { font-size: 1.6rem; color: var(--color-primary-dark); margin: 0 0 .6rem; }
.dw-card p { color: var(--color-text-secondary); margin: 0 0 1.2rem; }
.dw-badge {
  display: inline-block; padding: .25rem 1rem;
  background: var(--color-accent); color: var(--color-primary-dark);
  border-radius: 50px; font-size: .82rem; font-weight: 600;
}
</style>
```

- [ ] **Step 3: Register module in modules.config.js**

```javascript
// Add to the modules array in src/modules.config.js, after the last entry:
  {
    id: 'builder', name: '成果搭建台', icon: '🛠️', path: '/builder', enabled: true,
    desc: '可视化组件DIY搭建，自由组合导出成果',
    hook: '拖拽组件、组合大组件、一键导出展示页。',
    metric: '成果可视化',
  },
```

- [ ] **Step 4: Verify routes load**

Run: `npx vitest run --reporter=verbose 2>&1 | head -20`
The router auto-discovers `src/modules/builder/routes.js` via `import.meta.glob`. Verify no routing test failures.

- [ ] **Step 5: Commit**

```bash
git add src/modules/builder/ src/modules.config.js
git commit -m "feat: scaffold builder module with routes and DisplayWorkbench placeholder

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Component Factory — Pure Data Model

**Files:**
- Create: `src/modules/builder/editor/componentFactory.js`
- Create: `src/__tests__/builder-componentFactory.test.js`

**Interfaces:**
- Produces: `createComponent(type, x, y)` → `{ id, type, x, y, width, height, props }`
- Produces: `createTextComponent(x, y)` → text component with defaults
- Produces: `createImageComponent(x, y)` → image component with defaults
- Produces: `createChartComponent(x, y)` → chart component with defaults
- Produces: `createSensorComponent(x, y)` → agri-sensor component with defaults

- [ ] **Step 1: Write failing test**

```javascript
// src/__tests__/builder-componentFactory.test.js
import { describe, it, expect } from 'vitest'
import {
  createComponent,
  createTextComponent,
  createImageComponent,
  createChartComponent,
  createSensorComponent,
} from '../modules/builder/editor/componentFactory.js'

describe('componentFactory', () => {
  describe('createTextComponent', () => {
    it('returns a text component with defaults', () => {
      const c = createTextComponent(100, 200)
      expect(c.type).toBe('text')
      expect(c.x).toBe(100)
      expect(c.y).toBe(200)
      expect(c.width).toBe(300)
      expect(c.height).toBe(96)
      expect(c.props.text).toBe('新建文本')
      expect(c.props.fontSize).toBe(34)
      expect(c.props.color).toBe('#1f2937')
      expect(c.props.fontWeight).toBe(700)
      expect(c.props.textAlign).toBe('left')
      expect(c.props.backgroundColor).toBe('transparent')
    })
  })

  describe('createImageComponent', () => {
    it('returns an image component with defaults', () => {
      const c = createImageComponent(0, 0)
      expect(c.type).toBe('image')
      expect(c.width).toBe(320)
      expect(c.height).toBe(220)
      expect(c.props.objectFit).toBe('cover')
      expect(c.props.borderRadius).toBe(0)
      expect(c.props.autoRefresh).toBe(false)
      expect(c.props.refreshInterval).toBe(60)
    })
  })

  describe('createChartComponent', () => {
    it('returns a chart component with defaults and sample CSV', () => {
      const c = createChartComponent(0, 0)
      expect(c.type).toBe('chart')
      expect(c.width).toBe(520)
      expect(c.height).toBe(320)
      expect(c.props.chartType).toBe('bar')
      expect(c.props.title).toBe('图表标题')
      expect(c.props.labelColumn).toBe('label')
      expect(c.props.valueColumn).toBe('value')
      expect(c.props.csvText).toContain('label,value')
    })
  })

  describe('createSensorComponent', () => {
    it('returns a sensor component with defaults and 4 sensors', () => {
      const c = createSensorComponent(0, 0)
      expect(c.type).toBe('agri-sensor')
      expect(c.width).toBe(430)
      expect(c.height).toBe(400)
      expect(c.props.sensors).toHaveLength(4)
      expect(c.props.sensors[0]).toEqual({
        name: '温度', value: 26.5, unit: '°C', status: 'normal',
      })
    })
  })

  describe('createComponent', () => {
    it('dispatches to correct factory by type', () => {
      expect(createComponent('text', 10, 20).type).toBe('text')
      expect(createComponent('image', 10, 20).type).toBe('image')
      expect(createComponent('chart', 10, 20).type).toBe('chart')
      expect(createComponent('agri-sensor', 10, 20).type).toBe('agri-sensor')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/builder-componentFactory.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement componentFactory.js**

```javascript
// src/modules/builder/editor/componentFactory.js

export function createComponent(type, x, y) {
  switch (type) {
    case 'text':        return createTextComponent(x, y)
    case 'image':       return createImageComponent(x, y)
    case 'chart':       return createChartComponent(x, y)
    case 'agri-sensor': return createSensorComponent(x, y)
    default:            throw new Error(`Unknown component type: ${type}`)
  }
}

export function createTextComponent(x, y) {
  return {
    type: 'text',
    x, y,
    width: 300,
    height: 96,
    props: {
      text: '新建文本',
      fontSize: 34,
      color: '#1f2937',
      fontWeight: 700,
      textAlign: 'left',
      backgroundColor: 'transparent',
    },
  }
}

export function createImageComponent(x, y) {
  return {
    type: 'image',
    x, y,
    width: 320,
    height: 220,
    props: {
      src: '',
      alt: '',
      objectFit: 'cover',
      borderRadius: 0,
      autoRefresh: false,
      refreshInterval: 60,
    },
  }
}

export function createChartComponent(x, y) {
  return {
    type: 'chart',
    x, y,
    width: 520,
    height: 320,
    props: {
      title: '图表标题',
      chartType: 'bar',
      csvText: 'label,value\n类别A,35\n类别B,68\n类别C,42\n类别D,55\n类别E,27',
      labelColumn: 'label',
      valueColumn: 'value',
    },
  }
}

export function createSensorComponent(x, y) {
  return {
    type: 'agri-sensor',
    x, y,
    width: 430,
    height: 400,
    props: {
      title: '农业传感器监测',
      sensors: [
        { name: '温度', value: 26.5, unit: '°C', status: 'normal' },
        { name: '湿度', value: 68, unit: '%', status: 'normal' },
        { name: '土壤pH', value: 6.8, unit: '', status: 'warning' },
        { name: '光照', value: 3200, unit: 'lux', status: 'normal' },
      ],
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/builder-componentFactory.test.js`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/builder/editor/componentFactory.js src/__tests__/builder-componentFactory.test.js
git commit -m "feat: add componentFactory with 4 types and tests

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Chart Renderer — Hand-Written SVG

**Files:**
- Create: `src/modules/builder/editor/chartRenderer.js`

**Interfaces:**
- Produces: `parseCSV(csvText)` → `[{ label, value }, ...]`
- Produces: `renderBarChart(data, width, height, options?)` → SVG string
- Produces: `renderPieChart(data, width, height, options?)` → SVG string
- Produces: `renderLineChart(data, width, height, options?)` → SVG string
- Produces: `renderChartSvg(component)` → SVG string (dispatches by chartType)

- [ ] **Step 1: Create chartRenderer.js with CSV parser and bar chart**

```javascript
// src/modules/builder/editor/chartRenderer.js

const COLORS = [
  '#6b8c5c', '#d4a373', '#4a8fbf', '#e07a5f', '#8a9a5b',
  '#b07d62', '#5b8a9a', '#c9a86a', '#9a5b8a', '#6b9a5b',
]

export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  const labelIdx = headers.indexOf('label')
  const valueIdx = headers.indexOf('value')
  if (labelIdx === -1 || valueIdx === -1) return []
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim())
    return {
      label: cols[labelIdx] || '',
      value: parseFloat(cols[valueIdx]) || 0,
    }
  })
}

export function renderBarChart(data, w, h, { title = '' } = {}) {
  const pad = { top: 40, right: 20, bottom: 50, left: 60 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const barGap = 8
  const barW = Math.max(4, (chartW - barGap * (data.length + 1)) / data.length)

  let bars = ''
  data.forEach((d, i) => {
    const bh = (d.value / maxVal) * chartH
    const bx = pad.left + barGap + i * (barW + barGap)
    const by = pad.top + chartH - bh
    bars += `<rect x="${bx}" y="${by}" width="${barW}" height="${bh}" fill="${COLORS[i % COLORS.length]}" rx="2"/>`
    bars += `<text x="${bx + barW / 2}" y="${by - 6}" text-anchor="middle" font-size="11" fill="#666">${d.value}</text>`
    bars += `<text x="${bx + barW / 2}" y="${pad.top + chartH + 18}" text-anchor="middle" font-size="10" fill="#888">${d.label}</text>`
  })

  // Y axis
  const yTicks = 4
  let yAxis = ''
  for (let i = 0; i <= yTicks; i++) {
    const val = Math.round((maxVal / yTicks) * i)
    const yy = pad.top + chartH - (i / yTicks) * chartH
    yAxis += `<text x="${pad.left - 8}" y="${yy + 4}" text-anchor="end" font-size="10" fill="#999">${val}</text>`
    yAxis += `<line x1="${pad.left}" y1="${yy}" x2="${w - pad.right}" y2="${yy}" stroke="#eee" stroke-dasharray="3,3"/>`
  }

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="#333">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fff"/>
    ${titleSvg}
    ${yAxis}
    ${bars}
  </svg>`
}

export function renderPieChart(data, w, h, { title = '' } = {}) {
  const cx = w / 2
  const cy = h / 2 + (title ? 12 : 0)
  const r = Math.min(w, h) / 2 - 40
  const total = data.reduce((s, d) => s + d.value, 0) || 1

  let paths = ''
  let startAngle = -Math.PI / 2
  data.forEach((d, i) => {
    const angle = (d.value / total) * Math.PI * 2
    const endAngle = startAngle + angle
    const largeArc = angle > Math.PI ? 1 : 0
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z" fill="${COLORS[i % COLORS.length]}" stroke="#fff" stroke-width="1"/>`
    // Label at mid-angle
    const mid = startAngle + angle / 2
    const lx = cx + (r * 0.65) * Math.cos(mid)
    const ly = cy + (r * 0.65) * Math.sin(mid)
    const pct = Math.round((d.value / total) * 100)
    if (pct >= 5) {
      paths += `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="10" fill="#fff" font-weight="600">${pct}%</text>`
    }
    startAngle = endAngle
  })

  // Legend
  let legend = ''
  data.forEach((d, i) => {
    const lx = 12
    const ly = 16 + i * 18
    legend += `<rect x="${lx}" y="${ly - 8}" width="10" height="10" rx="2" fill="${COLORS[i % COLORS.length]}"/>`
    legend += `<text x="${lx + 15}" y="${ly}" font-size="10" fill="#666">${d.label} (${d.value})</text>`
  })

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="20" text-anchor="middle" font-size="14" font-weight="600" fill="#333">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fff"/>
    ${titleSvg}
    ${paths}
    ${legend}
  </svg>`
}

export function renderLineChart(data, w, h, { title = '' } = {}) {
  const pad = { top: 40, right: 20, bottom: 50, left: 60 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const maxVal = Math.max(...data.map(d => d.value), 1)

  const points = data.map((d, i) => {
    const px = pad.left + (i / Math.max(data.length - 1, 1)) * chartW
    const py = pad.top + chartH - (d.value / maxVal) * chartH
    return `${px},${py}`
  }).join(' ')

  let dots = ''
  data.forEach((d, i) => {
    const px = pad.left + (i / Math.max(data.length - 1, 1)) * chartW
    const py = pad.top + chartH - (d.value / maxVal) * chartH
    dots += `<circle cx="${px}" cy="${py}" r="4" fill="${COLORS[0]}"/>`
    dots += `<text x="${px}" y="${py - 10}" text-anchor="middle" font-size="10" fill="#666">${d.value}</text>`
  })

  // X labels
  let xLabels = ''
  data.forEach((d, i) => {
    const px = pad.left + (i / Math.max(data.length - 1, 1)) * chartW
    xLabels += `<text x="${px}" y="${pad.top + chartH + 18}" text-anchor="middle" font-size="10" fill="#888">${d.label}</text>`
  })

  // Grid
  const yTicks = 4
  let grid = ''
  for (let i = 0; i <= yTicks; i++) {
    const yy = pad.top + chartH - (i / yTicks) * chartH
    grid += `<line x1="${pad.left}" y1="${yy}" x2="${w - pad.right}" y2="${yy}" stroke="#eee" stroke-dasharray="3,3"/>`
  }

  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="#333">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fff"/>
    ${titleSvg}
    ${grid}
    <polyline points="${points}" fill="none" stroke="${COLORS[0]}" stroke-width="2.5" stroke-linejoin="round"/>
    ${dots}
    ${xLabels}
  </svg>`
}

export function renderChartSvg(component) {
  const { props, width, height } = component
  const data = parseCSV(props.csvText)
  if (!data.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#faf8f5"/>
      <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="14" fill="#999">无数据</text>
    </svg>`
  }
  switch (props.chartType) {
    case 'pie':  return renderPieChart(data, width, height, { title: props.title })
    case 'line': return renderLineChart(data, width, height, { title: props.title })
    case 'bar':
    default:     return renderBarChart(data, width, height, { title: props.title })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/editor/chartRenderer.js
git commit -m "feat: add chartRenderer with hand-written SVG bar/pie/line charts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Sensor Renderer

**Files:**
- Create: `src/modules/builder/editor/sensorRenderer.js`

**Interfaces:**
- Produces: `renderSensorMarkup(component)` → HTML string for agri-sensor component

- [ ] **Step 1: Create sensorRenderer.js**

```javascript
// src/modules/builder/editor/sensorRenderer.js

const STATUS_COLORS = {
  normal: '#6b8c5c',
  warning: '#d4a373',
  error: '#e07a5f',
}

const STATUS_LABELS = {
  normal: '正常',
  warning: '注意',
  error: '异常',
}

export function renderSensorMarkup(component) {
  const { props, width, height } = component
  const { title, sensors } = props

  const sensorCards = sensors.map((s, i) => {
    const color = STATUS_COLORS[s.status] || STATUS_COLORS.normal
    const label = STATUS_LABELS[s.status] || s.status
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9f7f3;border-radius:8px;">
        <div>
          <div style="font-size:13px;font-weight:600;color:#333;margin-bottom:2px;">${esc(s.name)}</div>
          <span style="font-size:11px;padding:1px 8px;border-radius:50px;color:#fff;background:${color};">${label}</span>
        </div>
        <div style="text-align:right;">
          <span style="font-size:22px;font-weight:700;color:#333;">${s.value}</span>
          <span style="font-size:13px;color:#888;margin-left:2px;">${esc(s.unit)}</span>
        </div>
      </div>`
  }).join('')

  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;padding:16px;box-sizing:border-box;overflow:hidden;">
      <h3 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#4d6b3e;">${esc(title)}</h3>
      <div style="display:flex;flex-direction:column;gap:8px;flex:1;overflow-y:auto;">
        ${sensorCards}
      </div>
    </div>`
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/editor/sensorRenderer.js
git commit -m "feat: add sensorRenderer for agri-sensor component markup

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Core Engine — stageEditor.js (State + Render + Undo/Redo)

**Files:**
- Create: `src/modules/builder/editor/stageEditor.js`
- Create: `src/__tests__/builder-stageEditor.test.js`

**Interfaces:**
- Produces: `state` — reactive singleton with components, selectedId, pageWidth/Height, zoom, clipboard, history
- Produces: `addComponentAt(type, x, y)` → component id
- Produces: `deleteComponent(id)` → void
- Produces: `selectComponent(id)` → void
- Produces: `moveComponent(id, dx, dy)` → void
- Produces: `resizeComponent(id, handle, dx, dy)` → void
- Produces: `bringToFront(id)` → void
- Produces: `cloneComponent(id)` → new component id
- Produces: `copySelected()`, `pasteClipboard(x, y)` → void
- Produces: `selectByRect(x1, y1, x2, y2)` → void
- Produces: `undo()`, `redo()` → void
- Produces: `pushHistory()` → void
- Produces: `save()`, `load()` → void
- Produces: `setZoom(z, anchorX, anchorY)` → void
- Produces: `getSelected()` → component | null

- [ ] **Step 1: Write failing test for core operations**

```javascript
// src/__tests__/builder-stageEditor.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import {
  state,
  resetState,
  addComponentAt,
  deleteComponent,
  selectComponent,
  moveComponent,
  bringToFront,
  cloneComponent,
  copySelected,
  pasteClipboard,
  undo,
  redo,
  getSelected,
} from '../modules/builder/editor/stageEditor.js'

beforeEach(() => {
  resetState()
})

describe('stageEditor', () => {
  describe('addComponentAt', () => {
    it('adds a text component and returns its id', () => {
      const id = addComponentAt('text', 100, 200)
      expect(id).toBe(1)
      expect(state.components).toHaveLength(1)
      expect(state.components[0].type).toBe('text')
      expect(state.components[0].x).toBe(100)
      expect(state.components[0].y).toBe(200)
    })

    it('auto-selects the new component', () => {
      addComponentAt('text', 0, 0)
      expect(state.selectedId).toBe(1)
    })
  })

  describe('deleteComponent', () => {
    it('removes component and clears selection', () => {
      addComponentAt('text', 0, 0)
      deleteComponent(1)
      expect(state.components).toHaveLength(0)
      expect(state.selectedId).toBeNull()
    })
  })

  describe('selectComponent', () => {
    it('sets selectedId', () => {
      addComponentAt('text', 0, 0)
      selectComponent(1)
      expect(state.selectedId).toBe(1)
    })
  })

  describe('moveComponent', () => {
    it('moves component by delta within bounds', () => {
      addComponentAt('text', 100, 100)
      moveComponent(1, 20, -10)
      expect(state.components[0].x).toBe(120)
      expect(state.components[0].y).toBe(90)
    })
  })

  describe('bringToFront', () => {
    it('moves component to end of array', () => {
      addComponentAt('text', 0, 0)
      addComponentAt('image', 10, 10)
      bringToFront(1)
      expect(state.components[state.components.length - 1].id).toBe(1)
    })
  })

  describe('cloneComponent', () => {
    it('creates a copy with offset position', () => {
      const id = addComponentAt('text', 100, 100)
      const newId = cloneComponent(id)
      expect(newId).toBe(2)
      expect(state.components).toHaveLength(2)
      expect(state.components[1].x).toBe(120)
      expect(state.components[1].y).toBe(120)
    })
  })

  describe('copy/paste', () => {
    it('copies selected then pastes at given position', () => {
      addComponentAt('text', 50, 50)
      copySelected()
      pasteClipboard(200, 300)
      expect(state.components).toHaveLength(2)
      expect(state.components[1].x).toBe(200)
      expect(state.components[1].y).toBe(300)
    })
  })

  describe('undo/redo', () => {
    it('undo reverts the last operation', () => {
      addComponentAt('text', 0, 0)
      addComponentAt('image', 10, 10)
      expect(state.components).toHaveLength(2)
      undo()
      expect(state.components).toHaveLength(1)
      expect(state.components[0].type).toBe('text')
    })

    it('redo restores the undone operation', () => {
      addComponentAt('text', 0, 0)
      addComponentAt('image', 10, 10)
      undo()
      redo()
      expect(state.components).toHaveLength(2)
    })

    it('caps history at 50 entries', () => {
      for (let i = 0; i < 60; i++) {
        addComponentAt('text', i * 10, 0)
      }
      expect(state.history.length).toBeLessThanOrEqual(50)
    })
  })

  describe('getSelected', () => {
    it('returns the selected component or null', () => {
      expect(getSelected()).toBeNull()
      addComponentAt('text', 0, 0)
      expect(getSelected().type).toBe('text')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/builder-stageEditor.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement stageEditor.js**

```javascript
// src/modules/builder/editor/stageEditor.js
import { reactive } from 'vue'
import { createComponent } from './componentFactory.js'

const HISTORY_LIMIT = 50

export const state = reactive({
  components: [],
  selectedId: null,
  pageWidth: 1920,
  pageHeight: 1080,
  pageBackground: '#ffffff',
  zoom: 1,
  clipboard: [],
  nextId: 1,
  history: [],
  historyIndex: -1,
})

export function resetState() {
  state.components = []
  state.selectedId = null
  state.pageWidth = 1920
  state.pageHeight = 1080
  state.pageBackground = '#ffffff'
  state.zoom = 1
  state.clipboard = []
  state.nextId = 1
  state.history = []
  state.historyIndex = -1
}

function snapshot() {
  return JSON.parse(JSON.stringify(state.components))
}

export function pushHistory() {
  // Discard any future history if we've undone
  if (state.historyIndex < state.history.length - 1) {
    state.history = state.history.slice(0, state.historyIndex + 1)
  }
  state.history.push(snapshot())
  if (state.history.length > HISTORY_LIMIT) {
    state.history.shift()
  }
  state.historyIndex = state.history.length - 1
}

function restoreHistory(index) {
  state.components = JSON.parse(JSON.stringify(state.history[index]))
  state.selectedId = null
}

export function addComponentAt(type, x, y) {
  pushHistory()
  const comp = createComponent(type, x, y)
  comp.id = state.nextId++
  state.components.push(comp)
  state.selectedId = comp.id
  return comp.id
}

export function deleteComponent(id) {
  pushHistory()
  state.components = state.components.filter(c => c.id !== id)
  if (state.selectedId === id) state.selectedId = null
}

export function selectComponent(id) {
  state.selectedId = id
}

export function moveComponent(id, dx, dy) {
  const c = state.components.find(c => c.id === id)
  if (!c) return
  c.x = Math.max(0, c.x + dx)
  c.y = Math.max(0, c.y + dy)
}

export function resizeComponent(id, handle, dx, dy) {
  const c = state.components.find(c => c.id === id)
  if (!c) return
  const MIN_SIZE = 20
  switch (handle) {
    case 'se': c.width = Math.max(MIN_SIZE, c.width + dx); c.height = Math.max(MIN_SIZE, c.height + dy); break
    case 'sw': c.x += dx; c.width = Math.max(MIN_SIZE, c.width - dx); c.height = Math.max(MIN_SIZE, c.height + dy); break
    case 'ne': c.width = Math.max(MIN_SIZE, c.width + dx); c.y += dy; c.height = Math.max(MIN_SIZE, c.height - dy); break
    case 'nw': c.x += dx; c.width = Math.max(MIN_SIZE, c.width - dx); c.y += dy; c.height = Math.max(MIN_SIZE, c.height - dy); break
    case 'e':  c.width = Math.max(MIN_SIZE, c.width + dx); break
    case 'w':  c.x += dx; c.width = Math.max(MIN_SIZE, c.width - dx); break
    case 's':  c.height = Math.max(MIN_SIZE, c.height + dy); break
    case 'n':  c.y += dy; c.height = Math.max(MIN_SIZE, c.height - dy); break
  }
}

export function bringToFront(id) {
  const idx = state.components.findIndex(c => c.id === id)
  if (idx === -1) return
  const [comp] = state.components.splice(idx, 1)
  state.components.push(comp)
}

export function cloneComponent(id) {
  const c = state.components.find(c => c.id === id)
  if (!c) return null
  pushHistory()
  const clone = JSON.parse(JSON.stringify(c))
  clone.id = state.nextId++
  clone.x += 20
  clone.y += 20
  state.components.push(clone)
  state.selectedId = clone.id
  return clone.id
}

export function copySelected() {
  if (state.selectedId === null) return
  const c = state.components.find(c => c.id === state.selectedId)
  if (c) state.clipboard = [JSON.parse(JSON.stringify(c))]
}

export function pasteClipboard(x, y) {
  if (!state.clipboard.length) return
  pushHistory()
  state.clipboard.forEach(src => {
    const clone = JSON.parse(JSON.stringify(src))
    clone.id = state.nextId++
    clone.x = x !== undefined ? x : clone.x + 20
    clone.y = y !== undefined ? y : clone.y + 20
    state.components.push(clone)
    state.selectedId = clone.id
  })
}

export function selectByRect(x1, y1, x2, y2) {
  const rx = Math.min(x1, x2)
  const ry = Math.min(y1, y2)
  const rw = Math.abs(x2 - x1)
  const rh = Math.abs(y2 - y1)

  // Find topmost intersecting component (reverse iteration = higher z-index)
  for (let i = state.components.length - 1; i >= 0; i--) {
    const c = state.components[i]
    if (c.x < rx + rw && c.x + c.width > rx && c.y < ry + rh && c.y + c.height > ry) {
      state.selectedId = c.id
      return
    }
  }
  state.selectedId = null
}

export function undo() {
  if (state.historyIndex <= 0) return
  state.historyIndex--
  restoreHistory(state.historyIndex)
}

export function redo() {
  if (state.historyIndex >= state.history.length - 1) return
  state.historyIndex++
  restoreHistory(state.historyIndex)
}

export function setZoom(z) {
  state.zoom = Math.max(0.25, Math.min(2, z))
}

export function getSelected() {
  if (state.selectedId === null) return null
  return state.components.find(c => c.id === state.selectedId) || null
}

export function save() {
  const data = {
    components: JSON.parse(JSON.stringify(state.components)),
    pageWidth: state.pageWidth,
    pageHeight: state.pageHeight,
    pageBackground: state.pageBackground,
    nextId: state.nextId,
  }
  localStorage.setItem('builder-save', JSON.stringify(data))
}

export function load() {
  const raw = localStorage.getItem('builder-save')
  if (!raw) return false
  try {
    const data = JSON.parse(raw)
    state.components = data.components || []
    state.pageWidth = data.pageWidth || 1920
    state.pageHeight = data.pageHeight || 1080
    state.pageBackground = data.pageBackground || '#ffffff'
    state.nextId = data.nextId || 1
    state.selectedId = null
    state.history = []
    state.historyIndex = -1
    state.clipboard = []
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/builder-stageEditor.test.js`
Expected: 12 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/builder/editor/stageEditor.js src/__tests__/builder-stageEditor.test.js
git commit -m "feat: add stageEditor core engine with undo/redo and tests

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: BuilderHub — Entry Page

**Files:**
- Create: `src/modules/builder/BuilderHub.vue`

**Interfaces:**
- Consumes: Vue Router for navigation
- Produces: Hub page UI with two choice cards

- [ ] **Step 1: Create BuilderHub.vue**

```vue
<!-- src/modules/builder/BuilderHub.vue -->
<template>
  <section class="hub">
    <div class="hub-container">
      <header class="hub-head">
        <p class="hub-kicker">成果可视化</p>
        <h1>🛠️ 成果搭建台</h1>
        <p class="hub-desc">选择你的工作台模式，将实践数据转化为可视化成果。</p>
      </header>

      <div class="hub-cards">
        <article class="hub-card" tabindex="0" role="button" @click="goEditor" @keydown.enter="goEditor">
          <div class="hc-icon">🧩</div>
          <div class="hc-body">
            <h2>大组件编辑台</h2>
            <p>拖拽组合小组件，利用结合规则打造可交互的功能体，保存供展示台使用。</p>
          </div>
          <button class="btn primary">进入编辑</button>
        </article>

        <article class="hub-card disabled">
          <div class="hc-icon">🖥️</div>
          <div class="hc-body">
            <h2>大屏展示工作台</h2>
            <p>排版所有组件，自由调整布局与样式，一键导出纯静态展示网页。</p>
          </div>
          <span class="hc-badge">即将开放</span>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
function goEditor() {
  router.push('/builder/editor')
}
</script>

<style scoped>
.hub { padding: 3rem 0 4rem; min-height: calc(100vh - 60px); }
.hub-container { max-width: 800px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem); }
.hub-head { text-align: center; margin-bottom: 2.5rem; }
.hub-kicker { font-size: 13px; font-weight: 700; color: var(--color-highlight); letter-spacing: .08em; margin: 0 0 .6rem; }
.hub-head h1 { font-size: clamp(28px, 4vw, 40px); color: var(--color-primary-dark); margin: 0; }
.hub-desc { margin: .8rem 0 0; color: var(--color-text-secondary); font-size: 1rem; }

.hub-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; }
.hub-card {
  display: flex; flex-direction: column; gap: 1rem; align-items: center; text-align: center;
  padding: 2.5rem 2rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius);
  box-shadow: var(--shadow-card); cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition);
}
.hub-card:hover:not(.disabled) { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
.hub-card.disabled { opacity: .55; cursor: default; }
.hc-icon { font-size: 2.8rem; line-height: 1; }
.hc-body h2 { font-size: 1.3rem; color: var(--color-primary-dark); margin: 0 0 .5rem; }
.hc-body p { font-size: .9rem; color: var(--color-text-secondary); line-height: 1.6; margin: 0; }

.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); }
.btn.primary { padding: .65rem 2rem; background: var(--color-primary); color: #fff; font-size: .92rem; }
.btn.primary:hover { background: var(--color-primary-dark); transform: translateY(-1px); }
.hc-badge {
  display: inline-block; padding: .35rem 1.2rem; font-size: .82rem; font-weight: 600;
  background: var(--color-accent); color: var(--color-primary-dark); border-radius: 50px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/BuilderHub.vue
git commit -m "feat: add BuilderHub entry page with two workbench cards

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: BigComponentEditor — Three-Column Layout Shell

**Files:**
- Create: `src/modules/builder/editor/BigComponentEditor.vue`

**Interfaces:**
- Consumes: ComponentLibrary, EditorCanvas, PropertyPanel (stubs for now)
- Consumes: stageEditor state
- Produces: Full-screen three-column editor layout

- [ ] **Step 1: Create BigComponentEditor.vue with layout shell**

```vue
<!-- src/modules/builder/editor/BigComponentEditor.vue -->
<template>
  <div class="editor-root">
    <!-- Left Panel: Component Library -->
    <aside class="editor-left" :class="{ collapsed: leftCollapsed }">
      <ComponentLibrary v-if="!leftCollapsed" />
      <button class="toggle-btn" @click="leftCollapsed = !leftCollapsed" :title="leftCollapsed ? '展开组件库' : '收起组件库'">
        {{ leftCollapsed ? '▶' : '◀' }}
      </button>
    </aside>

    <!-- Center: Canvas -->
    <main class="editor-center">
      <EditorCanvas />
    </main>

    <!-- Right Panel: Properties -->
    <aside class="editor-right" :class="{ collapsed: !state.selectedId }">
      <PropertyPanel />
    </aside>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ComponentLibrary from './ComponentLibrary.vue'
import EditorCanvas from './EditorCanvas.vue'
import PropertyPanel from './PropertyPanel.vue'
import { state } from './stageEditor.js'

const leftCollapsed = ref(false)
</script>

<style scoped>
.editor-root {
  display: flex; height: calc(100vh - 60px); overflow: hidden;
  background: #e8e4dc;
}
.editor-left {
  position: relative; width: 240px; flex-shrink: 0;
  background: var(--color-card); border-right: 1px solid var(--color-border);
  display: flex; flex-direction: column; overflow-y: auto;
  transition: width var(--transition);
}
.editor-left.collapsed { width: 32px; }
.editor-center { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.editor-right {
  width: 280px; flex-shrink: 0;
  background: var(--color-card); border-left: 1px solid var(--color-border);
  overflow-y: auto; transition: width var(--transition);
}
.editor-right.collapsed { width: 0; border-left: none; }
.toggle-btn {
  position: absolute; top: 8px; right: 4px; z-index: 2;
  width: 24px; height: 24px; border: 1px solid var(--color-border);
  border-radius: 50%; background: var(--color-card); cursor: pointer;
  font-size: 10px; display: grid; place-items: center; color: var(--color-text-light);
  transition: all var(--transition-fast);
}
.toggle-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
</style>
```

- [ ] **Step 2: Create stub components so the editor can render**

```vue
<!-- src/modules/builder/editor/ComponentLibrary.vue (stub) -->
<template>
  <div class="cl-stub" style="padding:1rem;">
    <h3 style="margin:0 0 .5rem;font-size:.95rem;color:var(--color-primary-dark);">组件库</h3>
    <p style="font-size:.82rem;color:var(--color-text-light);">拖拽组件到画布</p>
  </div>
</template>
<script setup></script>
```

```vue
<!-- src/modules/builder/editor/EditorCanvas.vue (stub) -->
<template>
  <div style="flex:1;display:flex;align-items:center;justify-content:center;background:#e8e4dc;">
    <div style="text-align:center;color:var(--color-text-light);">
      <p style="font-size:2rem;margin:0;">🎨</p>
      <p>画布区域</p>
    </div>
  </div>
</template>
<script setup></script>
```

```vue
<!-- src/modules/builder/editor/PropertyPanel.vue (stub) -->
<template>
  <div style="padding:1rem;">
    <h3 style="margin:0 0 .5rem;font-size:.95rem;color:var(--color-primary-dark);">属性</h3>
    <p style="font-size:.82rem;color:var(--color-text-light);">选中组件后编辑</p>
  </div>
</template>
<script setup></script>
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/builder/editor/BigComponentEditor.vue src/modules/builder/editor/ComponentLibrary.vue src/modules/builder/editor/EditorCanvas.vue src/modules/builder/editor/PropertyPanel.vue
git commit -m "feat: add BigComponentEditor three-column layout shell with stubs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: ComponentLibrary — Full Implementation

**Files:**
- Modify: `src/modules/builder/editor/ComponentLibrary.vue`

**Interfaces:**
- Consumes: None (standalone, uses HTML5 D&D to emit component-type)
- Produces: Draggable component cards organized in 13 collapsible categories

- [ ] **Step 1: Replace ComponentLibrary stub with full implementation**

```vue
<!-- src/modules/builder/editor/ComponentLibrary.vue -->
<template>
  <div class="cl-root">
    <div class="cl-header">
      <h3 class="cl-title">可视化组件库</h3>
      <input v-model="search" class="cl-search" placeholder="搜索组件..." />
    </div>

    <div class="cl-categories">
      <details v-for="cat in filteredCategories" :key="cat.id" class="cl-cat" :open="cat.id === 'overview'">
        <summary class="cl-cat-summary">
          <span class="cl-cat-icon">{{ cat.icon }}</span>
          <span class="cl-cat-name">{{ cat.name }}</span>
          <span class="cl-cat-count">{{ cat.items.length }}</span>
        </summary>
        <div class="cl-grid">
          <div
            v-for="item in cat.items"
            :key="item.type + item.label"
            class="cl-item"
            draggable="true"
            @dragstart="onDragStart($event, item)"
          >
            <span class="cl-item-icon">{{ item.icon }}</span>
            <span class="cl-item-label">{{ item.label }}</span>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const COMPONENT_CATEGORIES = [
  {
    id: 'change', icon: '📊', name: '讲「变化」— 帮扶对比',
    items: [
      { label: '哑铃图', icon: '🔗', type: 'chart', chartType: 'bar' },
      { label: '涨跌徽标', icon: '📈', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'overview', icon: '📈', name: '讲「整体画像」— 概览',
    items: [
      { label: 'KPI 卡组', icon: '🃏', type: 'agri-sensor' },
      { label: '雷达图', icon: '🕸️', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'timeline', icon: '⏱️', name: '讲「过程」— 时间线',
    items: [
      { label: '时间轴', icon: '📋', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'composition', icon: '🍩', name: '讲「构成 / 分布」',
    items: [
      { label: '饼图', icon: '🥧', type: 'chart', chartType: 'pie' },
      { label: '堆叠柱', icon: '📊', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'people', icon: '👥', name: '讲「人与故事」',
    items: [
      { label: '人物卡', icon: '👤', type: 'text' },
      { label: '金句块', icon: '💬', type: 'text' },
    ],
  },
  {
    id: 'geo', icon: '🗺️', name: '讲「空间」— 地理分布',
    items: [
      { label: '地图散点', icon: '📍', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'cover', icon: '🎬', name: '封面开场',
    items: [
      { label: '封面大图', icon: '🖼️', type: 'image' },
    ],
  },
  {
    id: 'emphasis', icon: '🔢', name: '单点强调',
    items: [
      { label: '大数字', icon: '🔢', type: 'text' },
    ],
  },
  {
    id: 'flow', icon: '🔀', name: '关系流向',
    items: [
      { label: '桑基图', icon: '〰️', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'frequency', icon: '📅', name: '时间频率',
    items: [
      { label: '日历热力', icon: '🗓️', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'compare', icon: '🔄', name: '交互对比',
    items: [
      { label: '前后对比', icon: '↔️', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'honor', icon: '🏆', name: '荣誉佐证',
    items: [
      { label: '数据表', icon: '📋', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'media', icon: '🎬', name: '媒体嵌入',
    items: [
      { label: '视频嵌入', icon: '▶️', type: 'image' },
    ],
  },
]

const search = ref('')

const filteredCategories = computed(() => {
  if (!search.value.trim()) return COMPONENT_CATEGORIES
  const q = search.value.trim().toLowerCase()
  return COMPONENT_CATEGORIES
    .map(cat => ({
      ...cat,
      items: cat.items.filter(i => i.label.toLowerCase().includes(q)),
    }))
    .filter(cat => cat.items.length)
})

function onDragStart(e, item) {
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('text/plain', JSON.stringify({ type: item.type, chartType: item.chartType }))
}
</script>

<style scoped>
.cl-root { display: flex; flex-direction: column; height: 100%; }
.cl-header { padding: 1rem 1rem .6rem; flex-shrink: 0; }
.cl-title { margin: 0 0 .6rem; font-size: .95rem; color: var(--color-primary-dark); }
.cl-search {
  width: 100%; padding: .45rem .7rem; border: 1px solid var(--color-border);
  border-radius: 8px; font-size: .82rem; outline: none; background: var(--color-bg);
  color: var(--color-text); transition: border-color var(--transition-fast);
}
.cl-search:focus { border-color: var(--color-primary); }
.cl-search::placeholder { color: var(--color-text-light); }

.cl-categories { flex: 1; overflow-y: auto; padding: 0 .6rem .6rem; }
.cl-cat { border-bottom: 1px solid var(--color-border-light); }
.cl-cat-summary {
  display: flex; align-items: center; gap: .4rem; padding: .6rem .4rem;
  cursor: pointer; font-size: .82rem; font-weight: 600; color: var(--color-text-secondary);
  user-select: none; transition: color var(--transition-fast);
}
.cl-cat-summary:hover { color: var(--color-primary-dark); }
.cl-cat-icon { font-size: .9rem; }
.cl-cat-name { flex: 1; }
.cl-cat-count {
  font-size: .7rem; padding: .08rem .45rem; border-radius: 50px;
  background: var(--color-bg); color: var(--color-text-light);
}

.cl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .4rem; padding: 0 .2rem .6rem; }
.cl-item {
  display: flex; flex-direction: column; align-items: center; gap: .25rem;
  padding: .6rem .3rem; border: 1px solid var(--color-border); border-radius: 10px;
  cursor: grab; transition: all var(--transition-fast); background: var(--color-bg);
}
.cl-item:hover { border-color: var(--color-primary); background: var(--color-card); box-shadow: var(--shadow-sm); }
.cl-item:active { cursor: grabbing; transform: scale(.96); }
.cl-item-icon { font-size: 1.3rem; }
.cl-item-label { font-size: .72rem; color: var(--color-text-secondary); font-weight: 500; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/editor/ComponentLibrary.vue
git commit -m "feat: implement ComponentLibrary with 13 categories, search, and drag

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: EditorCanvas — Full Implementation with Rendering

**Files:**
- Modify: `src/modules/builder/editor/EditorCanvas.vue`

**Interfaces:**
- Consumes: `state`, `addComponentAt`, `selectComponent`, `moveComponent`, `resizeComponent`, `selectByRect`, `deleteComponent`, `bringToFront`, `cloneComponent`, `copySelected`, `pasteClipboard`, `undo`, `redo`, `setZoom`, `pushHistory`, `save`, `getSelected` from stageEditor.js
- Consumes: `renderChartSvg` from chartRenderer.js
- Consumes: `renderSensorMarkup` from sensorRenderer.js
- Produces: Full canvas viewport with toolbar, rendering, drag/resize/box-select interactions

- [ ] **Step 1: Replace EditorCanvas stub with full implementation**

```vue
<!-- src/modules/builder/editor/EditorCanvas.vue -->
<template>
  <div class="ec-root">
    <!-- Toolbar -->
    <div class="ec-toolbar">
      <div class="ec-tb-left">
        <button class="tb-btn" @click="goBack" title="返回Hub">← 返回</button>
        <span class="tb-sep"></span>
        <button class="tb-btn" @click="addToCanvas('text')">T 文本</button>
        <button class="tb-btn" @click="addToCanvas('chart')">📊 图表</button>
        <button class="tb-btn" @click="addToCanvas('image')">🖼 图片</button>
        <button class="tb-btn" @click="addToCanvas('agri-sensor')">🌡 传感器</button>
      </div>
      <div class="ec-tb-center">
        <button class="tb-btn" @click="undo" :disabled="state.historyIndex <= 0" title="撤销">↩</button>
        <button class="tb-btn" @click="redo" :disabled="state.historyIndex >= state.history.length - 1" title="重做">↪</button>
      </div>
      <div class="ec-tb-right">
        <select class="tb-select" :value="state.zoom" @change="onZoomChange">
          <option v-for="z in ZOOM_OPTIONS" :key="z" :value="z">{{ Math.round(z * 100) }}%</option>
        </select>
        <span class="tb-sep"></span>
        <button class="tb-btn primary" @click="onSave">💾 保存</button>
        <button class="tb-btn primary" @click="onPreview">👁 预览</button>
      </div>
    </div>

    <!-- Canvas Viewport -->
    <div
      ref="viewportRef"
      class="ec-viewport"
      @drop="onDrop"
      @dragover.prevent="onDragOver"
      @mousedown="onStageMouseDown"
      @mousemove="onStageMouseMove"
      @mouseup="onStageMouseUp"
      @wheel.prevent="onWheel"
      tabindex="0"
    >
      <div class="ec-stage-wrap" :style="stageWrapStyle">
        <div
          ref="stageRef"
          class="ec-stage"
          :style="stageStyle"
          :innerHTML="stageHtml"
        ></div>
      </div>

      <!-- Box selection overlay -->
      <div v-if="boxSelect.active" class="ec-box-select" :style="boxSelectStyle"></div>
    </div>

    <!-- Status Bar -->
    <div class="ec-statusbar">
      <span>{{ state.pageWidth }} × {{ state.pageHeight }}</span>
      <span v-if="state.selectedId">选中: #{{ state.selectedId }}</span>
      <span>{{ state.components.length }} 个组件</span>
    </div>

    <!-- Hidden context menu (simple right-click) -->
    <div v-if="ctxMenu.show" class="ec-ctxmenu" :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }" @click.stop>
      <button @click="ctxDelete">删除</button>
      <button @click="ctxBringToFront">置于顶层</button>
      <button @click="ctxClone">复制</button>
      <button @click="ctxMenu.show = false">取消</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  state, addComponentAt, selectComponent, moveComponent, resizeComponent,
  selectByRect, deleteComponent, bringToFront, cloneComponent,
  copySelected, pasteClipboard, undo, redo, setZoom, pushHistory, save, getSelected,
} from './stageEditor.js'
import { renderChartSvg } from './chartRenderer.js'
import { renderSensorMarkup } from './sensorRenderer.js'

const router = useRouter()
const ZOOM_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

// Refs
const viewportRef = ref(null)
const stageRef = ref(null)

// Drag state
let dragState = null  // { id, startX, startY, origX, origY }
let resizeState = null // { id, handle, startX, startY, origW, origH, origX, origY }
let boxStart = null

// Box select
const boxSelect = ref({ active: false, x: 0, y: 0, w: 0, h: 0 })
const boxSelectStyle = computed(() => ({
  left: boxSelect.value.x + 'px', top: boxSelect.value.y + 'px',
  width: boxSelect.value.w + 'px', height: boxSelect.value.h + 'px',
}))

// Context menu
const ctxMenu = ref({ show: false, x: 0, y: 0, id: null })

// Resize handles
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

// Stage styles
const stageStyle = computed(() => ({
  width: state.pageWidth + 'px',
  height: state.pageHeight + 'px',
  background: state.pageBackground,
}))
const stageWrapStyle = computed(() => ({
  width: state.pageWidth * state.zoom + 'px',
  height: state.pageHeight * state.zoom + 'px',
}))

// ---- Rendering ----

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderComponentMarkup(c) {
  const selected = state.selectedId === c.id
  const selClass = selected ? ' ec-sel' : ''
  const handles = selected ? HANDLES.map(h => `<div class="ec-handle ec-handle-${h}" data-handle="${h}"></div>`).join('') : ''

  let inner = ''
  switch (c.type) {
    case 'text': {
      const p = c.props
      inner = `<div style="width:100%;height:100%;display:flex;align-items:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};justify-content:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};padding:12px;box-sizing:border-box;font-size:${p.fontSize}px;color:${p.color};font-weight:${p.fontWeight};text-align:${p.textAlign};background:${p.backgroundColor};border-radius:4px;overflow:hidden;">${esc(p.text)}</div>`
      break
    }
    case 'image': {
      const p = c.props
      if (p.src) {
        inner = `<img src="${esc(p.src)}" alt="${esc(p.alt)}" style="width:100%;height:100%;object-fit:${p.objectFit};border-radius:${p.borderRadius}px;"/>`
      } else {
        inner = `<div style="width:100%;height:100%;display:grid;place-items:center;background:var(--color-bg);color:var(--color-text-light);font-size:13px;border-radius:${p.borderRadius}px;">🖼 图片占位</div>`
      }
      break
    }
    case 'chart':
      inner = renderChartSvg(c)
      break
    case 'agri-sensor':
      inner = renderSensorMarkup(c)
      break
  }

  return `<div class="ec-component${selClass}" data-component-id="${c.id}" style="position:absolute;left:${c.x}px;top:${c.y}px;width:${c.width}px;height:${c.height}px;overflow:hidden;">${inner}${handles}</div>`
}

const stageHtml = computed(() => {
  return state.components.map(c => renderComponentMarkup(c)).join('')
})

// Watch for changes to rebind events after innerHTML write
watch(stageHtml, () => {
  // Events are bound via delegation on the stage element
})

// ---- Actions ----

function goBack() { router.push('/builder') }
function addToCanvas(type) {
  const cx = state.pageWidth / 2 - 200
  const cy = state.pageHeight / 2 - 150
  addComponentAt(type, cx + Math.random() * 200, cy + Math.random() * 150)
}

function onSave() { save() }
function onPreview() {
  import('./buildPreview.js').then(m => m.buildAndOpen(state))
}

function onZoomChange(e) { setZoom(parseFloat(e.target.value)) }

// ---- Drag from library ----

function onDragOver(e) {
  e.dataTransfer.dropEffect = 'copy'
}

function onDrop(e) {
  e.preventDefault()
  const raw = e.dataTransfer.getData('text/plain')
  if (!raw) return
  let info
  try { info = JSON.parse(raw) } catch { return }
  const rect = viewportRef.value.getBoundingClientRect()
  const x = (e.clientX - rect.left + viewportRef.value.scrollLeft) / state.zoom
  const y = (e.clientY - rect.top + viewportRef.value.scrollTop) / state.zoom
  addComponentAt(info.type, Math.round(x), Math.round(y))
}

// ---- Stage mouse events ----

function getCanvasCoords(e) {
  const rect = viewportRef.value.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left + viewportRef.value.scrollLeft) / state.zoom,
    y: (e.clientY - rect.top + viewportRef.value.scrollTop) / state.zoom,
  }
}

function findTarget(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!el) return null
  // Check for resize handle
  const handleEl = el.closest('[data-handle]')
  if (handleEl) return { type: 'handle', handle: handleEl.dataset.handle }
  // Check for component
  const compEl = el.closest('[data-component-id]')
  if (compEl) return { type: 'component', id: Number(compEl.dataset.componentId) }
  // Check if on stage
  if (el.closest('.ec-stage')) return { type: 'stage' }
  return null
}

function onStageMouseDown(e) {
  if (e.button !== 0) return // left click only
  const target = findTarget(e)
  if (!target) return
  const coords = getCanvasCoords(e)

  if (target.type === 'handle') {
    // Resize
    const id = Number(document.elementFromPoint(e.clientX, e.clientY).closest('[data-component-id]').dataset.componentId)
    const c = state.components.find(c => c.id === id)
    if (!c) return
    pushHistory()
    resizeState = { id, handle: target.handle, startX: e.clientX, startY: e.clientY, origW: c.width, origH: c.height, origX: c.x, origY: c.y }
    selectComponent(id)
  } else if (target.type === 'component') {
    // Move
    const c = state.components.find(c => c.id === target.id)
    if (!c) return
    pushHistory()
    dragState = { id: target.id, startX: e.clientX, startY: e.clientY, origX: c.x, origY: c.y }
    selectComponent(target.id)
    if (e.shiftKey) {
      bringToFront(target.id)
    }
  } else if (target.type === 'stage') {
    // Box select
    boxStart = { x: coords.x, y: coords.y }
    boxSelect.value = { active: true, x: coords.x, y: coords.y, w: 0, h: 0 }
    selectComponent(null)
  }

  // Close context menu
  ctxMenu.value.show = false
}

function onStageMouseMove(e) {
  const coords = getCanvasCoords(e)

  if (dragState) {
    const dx = (e.clientX - dragState.startX) / state.zoom
    const dy = (e.clientY - dragState.startY) / state.zoom
    const c = state.components.find(c => c.id === dragState.id)
    if (c) {
      c.x = Math.max(0, dragState.origX + dx)
      c.y = Math.max(0, dragState.origY + dy)
    }
  }

  if (resizeState) {
    const dx = (e.clientX - resizeState.startX) / state.zoom
    const dy = (e.clientY - resizeState.startY) / state.zoom
    resizeComponent(resizeState.id, resizeState.handle, dx, dy)
  }

  if (boxStart && boxSelect.value.active && coords) {
    const x1 = Math.min(boxStart.x, coords.x)
    const y1 = Math.min(boxStart.y, coords.y)
    boxSelect.value = { active: true, x: x1, y: y1, w: Math.abs(coords.x - boxStart.x), h: Math.abs(coords.y - boxStart.y) }
  }
}

function onStageMouseUp(e) {
  if (dragState) {
    dragState = null
  }
  if (resizeState) {
    resizeState = null
  }
  if (boxStart && boxSelect.value.active) {
    const b = boxSelect.value
    selectByRect(b.x, b.y, b.x + b.w, b.y + b.h)
    boxStart = null
    boxSelect.value = { active: false, x: 0, y: 0, w: 0, h: 0 }
  }
}

function onWheel(e) {
  if (e.ctrlKey) {
    const delta = e.deltaY > 0 ? -0.25 : 0.25
    setZoom(state.zoom + delta)
  }
}

// ---- Keyboard ----

function onKeyDown(e) {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (state.selectedId) deleteComponent(state.selectedId)
  } else if (e.ctrlKey && e.key === 'd') {
    e.preventDefault()
    if (state.selectedId) cloneComponent(state.selectedId)
  } else if (e.ctrlKey && e.key === 'c') {
    copySelected()
  } else if (e.ctrlKey && e.key === 'v') {
    pasteClipboard()
  } else if (e.ctrlKey && e.key === 'z') {
    e.preventDefault()
    undo()
  } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
    e.preventDefault()
    redo()
  }
}

// ---- Context menu ----

function ctxDelete() {
  if (ctxMenu.value.id) deleteComponent(ctxMenu.value.id)
  ctxMenu.value.show = false
}
function ctxBringToFront() {
  if (ctxMenu.value.id) bringToFront(ctxMenu.value.id)
  ctxMenu.value.show = false
}
function ctxClone() {
  if (ctxMenu.value.id) cloneComponent(ctxMenu.value.id)
  ctxMenu.value.show = false
}

// Bind right-click via delegation on the stage element
function onStageContextMenu(e) {
  const target = findTarget(e)
  if (target && target.type === 'component') {
    e.preventDefault()
    ctxMenu.value = { show: true, x: e.clientX, y: e.clientY, id: target.id }
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  // Context menu via event delegation
  if (viewportRef.value) {
    viewportRef.value.addEventListener('contextmenu', onStageContextMenu)
  }
})
</script>

<style scoped>
.ec-root { display: flex; flex-direction: column; height: 100%; outline: none; }

/* Toolbar */
.ec-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: .4rem .8rem; background: var(--color-card);
  border-bottom: 1px solid var(--color-border); flex-shrink: 0; gap: .5rem; flex-wrap: wrap;
}
.ec-tb-left, .ec-tb-center, .ec-tb-right { display: flex; align-items: center; gap: .3rem; }
.tb-btn {
  padding: .35rem .7rem; border: 1px solid var(--color-border); border-radius: 6px;
  background: var(--color-card); color: var(--color-text-secondary); font-size: .78rem;
  font-weight: 500; cursor: pointer; transition: all var(--transition-fast); white-space: nowrap;
}
.tb-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.tb-btn:disabled { opacity: .35; cursor: default; }
.tb-btn.primary { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.tb-btn.primary:hover { background: var(--color-primary-dark); }
.tb-sep { width: 1px; height: 20px; background: var(--color-border); margin: 0 .2rem; }
.tb-select {
  padding: .35rem .5rem; border: 1px solid var(--color-border); border-radius: 6px;
  font-size: .78rem; background: var(--color-card); color: var(--color-text-secondary); cursor: pointer;
}

/* Viewport */
.ec-viewport {
  flex: 1; overflow: auto; position: relative; outline: none;
  background: #d5d1c8;
  background-image: radial-gradient(circle, #c8c4bb 1px, transparent 1px);
  background-size: 20px 20px;
}
.ec-stage-wrap { margin: 40px auto; }
.ec-stage {
  transform-origin: 0 0; box-shadow: 0 4px 30px rgba(0,0,0,.12);
  position: relative;
}
/* Apply zoom transform directly on stage element using a dynamic binding */
.ec-stage-wrap { position: relative; }
.ec-stage {
  transform: v-bind('"scale(" + state.zoom + ")"');
}

/* Components rendered via innerHTML — these are global styles for innerHTML elements */
:deep(.ec-component) { transition: box-shadow .15s; }
:deep(.ec-component.ec-sel) { outline: 2px solid #3b82f6; outline-offset: 1px; z-index: 100; }

/* Resize handles rendered via innerHTML */
:deep(.ec-handle) {
  position: absolute; width: 10px; height: 10px; background: #fff;
  border: 2px solid #3b82f6; border-radius: 2px; z-index: 10;
}
:deep(.ec-handle-nw) { top: -5px; left: -5px; cursor: nw-resize; }
:deep(.ec-handle-n)  { top: -5px; left: 50%; margin-left: -5px; cursor: n-resize; }
:deep(.ec-handle-ne) { top: -5px; right: -5px; cursor: ne-resize; }
:deep(.ec-handle-e)  { top: 50%; margin-top: -5px; right: -5px; cursor: e-resize; }
:deep(.ec-handle-se) { bottom: -5px; right: -5px; cursor: se-resize; }
:deep(.ec-handle-s)  { bottom: -5px; left: 50%; margin-left: -5px; cursor: s-resize; }
:deep(.ec-handle-sw) { bottom: -5px; left: -5px; cursor: sw-resize; }
:deep(.ec-handle-w)  { top: 50%; margin-top: -5px; left: -5px; cursor: w-resize; }

/* Box selection */
.ec-box-select {
  position: absolute; border: 1px dashed #3b82f6;
  background: rgba(59, 130, 246, .08); pointer-events: none; z-index: 999;
}

/* Context menu */
.ec-ctxmenu {
  position: fixed; z-index: 1000; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: 10px;
  box-shadow: var(--shadow-lg); padding: .3rem 0; min-width: 140px;
}
.ec-ctxmenu button {
  display: block; width: 100%; padding: .45rem 1rem; border: none; background: transparent;
  text-align: left; font-size: .82rem; color: var(--color-text-secondary); cursor: pointer;
  transition: background var(--transition-fast);
}
.ec-ctxmenu button:hover { background: var(--color-bg); color: var(--color-text); }

/* Status bar */
.ec-statusbar {
  display: flex; align-items: center; gap: 1.2rem; padding: .3rem .8rem;
  background: var(--color-card); border-top: 1px solid var(--color-border);
  font-size: .74rem; color: var(--color-text-light); flex-shrink: 0;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/editor/EditorCanvas.vue
git commit -m "feat: implement EditorCanvas with rendering, drag, resize, box-select, zoom

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: buildPreview.js — Static HTML Export

**Files:**
- Create: `src/modules/builder/editor/buildPreview.js`

**Interfaces:**
- Consumes: `renderChartSvg` from chartRenderer.js, `renderSensorMarkup` from sensorRenderer.js
- Consumes: state (passed as parameter)
- Produces: `buildPreviewHtml(state)` → complete HTML string
- Produces: `buildAndOpen(state)` → opens Blob URL in new window

- [ ] **Step 1: Create buildPreview.js**

```javascript
// src/modules/builder/editor/buildPreview.js
import { renderChartSvg } from './chartRenderer.js'
import { renderSensorMarkup } from './sensorRenderer.js'

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderComponentHtml(c) {
  let inner = ''
  const p = c.props
  switch (c.type) {
    case 'text':
      inner = `<div style="width:100%;height:100%;display:flex;align-items:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};justify-content:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};padding:12px;box-sizing:border-box;font-size:${p.fontSize}px;color:${p.color};font-weight:${p.fontWeight};text-align:${p.textAlign};background:${p.backgroundColor};border-radius:4px;overflow:hidden;word-wrap:break-word;">${esc(p.text)}</div>`
      break
    case 'image':
      if (p.src) {
        inner = `<img src="${esc(p.src)}" alt="${esc(p.alt)}" style="width:100%;height:100%;object-fit:${p.objectFit};border-radius:${p.borderRadius}px;"/>`
      } else {
        inner = `<div style="width:100%;height:100%;display:grid;place-items:center;background:#f2ede4;color:#8a8a8a;font-size:13px;border-radius:${p.borderRadius}px;">图片占位</div>`
      }
      break
    case 'chart':
      inner = renderChartSvg(c)
      break
    case 'agri-sensor':
      inner = renderSensorMarkup(c)
      break
  }
  return `<div style="position:absolute;left:${c.x}px;top:${c.y}px;width:${c.width}px;height:${c.height}px;overflow:hidden;">${inner}</div>`
}

export function buildPreviewHtml(state) {
  const componentsHtml = state.components.map(c => renderComponentHtml(c)).join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>成果预览</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: "LXGW WenKai", "Noto Serif SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #e8e4dc; display: flex; justify-content: center; padding: 40px;
}
.stage {
  position: relative; width: ${state.pageWidth}px; height: ${state.pageHeight}px;
  background: ${state.pageBackground}; box-shadow: 0 12px 48px rgba(77,107,62,0.14);
  overflow: hidden;
}
</style>
</head>
<body>
<div class="stage">
${componentsHtml}
</div>
</body>
</html>`
}

export function buildAndOpen(state) {
  const html = buildPreviewHtml(state)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/editor/buildPreview.js
git commit -m "feat: add buildPreview for static HTML export via Blob URL

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: PropertyPanel — Full Implementation

**Files:**
- Modify: `src/modules/builder/editor/PropertyPanel.vue`

**Interfaces:**
- Consumes: `state`, `getSelected` from stageEditor.js
- Produces: Property panel with per-type forms bound via v-model to reactive state

- [ ] **Step 1: Replace PropertyPanel stub with full implementation**

```vue
<!-- src/modules/builder/editor/PropertyPanel.vue -->
<template>
  <div class="pp-root">
    <!-- No selection: canvas settings -->
    <template v-if="!comp">
      <div class="pp-section">
        <h3 class="pp-title">📐 画布设置</h3>
        <div class="pp-field">
          <label>宽度</label>
          <input type="number" v-model.number="state.pageWidth" min="400" max="7680" />
        </div>
        <div class="pp-field">
          <label>高度</label>
          <input type="number" v-model.number="state.pageHeight" min="300" max="4320" />
        </div>
        <div class="pp-field">
          <label>背景色</label>
          <input type="color" v-model="state.pageBackground" />
        </div>
      </div>
      <div class="pp-section">
        <p class="pp-stat">共 {{ state.components.length }} 个组件</p>
        <p class="pp-hint">从左侧拖入组件到画布，点击组件查看属性</p>
      </div>
    </template>

    <!-- Selected component -->
    <template v-else>
      <div class="pp-section">
        <h3 class="pp-title">
          <span>{{ typeLabel(comp.type) }}</span>
          <button class="pp-del" @click="deleteComponent(comp.id)" title="删除组件">🗑</button>
        </h3>

        <!-- Position & Size (all types) -->
        <div class="pp-field-row">
          <div class="pp-field">
            <label>X</label>
            <input type="number" v-model.number="comp.x" />
          </div>
          <div class="pp-field">
            <label>Y</label>
            <input type="number" v-model.number="comp.y" />
          </div>
        </div>
        <div class="pp-field-row">
          <div class="pp-field">
            <label>宽</label>
            <input type="number" v-model.number="comp.width" min="20" />
          </div>
          <div class="pp-field">
            <label>高</label>
            <input type="number" v-model.number="comp.height" min="20" />
          </div>
        </div>
      </div>

      <!-- Text props -->
      <div v-if="comp.type === 'text'" class="pp-section">
        <h4 class="pp-subtitle">文本内容</h4>
        <div class="pp-field">
          <textarea v-model="comp.props.text" rows="3"></textarea>
        </div>
        <h4 class="pp-subtitle">样式</h4>
        <div class="pp-field-row">
          <div class="pp-field">
            <label>字号</label>
            <input type="number" v-model.number="comp.props.fontSize" min="8" max="200" />
          </div>
          <div class="pp-field">
            <label>粗细</label>
            <select v-model.number="comp.props.fontWeight">
              <option :value="400">常规</option>
              <option :value="700">粗体</option>
              <option :value="900">特粗</option>
            </select>
          </div>
        </div>
        <div class="pp-field">
          <label>颜色</label>
          <input type="color" v-model="comp.props.color" />
        </div>
        <div class="pp-field">
          <label>对齐</label>
          <select v-model="comp.props.textAlign">
            <option value="left">左对齐</option>
            <option value="center">居中</option>
            <option value="right">右对齐</option>
          </select>
        </div>
        <div class="pp-field">
          <label>背景色</label>
          <input type="color" v-model="comp.props.backgroundColor" />
        </div>
      </div>

      <!-- Image props -->
      <div v-if="comp.type === 'image'" class="pp-section">
        <div class="pp-field">
          <label>图片 URL</label>
          <input type="text" v-model="comp.props.src" placeholder="https://..." />
        </div>
        <div class="pp-field">
          <label>替代文本</label>
          <input type="text" v-model="comp.props.alt" placeholder="图片描述" />
        </div>
        <div class="pp-field">
          <label>填充模式</label>
          <select v-model="comp.props.objectFit">
            <option value="cover">Cover 裁剪</option>
            <option value="contain">Contain 完整</option>
            <option value="fill">Fill 拉伸</option>
          </select>
        </div>
        <div class="pp-field">
          <label>圆角 (px)</label>
          <input type="number" v-model.number="comp.props.borderRadius" min="0" />
        </div>
        <div class="pp-field">
          <label class="pp-check">
            <input type="checkbox" v-model="comp.props.autoRefresh" />
            自动刷新
          </label>
        </div>
        <div v-if="comp.props.autoRefresh" class="pp-field">
          <label>刷新间隔 (秒)</label>
          <input type="number" v-model.number="comp.props.refreshInterval" min="5" />
        </div>
      </div>

      <!-- Chart props -->
      <div v-if="comp.type === 'chart'" class="pp-section">
        <div class="pp-field">
          <label>标题</label>
          <input type="text" v-model="comp.props.title" />
        </div>
        <div class="pp-field">
          <label>图表类型</label>
          <select v-model="comp.props.chartType">
            <option value="bar">柱状图</option>
            <option value="pie">饼图</option>
            <option value="line">折线图</option>
          </select>
        </div>
        <div class="pp-field">
          <label>CSV 数据</label>
          <textarea v-model="comp.props.csvText" rows="6" style="font-family:monospace;font-size:12px;"></textarea>
        </div>
      </div>

      <!-- Sensor props -->
      <div v-if="comp.type === 'agri-sensor'" class="pp-section">
        <div class="pp-field">
          <label>标题</label>
          <input type="text" v-model="comp.props.title" />
        </div>
        <h4 class="pp-subtitle">
          传感器列表
          <button class="pp-add" @click="addSensor(comp)">+ 添加</button>
        </h4>
        <div v-for="(s, i) in comp.props.sensors" :key="i" class="pp-sensor-row">
          <input type="text" v-model="s.name" placeholder="名称" class="pp-sr-name" />
          <input type="number" v-model.number="s.value" placeholder="值" class="pp-sr-val" />
          <input type="text" v-model="s.unit" placeholder="单位" class="pp-sr-unit" />
          <select v-model="s.status" class="pp-sr-status">
            <option value="normal">正常</option>
            <option value="warning">注意</option>
            <option value="error">异常</option>
          </select>
          <button class="pp-sr-del" @click="removeSensor(comp, i)">×</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { state, getSelected, deleteComponent } from './stageEditor.js'

const comp = computed(() => getSelected())

function typeLabel(type) {
  const labels = { text: '📝 文本', image: '🖼 图片', chart: '📊 图表', 'agri-sensor': '🌡 传感器' }
  return labels[type] || type
}

function addSensor(comp) {
  comp.props.sensors.push({ name: '', value: 0, unit: '', status: 'normal' })
}

function removeSensor(comp, index) {
  comp.props.sensors.splice(index, 1)
}
</script>

<style scoped>
.pp-root { padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
.pp-section {
  padding-bottom: 1rem; border-bottom: 1px solid var(--color-border-light);
}
.pp-section:last-child { border-bottom: none; }
.pp-title {
  margin: 0 0 .8rem; font-size: .95rem; color: var(--color-primary-dark);
  display: flex; align-items: center; justify-content: space-between;
}
.pp-subtitle {
  margin: .8rem 0 .5rem; font-size: .82rem; color: var(--color-text-light);
  font-weight: 600; display: flex; align-items: center; justify-content: space-between;
}
.pp-field { display: flex; flex-direction: column; gap: .25rem; margin-bottom: .6rem; }
.pp-field label { font-size: .76rem; color: var(--color-text-light); font-weight: 500; }
.pp-field input[type="text"],
.pp-field input[type="number"],
.pp-field textarea,
.pp-field select {
  padding: .4rem .55rem; border: 1px solid var(--color-border); border-radius: 6px;
  font-size: .82rem; outline: none; background: var(--color-bg); color: var(--color-text);
  transition: border-color var(--transition-fast);
}
.pp-field input:focus, .pp-field textarea:focus, .pp-field select:focus { border-color: var(--color-primary); }
.pp-field textarea { resize: vertical; min-height: 60px; }
.pp-field input[type="color"] { width: 40px; height: 30px; padding: 2px; cursor: pointer; }
.pp-field-row { display: flex; gap: .5rem; }
.pp-field-row .pp-field { flex: 1; }
.pp-check { display: flex; flex-direction: row; align-items: center; gap: .4rem; cursor: pointer; }
.pp-check input[type="checkbox"] { width: auto; }

.pp-stat { font-size: .82rem; color: var(--color-text-secondary); margin: 0; }
.pp-hint { font-size: .76rem; color: var(--color-text-light); margin: .4rem 0 0; line-height: 1.5; }

.pp-del {
  border: none; background: transparent; cursor: pointer; font-size: 1rem;
  opacity: .5; transition: opacity var(--transition-fast);
}
.pp-del:hover { opacity: 1; }

.pp-add {
  border: 1px solid var(--color-primary); border-radius: 4px; padding: .1rem .45rem;
  background: transparent; color: var(--color-primary); font-size: .72rem; cursor: pointer;
  font-weight: 600;
}
.pp-add:hover { background: var(--color-primary); color: #fff; }

.pp-sensor-row { display: flex; gap: .3rem; margin-bottom: .4rem; align-items: center; }
.pp-sr-name { flex: 2; }
.pp-sr-val { flex: 1; }
.pp-sr-unit { flex: 1; }
.pp-sr-status { flex: 1.2; }
.pp-sensor-row input, .pp-sensor-row select {
  padding: .3rem .4rem; border: 1px solid var(--color-border); border-radius: 4px;
  font-size: .76rem; outline: none; background: var(--color-bg); color: var(--color-text);
}
.pp-sensor-row input:focus, .pp-sensor-row select:focus { border-color: var(--color-primary); }
.pp-sr-del {
  border: none; background: transparent; cursor: pointer; color: var(--color-text-light);
  font-size: 1rem; padding: 0 .2rem;
}
.pp-sr-del:hover { color: var(--color-highlight); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/editor/PropertyPanel.vue
git commit -m "feat: implement PropertyPanel with per-type forms and canvas settings

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: Integration — Wire Up Load on Editor Mount, Fix Missing Imports, Smoke Test

**Files:**
- Modify: `src/modules/builder/editor/BigComponentEditor.vue` (add onMounted load)

**Interfaces:**
- Consumes: `load` from stageEditor.js

- [ ] **Step 1: Add auto-load in BigComponentEditor**

```javascript
// Add to BigComponentEditor.vue <script setup>:
import { onMounted } from 'vue'
import { load } from './stageEditor.js'

onMounted(() => {
  load() // Restore from localStorage if available
})
```

- [ ] **Step 2: Run all builder tests**

```bash
npx vitest run src/__tests__/builder-*.test.js
```

Expected: All tests PASS

- [ ] **Step 3: Start dev server and smoke test**

```bash
npm run dev
```

Manual verification:
- Visit `http://localhost:5173/#/builder` → Hub page with two cards
- Click "进入编辑" → Editor with three-column layout
- Drag component from left library to canvas → appears on canvas
- Click component → blue outline, right panel shows properties
- Edit text in property panel → canvas updates in real-time
- Move component by dragging → position updates
- Box-select on canvas blank area → selects component
- Ctrl+Z → undo, Ctrl+D → clone
- Click "预览" → new window with static HTML
- Click "保存" → refresh page → components restored
- Visit other routes → SiteHeader works, existing modules unaffected

- [ ] **Step 4: Commit final integration**

```bash
git add src/modules/builder/editor/BigComponentEditor.vue
git commit -m "feat: add auto-load on editor mount, final integration

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Verification Checklist

1. `npx vitest run` — all existing + new tests pass
2. `npm run dev` — Hub page at `/#/builder` renders correctly
3. Drag component from library to canvas — appears at drop position
4. Click component — blue selection outline, property panel shows correct form
5. Edit properties — canvas updates in real-time
6. Move/resize components via drag and handles
7. Ctrl+Z/Ctrl+Y — undo/redo works
8. Ctrl+C/Ctrl+V/Del — clipboard operations work
9. Save → refresh → components restored from localStorage
10. Preview → new window with static HTML (no editor UI)
11. Existing routes (villages, practice, etc.) unaffected
