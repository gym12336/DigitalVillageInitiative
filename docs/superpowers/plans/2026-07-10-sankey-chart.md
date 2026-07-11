# 桑基图（Sankey Diagram）组件 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 builder 编辑器中实现桑基图 chart 类型，以带宽曲线展示来源→去向的流向关系数据。

**Architecture:** 桑基图作为 `chart` 类型的子类型（`chartType: 'sankey'`），数据用 CSV 三元组（source,target,value），渲染逻辑内联在 chartRenderer.js。改动 3 个文件，复用现有 PropertyPanel 图表属性编辑器。

**Tech Stack:** Vanilla JS (SVG string generation)，Vue 3 (ComponentLibrary.vue)

## Global Constraints

- 遵循 chartRenderer.js 现有 SVG 渲染模式（纯函数，返回 SVG 字符串）
- 使用现有 `COLORS` 调色板
- CSV 列名：`source`, `target`, `value`
- 节点布局：左侧来源、右侧去向，单层流向

---

### Task 1: 修正 ComponentLibrary.vue 中桑基图的 chartType

**Files:**
- Modify: `src/modules/builder/editor/ComponentLibrary.vue:91-93`

**Interfaces:**
- Consumes: 无
- Produces: 桑基图条目从 placeholder `chartType: 'bar'` 修正为 `chartType: 'sankey'`

- [ ] **Step 1: 修改 chartType**

在 `src/modules/builder/editor/ComponentLibrary.vue` 第 91-93 行，将桑基图条目的 `chartType` 从 `'bar'` 改为 `'sankey'`：

```js
// 修改前（第 91-93 行）：
  { label: '桑基图', icon: '〰️', type: 'chart', chartType: 'bar' },

// 修改后：
  { label: '桑基图', icon: '〰️', type: 'chart', chartType: 'sankey' },
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/editor/ComponentLibrary.vue
git commit -m "fix: wire sankey chartType in component library"
```

---

### Task 2: 在 componentFactory.js 中添加桑基图默认 CSV 数据

**Files:**
- Modify: `src/modules/builder/editor/componentFactory.js:67-75`（在 `defaultCsvFor` 的 switch 中添加 case）

**Interfaces:**
- Consumes: 无
- Produces: `defaultCsvFor('sankey')` 返回 5 条示例流向数据的 CSV 字符串

- [ ] **Step 1: 在 defaultCsvFor 函数中添加 sankey case**

在 `src/modules/builder/editor/componentFactory.js` 的 `defaultCsvFor` 函数中，在 `case 'radar':` 之后添加 `case 'sankey':`：

```js
// 在 case 'radar': 的 return 语句之后（第 73 行后），default 之前添加：
    case 'sankey':
      return 'source,target,value\n产业收入,基础设施建设,120\n产业收入,教育投入,80\n产业收入,医疗健康,50\n政策补贴,基础设施建设,60\n政策补贴,教育投入,40\n社会捐赠,医疗健康,30'
```

完整上下文（修改后的 `defaultCsvFor` 函数）：

```js
function defaultCsvFor(chartType) {
  switch (chartType) {
    case 'pie':           return 'label,value\n类别A,35\n类别B,68\n类别C,42\n类别D,55\n类别E,27'
    case 'stacked-bar':   return 'label,系列1,系列2,系列3\n一月,10,20,15\n二月,25,30,20\n三月,35,28,22'
    case 'dumbbell':      return 'label,start,end\n茶叶产量,120,210\n农户年收入,8000,18500\n合作社数量,3,12\n村集体资产,50,320'
    case 'trend-badge':   return 'label,value,change\n销售额,128,560,+12.5%\n用户数,42,091,+8.3%\n转化率,3.28%,-0.5%'
    case 'radar':         return 'label,产业兴旺,生态宜居,乡风文明,治理有效,生活富裕\n李家村,80,65,72,88,70\n全县平均,60,55,58,62,50'
    case 'sankey':        return 'source,target,value\n产业收入,基础设施建设,120\n产业收入,教育投入,80\n产业收入,医疗健康,50\n政策补贴,基础设施建设,60\n政策补贴,教育投入,40\n社会捐赠,医疗健康,30'
    default:              return 'label,value\n类别A,35\n类别B,68\n类别C,42\n类别D,55\n类别E,27'
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/editor/componentFactory.js
git commit -m "feat: add default sankey CSV sample data"
```

---

### Task 3: 在 chartRenderer.js 中添加桑基图解析器和 SVG 渲染器

**Files:**
- Modify: `src/modules/builder/editor/chartRenderer.js`

**Interfaces:**
- Consumes: `COLORS`（文件顶部常量）
- Produces:
  - `parseCSVSankey(csvText: string): { sourceNodes: {name, total}[], targetNodes: {name, total}[], links: {source, target, value}[], maxFlow: number }`
  - `renderSankeyChart(data, w, h, opts): string` — 返回完整 SVG 字符串
  - `renderChartSvg` 的 switch 中新增 `case 'sankey':` 分支

- [ ] **Step 1: 在 chartRenderer.js 末尾（renderRadarChart 之后，renderChartSvg 之前）添加 parseCSVSankey**

在 `renderRadarChart` 函数结束的 `}` 之后（约第 536 行），`renderChartSvg` 函数之前，插入：

```js
export function parseCSVSankey(csvText) {
  const lines = csvText.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return { sourceNodes: [], targetNodes: [], links: [], maxFlow: 0 }

  const headers = lines[0].split(',').map(h => h.trim())
  const sourceIdx = headers.indexOf('source')
  const targetIdx = headers.indexOf('target')
  const valueIdx = headers.indexOf('value')

  if (sourceIdx === -1 || targetIdx === -1 || valueIdx === -1) {
    return { sourceNodes: [], targetNodes: [], links: [], maxFlow: 0 }
  }

  const links = []
  const sourceTotals = new Map()
  const targetTotals = new Map()

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim())
    const source = cols[sourceIdx]
    const target = cols[targetIdx]
    const value = parseFloat(cols[valueIdx]) || 0

    if (!source || !target || value <= 0) continue

    links.push({ source, target, value })
    sourceTotals.set(source, (sourceTotals.get(source) || 0) + value)
    targetTotals.set(target, (targetTotals.get(target) || 0) + value)
  }

  if (links.length === 0) {
    return { sourceNodes: [], targetNodes: [], links: [], maxFlow: 0 }
  }

  const sourceNodes = [...sourceTotals.entries()].map(([name, total]) => ({ name, total }))
  const targetNodes = [...targetTotals.entries()].map(([name, total]) => ({ name, total }))

  const sourceTotal = sourceNodes.reduce((s, n) => s + n.total, 0)
  const targetTotal = targetNodes.reduce((s, n) => s + n.total, 0)
  const maxFlow = Math.max(sourceTotal, targetTotal)

  return { sourceNodes, targetNodes, links, maxFlow }
}
```

- [ ] **Step 2: 添加 renderSankeyChart 函数**

紧接在 `parseCSVSankey` 之后、`renderChartSvg` 之前，插入 `renderSankeyChart`：

```js
export function renderSankeyChart(data, w, h, { title = '' } = {}) {
  const { sourceNodes, targetNodes, links, maxFlow } = data

  if (sourceNodes.length === 0 && targetNodes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" fill="#f8fbfd"/>
      <text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-size="14" fill="#687b8b">无数据</text>
    </svg>`
  }

  const pad = { top: title ? 44 : 24, bottom: 20, left: 80, right: 80 }
  const nodeW = 18
  const chartH = h - pad.top - pad.bottom
  const flowScale = chartH / maxFlow

  const sourceX = pad.left
  const sourceRightX = sourceX + nodeW
  const targetRightX = w - pad.right
  const targetLeftX = targetRightX - nodeW

  // Position source nodes — stack vertically
  let sy = pad.top
  const sourcePosMap = new Map()
  sourceNodes.forEach((node) => {
    const nh = Math.max(16, node.total * flowScale)
    sourcePosMap.set(node.name, { y: sy, h: nh })
    sy += nh + 12
  })

  // Position target nodes — stack vertically
  let ty = pad.top
  const targetPosMap = new Map()
  targetNodes.forEach((node) => {
    const nh = Math.max(16, node.total * flowScale)
    targetPosMap.set(node.name, { y: ty, h: nh })
    ty += nh + 12
  })

  // Draw flow bands — filled bezier paths, one per link
  const sourceOffsets = new Map(sourceNodes.map(n => [n.name, 0]))
  const targetOffsets = new Map(targetNodes.map(n => [n.name, 0]))

  let bands = ''
  links.forEach((link) => {
    const s = sourcePosMap.get(link.source)
    const t = targetPosMap.get(link.target)
    if (!s || !t) return

    const sTotal = sourceNodes.find(n => n.name === link.source).total
    const tTotal = targetNodes.find(n => n.name === link.target).total

    const h1 = (link.value / sTotal) * s.h
    const h2 = (link.value / tTotal) * t.h

    const y1 = s.y + sourceOffsets.get(link.source)
    const y2 = t.y + targetOffsets.get(link.target)

    const colorIdx = sourceNodes.findIndex(n => n.name === link.source)
    const color = COLORS[colorIdx % COLORS.length]

    const cp1x = sourceRightX + (targetLeftX - sourceRightX) * 0.4
    const cp2x = sourceRightX + (targetLeftX - sourceRightX) * 0.6

    bands += `<path d="M${sourceRightX},${y1} C${cp1x},${y1} ${cp2x},${y2} ${targetLeftX},${y2} L${targetLeftX},${y2 + h2} C${cp2x},${y1 + h1} ${cp1x},${y1 + h1} ${sourceRightX},${y1 + h1} Z" fill="${color}" fill-opacity="0.35" stroke="${color}" stroke-opacity="0.5" stroke-width="0.5"/>`

    sourceOffsets.set(link.source, sourceOffsets.get(link.source) + h1)
    targetOffsets.set(link.target, targetOffsets.get(link.target) + h2)
  })

  // Draw node rectangles and labels
  let nodesSvg = ''
  sourceNodes.forEach((n, i) => {
    const p = sourcePosMap.get(n.name)
    const color = COLORS[i % COLORS.length]
    nodesSvg += `<rect x="${sourceX}" y="${p.y}" width="${nodeW}" height="${p.h}" rx="3" fill="${color}"/>`
    nodesSvg += `<text x="${sourceX - 6}" y="${p.y + p.h / 2 + 4}" text-anchor="end" font-size="12" fill="#627586">${n.name}</text>`
  })

  targetNodes.forEach((n, i) => {
    const p = targetPosMap.get(n.name)
    const color = COLORS[(i + sourceNodes.length) % COLORS.length]
    nodesSvg += `<rect x="${targetLeftX}" y="${p.y}" width="${nodeW}" height="${p.h}" rx="3" fill="${color}"/>`
    nodesSvg += `<text x="${targetRightX + 6}" y="${p.y + p.h / 2 + 4}" text-anchor="start" font-size="12" fill="#627586">${n.name}</text>`
  })

  // Title
  let titleSvg = ''
  if (title) {
    titleSvg = `<text x="${w / 2}" y="20" text-anchor="middle" font-size="14" font-weight="600" fill="#1c2834">${title}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#fafdfe"/>
    ${titleSvg}
    ${bands}
    ${nodesSvg}
  </svg>`
}
```

- [ ] **Step 3: 在 renderChartSvg 的 switch 中接入 sankey 分支**

在 `renderChartSvg` 函数的 switch 中（约第 548 行），在 `case 'radar':` 块之后、`case 'bar':` 之前插入：

```js
    case 'sankey': {
      const data = parseCSVSankey(props.csvText)
      return data.links.length ? renderSankeyChart(data, width, height, opts) : emptySvg
    }
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/builder/editor/chartRenderer.js
git commit -m "feat: add sankey chart renderer with parseCSVSankey and renderSankeyChart"
```

---

### Task 4: 验证端到端

**Files:**
- 无新建文件，验证所有改动串联正确

**Interfaces:**
- Consumes: Task 1/2/3 的所有产出
- Produces: 验证通过

- [ ] **Step 1: 确认 componentFactory 正确创建 sankey 组件**

在 Node.js 中快速验证（或通过 browser devtools）：

```bash
# 启动开发服务器，在浏览器中验证
cd c:/Users/ALICE/Desktop/DigitalVillageInitiative && npm run dev
```

- [ ] **Step 2: 在 builder 编辑器中手动验证**

1. 打开 builder 编辑器页面
2. 展开「关系流向」分类
3. 将「桑基图」拖入画布
4. 确认默认渲染出桑基图（3 个来源、3 个去向节点）
5. 在属性面板修改 CSV 数据，确认图表实时更新
6. 点击预览按钮，确认预览中有桑基图

- [ ] **Step 3: Commit 验证结果（如有微调）**

```bash
git add -A
git commit -m "chore: verify sankey chart end-to-end"
```
