# 大组件编辑台 · 科技蓝 UI 重设计 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 builder 编辑器的四件套（BigComponentEditor、EditorCanvas、ComponentLibrary、PropertyPanel）及其 JS 渲染器（chartRenderer、sensorRenderer、buildPreview）从暖色田园风重构为深色科技蓝大屏编辑器风格。

**Architecture:** 在 `BigComponentEditor.vue` 的 `.editor-root` 上覆盖 CSS 变量，子组件零变量名修改。硬编码颜色（渲染器 JS + `:deep()` 样式 + 画布背景）在各自文件中直接替换。无新依赖、无逻辑改动。

**Tech Stack:** Vue 3.5 + 原生 CSS（CSS 变量覆盖机制）

**Source Spec:** `docs/superpowers/specs/2026-07-09-builder-editor-tech-blue-redesign.md`

## Global Constraints

- 仅修改 `src/modules/builder/editor/` 目录下的文件
- 不改动 `BuilderHub.vue`、`theme.css`、项目其余模块
- 零新依赖
- Vue 3 Composition API（`<script setup>`），不涉及脚本逻辑改动
- 提交格式：`style: description` + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: BigComponentEditor.vue — CSS 变量覆盖 + 外壳重设计

**Files:**
- Modify: `src/modules/builder/editor/BigComponentEditor.vue`

**Interfaces:**
- Consumes: 无（此任务为所有子组件提供 CSS 变量覆盖）
- Produces: `.editor-root` 上定义的 tech-blue CSS 变量，子组件自动继承

- [ ] **Step 1: 替换 `<style scoped>` 块**

将现有 `<style scoped>` 完整替换为：

```css
/* ============ 编辑器科技蓝 CSS 变量覆盖 ============ */
.editor-root {
  /* —— 基础配色 —— */
  --color-bg: #f2f6f8;
  --color-bg-deep: #edf2f7;
  --color-primary: #2c7da0;
  --color-primary-soft: #4aa3c0;
  --color-primary-dark: #245a73;
  --color-primary-deep: #1a3f50;
  --color-secondary: #56ccf2;
  --color-secondary-soft: #a8e0f8;
  --color-accent: rgba(44,125,160,0.10);
  --color-accent-soft: rgba(44,125,160,0.05);
  --color-highlight: #c0392b;
  --color-highlight-soft: #e08070;
  --color-card: rgba(255,255,255,0.92);
  --color-text: #1c2834;
  --color-text-secondary: #627586;
  --color-text-light: #687b8b;
  --color-border: rgba(44,125,160,0.12);
  --color-border-light: rgba(44,125,160,0.06);

  /* —— 阴影 —— */
  --shadow-xs: 0 1px 3px rgba(36,90,115,0.04);
  --shadow-sm: 0 2px 8px rgba(36,90,115,0.06);
  --shadow-card: 0 4px 24px rgba(36,90,115,0.08);
  --shadow-card-hover: 0 8px 40px rgba(36,90,115,0.14);
  --shadow-lg: 0 12px 48px rgba(36,90,115,0.15);
  --shadow-xl: 0 20px 60px rgba(36,90,115,0.22);

  /* —— 编辑器专用变量 —— */
  --editor-topbar-bg: rgba(18,28,39,0.92);
  --editor-topbar-shadow: 0 18px 50px rgba(0,0,0,0.15);
  --editor-canvas-grid-line: rgba(101,126,152,0.08);
  --editor-select-glow: rgba(44,125,160,0.26);
  --editor-select-bg: rgba(44,125,160,0.06);
  --editor-input-focus-glow: rgba(44,125,160,0.12);

  /* —— 布局 —— */
  display: flex;
  height: calc(100vh - 60px);
  overflow: hidden;

  /* 三重渐变叠加 — 科技光晕感 */
  background:
    radial-gradient(circle at top left, rgba(88,164,176,0.22), transparent 30%),
    radial-gradient(circle at bottom right, rgba(236,184,101,0.22), transparent 34%),
    linear-gradient(145deg, #f2f6f8, #edf2f7, #f8fbfd);
}

/* ============ 左侧面板：组件库 ============ */
.editor-left {
  position: relative;
  width: 260px;
  flex-shrink: 0;
  margin: 12px 0 12px 12px;
  background: var(--color-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  transition: width var(--transition);
}
.editor-left.collapsed {
  width: 36px;
  margin-right: 0;
}

/* ============ 中间：画布 ============ */
.editor-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 12px 8px;
}

/* ============ 右侧面板：属性 ============ */
.editor-right {
  width: 300px;
  flex-shrink: 0;
  margin: 12px 12px 12px 0;
  background: var(--color-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  box-shadow: var(--shadow-card);
  overflow-y: auto;
  transition: width var(--transition);
}
.editor-right.collapsed {
  width: 0;
  margin: 12px 0;
  border: none;
  box-shadow: none;
}

/* ============ 折叠按钮 ============ */
.toggle-btn {
  position: absolute;
  top: 12px;
  right: 6px;
  z-index: 2;
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-card);
  cursor: pointer;
  font-size: 10px;
  display: grid;
  place-items: center;
  color: var(--color-text-light);
  transition: all var(--transition-fast);
}
.toggle-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}
```

- [ ] **Step 2: 验证 — 启动 dev server，检查编辑器外壳**

```bash
npm run dev
```

访问 `http://localhost:5173/#/builder/editor`：
- 页面背景有三重渐变光晕
- 左右面板为 24px 大圆角毛玻璃卡片，悬浮在背景之上
- 折叠按钮为全圆角药丸形

- [ ] **Step 3: Commit**

```bash
git add src/modules/builder/editor/BigComponentEditor.vue
git commit -m "style: redesign editor shell with tech-blue CSS variables and glass panels

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: EditorCanvas.vue — 顶栏 + 画布 + 组件样式

**Files:**
- Modify: `src/modules/builder/editor/EditorCanvas.vue`

**Interfaces:**
- Consumes: Task 1 的 CSS 变量覆盖（通过继承 `.editor-root`）
- Produces: 科技蓝画布视口、深色顶栏、组件选中光晕、缩放手柄

- [ ] **Step 1: 替换 `<style scoped>` 块**

将现有 `<style scoped>` 完整替换为：

```css
.ec-root { display: flex; flex-direction: column; height: 100%; outline: none; }

/* ============ 顶栏 ============ */
.ec-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.5rem 1rem; gap: 0.5rem; flex-wrap: wrap; flex-shrink: 0;
  background: var(--editor-topbar-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: var(--editor-topbar-shadow);
  border-radius: 20px;
}
.ec-tb-left, .ec-tb-center, .ec-tb-right {
  display: flex; align-items: center; gap: 0.35rem;
}

/* 小标签 SCREEN BUILDER */
.ec-tb-left::before {
  content: 'SCREEN BUILDER';
  font-size: 11px; font-weight: 700; color: #2c7da0;
  text-transform: uppercase; letter-spacing: 0.1em;
  margin-right: 0.5rem;
  opacity: 0.85;
}

.tb-btn {
  padding: 0.4rem 0.9rem;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 999px;
  background: transparent;
  color: rgba(255,255,255,0.85);
  font-size: 0.78rem; font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}
.tb-btn:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.25);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.tb-btn:disabled { opacity: 0.3; cursor: default; transform: none; box-shadow: none; }
.tb-btn.primary {
  background: #2c7da0;
  color: #fff;
  border-color: #2c7da0;
}
.tb-btn.primary:hover {
  background: #245a73;
  border-color: #245a73;
}
.tb-sep {
  width: 1px; height: 20px;
  background: rgba(255,255,255,0.12);
  margin: 0 0.25rem;
}
.tb-select {
  padding: 0.4rem 0.6rem;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 12px;
  font-size: 0.78rem;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.85);
  cursor: pointer;
  outline: none;
  transition: border-color var(--transition-fast);
}
.tb-select:hover, .tb-select:focus {
  border-color: rgba(255,255,255,0.3);
}
.tb-select option { background: #1c2834; color: #fff; }

/* ============ 画布视口 ============ */
.ec-viewport {
  flex: 1; overflow: auto; position: relative; outline: none;
  margin: 12px 0;
  border-radius: 20px;
  background:
    linear-gradient(90deg, var(--editor-canvas-grid-line) 1px, transparent 1px),
    linear-gradient(var(--editor-canvas-grid-line) 1px, transparent 1px),
    linear-gradient(145deg, #f8fbfd, #edf3f7);
  background-size: 24px 24px, 24px 24px, auto;
}

/* ============ Stage ============ */
.ec-stage-wrap { margin: 48px auto; }
.ec-stage {
  transform-origin: 0 0;
  position: relative;
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 1px rgba(0,0,0,0.04),
    0 26px 60px rgba(36,90,115,0.18);
}

/* ============ 画布中组件（innerHTML 全局样式） ============ */
:deep(.ec-component) {
  border-radius: 18px;
  transition: box-shadow 0.18s, transform 0.18s;
}
:deep(.ec-component:hover) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(36,90,115,0.12);
}
:deep(.ec-component.ec-sel) {
  box-shadow: 0 0 0 3px var(--editor-select-glow);
  z-index: 100;
}

/* ============ 缩放手柄 ============ */
:deep(.ec-handle) {
  position: absolute; width: 10px; height: 10px;
  background: #ffffff;
  border: 2px solid #2c7da0;
  border-radius: 4px;
  z-index: 10;
}
:deep(.ec-handle-nw) { top: -5px; left: -5px; cursor: nw-resize; }
:deep(.ec-handle-n)  { top: -5px; left: 50%; margin-left: -5px; cursor: n-resize; }
:deep(.ec-handle-ne) { top: -5px; right: -5px; cursor: ne-resize; }
:deep(.ec-handle-e)  { top: 50%; margin-top: -5px; right: -5px; cursor: e-resize; }
:deep(.ec-handle-se) { bottom: -5px; right: -5px; cursor: se-resize; }
:deep(.ec-handle-s)  { bottom: -5px; left: 50%; margin-left: -5px; cursor: s-resize; }
:deep(.ec-handle-sw) { bottom: -5px; left: -5px; cursor: sw-resize; }
:deep(.ec-handle-w)  { top: 50%; margin-top: -5px; left: -5px; cursor: w-resize; }

/* ============ 框选矩形 ============ */
.ec-box-select {
  position: absolute;
  border: 1px dashed #2c7da0;
  background: var(--editor-select-bg);
  pointer-events: none;
  z-index: 999;
  border-radius: 4px;
}

/* ============ 右键菜单 ============ */
.ec-ctxmenu {
  position: fixed; z-index: 1000;
  background: var(--color-card);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  box-shadow: var(--shadow-lg);
  padding: 0.35rem 0;
  min-width: 150px;
}
.ec-ctxmenu button {
  display: block; width: 100%;
  padding: 0.5rem 1.2rem;
  border: none; background: transparent;
  text-align: left;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.ec-ctxmenu button:hover {
  background: rgba(44,125,160,0.06);
  color: var(--color-text);
}

/* ============ 底部状态栏 ============ */
.ec-statusbar {
  display: flex; align-items: center; gap: 1.2rem;
  padding: 0.4rem 1rem;
  background: var(--editor-topbar-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 14px;
  margin: 0 0 4px 0;
  font-size: 0.72rem;
  color: rgba(255,255,255,0.55);
  flex-shrink: 0;
}
```

- [ ] **Step 2: 更新图片占位符颜色**

在 `<script setup>` 中，找到 `renderComponentMarkup` 函数中的图片占位符（约第 136 行），将背景色和文字色改为科技蓝风格：

```js
// 将：
inner = `<div style="width:100%;height:100%;display:grid;place-items:center;background:var(--color-bg);color:var(--color-text-light);font-size:13px;border-radius:${p.borderRadius}px;">🖼 图片占位</div>`
// 改为：
inner = `<div style="width:100%;height:100%;display:grid;place-items:center;background:#f2f6f8;color:#687b8b;font-size:13px;border:1px solid rgba(44,125,160,0.08);border-radius:${p.borderRadius}px;">🖼 图片占位</div>`
```

- [ ] **Step 3: 验证 — 启动 dev server，检查画布**

```bash
npm run dev
```

访问 `http://localhost:5173/#/builder/editor`：
- 顶栏深色玻璃底 + "SCREEN BUILDER" 小标签
- 按钮全圆角药丸形，hover 上浮
- 画布 24px 十字丝网格
- Stage 有明显凸起卡片感（大投影 + 内阴影）
- 组件选中为青蓝色光晕（非硬边框）
- 右键菜单 18px 大圆角毛玻璃

- [ ] **Step 4: Commit**

```bash
git add src/modules/builder/editor/EditorCanvas.vue
git commit -m "style: redesign EditorCanvas with dark toolbar, crosshair grid, and glass stage

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: sensorRenderer.js — 深色科技风重写

**Files:**
- Modify: `src/modules/builder/editor/sensorRenderer.js`

**Interfaces:**
- Consumes: 无（纯 JS 字符串模板）
- Produces: `renderSensorMarkup(component)` → 深色科技风 HTML 字符串

- [ ] **Step 1: 替换 sensorRenderer.js 全部内容**

将 `src/modules/builder/editor/sensorRenderer.js` 完整替换为：

```javascript
// src/modules/builder/editor/sensorRenderer.js

const STATUS_COLORS = {
  normal: '#6fcf97',
  warning: '#f2c94c',
  error: '#eb5757',
}

const STATUS_LABELS = {
  normal: '正常',
  warning: '注意',
  error: '异常',
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderSensorMarkup(component) {
  const { props, width, height } = component
  const { title, sensors } = props

  const sensorCards = sensors.map((s) => {
    const color = STATUS_COLORS[s.status] || STATUS_COLORS.normal
    const label = STATUS_LABELS[s.status] || s.status
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:rgba(230,249,242,0.08);border-radius:12px;border:1px solid rgba(165,215,228,0.06);">
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:500;color:rgba(255,255,255,0.7);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(s.name)}</div>
          <span style="display:inline-block;font-size:10px;font-weight:600;padding:2px 10px;border-radius:999px;color:${color};background:${hexToRgba(color, 0.15)};">${label}</span>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:12px;">
          <span style="font-size:24px;font-weight:700;color:#ffffff;line-height:1;">${s.value}</span>
          <span style="font-size:13px;color:rgba(255,255,255,0.45);margin-left:3px;">${esc(s.unit)}</span>
        </div>
      </div>`
  }).join('')

  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;padding:20px;box-sizing:border-box;overflow:hidden;background:linear-gradient(135deg, rgba(7,35,49,0.96), rgba(18,74,93,0.92));border-radius:18px;box-shadow:inset 0 0 0 1px rgba(165,215,228,0.08);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:10px;font-weight:700;color:#a5d7e4;text-transform:uppercase;letter-spacing:0.08em;opacity:0.7;">SENSORS / DATA</span>
        <span style="display:inline-block;font-size:10px;font-weight:600;padding:2px 10px;border-radius:999px;color:#c8e8f0;background:rgba(165,215,228,0.12);">手动</span>
      </div>
      <h3 style="margin:0 0 14px;font-size:17px;font-weight:800;color:#ffffff;letter-spacing:0.02em;line-height:1.3;">${esc(title)}</h3>
      <div style="display:flex;flex-direction:column;gap:8px;flex:1;overflow-y:auto;">
        ${sensorCards}
      </div>
    </div>`
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
```

- [ ] **Step 2: 验证 — 添加传感器组件，检查深色科技风效果**

```bash
npm run dev
```

访问 `http://localhost:5173/#/builder/editor`，点击工具栏 "🌡 传感器" 添加组件：
- 深青渐变底 + 内发光边框
- "SENSORS / DATA" 小标签 + "手动" 全圆角 chip
- 白色大标题 font-weight: 800
- 半透明数据卡片，白色数值 + 淡青单位
- 状态 pill：绿（正常）/ 黄（告警）/ 红（异常）

- [ ] **Step 3: Commit**

```bash
git add src/modules/builder/editor/sensorRenderer.js
git commit -m "style: rewrite sensorRenderer with dark glass tech aesthetic

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: chartRenderer.js — 色板 + 文字色更新

**Files:**
- Modify: `src/modules/builder/editor/chartRenderer.js`

**Interfaces:**
- Consumes: 无
- Produces: `parseCSV`, `renderBarChart`, `renderPieChart`, `renderLineChart`, `renderChartSvg` — 签名不变，仅视觉输出变化

- [ ] **Step 1: 更新 COLORS 数组（第 3-6 行）**

```js
// 将：
const COLORS = [
  '#6b8c5c', '#d4a373', '#4a8fbf', '#e07a5f', '#8a9a5b',
  '#b07d62', '#5b8a9a', '#c9a86a', '#9a5b8a', '#6b9a5b',
]
// 改为：
const COLORS = [
  '#2f80ed', '#56ccf2', '#6fcf97', '#f2c94c',
  '#9b51e0', '#eb5757', '#f2994a', '#2c7da0',
  '#6fcf97', '#5d9cec',
]
```

- [ ] **Step 2: 更新 renderBarChart 中的颜色引用**

- 标题色 `fill="#333"` → `fill="#1c2834"`
- 数值标签 `fill="#666"` → `fill="#627586"`
- X 轴标签 `fill="#888"` → `fill="#687b8b"`
- Y 轴文字 `fill="#999"` → `fill="#687b8b"`
- 网格线 `stroke="#eee"` → `stroke="rgba(101,126,152,0.12)"`

- [ ] **Step 3: 更新 renderPieChart 中的颜色引用**

- 标题色 `fill="#333"` → `fill="#1c2834"`
- 图例文字 `fill="#666"` → `fill="#627586"`
- SVG 背景 `fill="#fff"` → `fill="#fafdfe"`

- [ ] **Step 4: 更新 renderLineChart 中的颜色引用**

- 标题色 `fill="#333"` → `fill="#1c2834"`
- 数据点数值 `fill="#666"` → `fill="#627586"`
- X 轴标签 `fill="#888"` → `fill="#687b8b"`
- 网格线 `stroke="#eee"` → `stroke="rgba(101,126,152,0.12)"`
- SVG 背景 `fill="#fff"` → `fill="#fafdfe"`

- [ ] **Step 5: 更新 renderChartSvg 中无数据占位**

- SVG 背景 `fill="#faf8f5"` → `fill="#f8fbfd"`
- 文字 `fill="#999"` → `fill="#687b8b"`

- [ ] **Step 6: 验证 — 添加图表组件，检查颜色**

```bash
npm run dev
```

访问 `http://localhost:5173/#/builder/editor`，添加图表组件：
- 柱状图/饼图/折线图颜色为科技蓝图表色板
- 网格线、标题、标签颜色柔和协调

- [ ] **Step 7: Commit**

```bash
git add src/modules/builder/editor/chartRenderer.js
git commit -m "style: update chartRenderer with tech-blue palette and cool-tone labels

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: ComponentLibrary.vue — 搜索框 + 卡片 + chip

**Files:**
- Modify: `src/modules/builder/editor/ComponentLibrary.vue`

**Interfaces:**
- Consumes: Task 1 的 CSS 变量覆盖（通过继承）
- Produces: 编辑器风格统一的组件库面板

- [ ] **Step 1: 替换 `<style scoped>` 块**

将现有 `<style scoped>` 完整替换为：

```css
.cl-root { display: flex; flex-direction: column; height: 100%; }
.cl-header { padding: 1.2rem 1rem 0.8rem; flex-shrink: 0; }
.cl-title {
  margin: 0 0 0.7rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-primary-dark);
}
.cl-search {
  width: 100%; padding: 0.5rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  font-size: 0.82rem; outline: none;
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.cl-search:focus {
  border-color: #2c7da0;
  box-shadow: 0 0 0 3px var(--editor-input-focus-glow);
}
.cl-search::placeholder { color: var(--color-text-light); }

.cl-categories { flex: 1; overflow-y: auto; padding: 0 0.6rem 0.6rem; }
.cl-cat { border-bottom: 1px solid var(--color-border-light); }
.cl-cat-summary {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.6rem 0.4rem;
  cursor: pointer;
  font-size: 0.82rem; font-weight: 600;
  color: var(--color-text-secondary);
  user-select: none;
  transition: color var(--transition-fast);
}
.cl-cat-summary:hover { color: #2c7da0; }
.cl-cat-summary::marker { color: var(--color-text-light); }
.cl-cat[open] > .cl-cat-summary { color: #2c7da0; }
.cl-cat[open] > .cl-cat-summary::marker { color: #2c7da0; }
.cl-cat-icon { font-size: 0.9rem; }
.cl-cat-name { flex: 1; }
.cl-cat-count {
  font-size: 0.68rem; padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: rgba(44,125,160,0.08);
  color: #2c7da0;
  font-weight: 600;
}

.cl-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 0.4rem; padding: 0 0.2rem 0.6rem;
}
.cl-item {
  display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
  padding: 0.7rem 0.3rem;
  border: 1px solid var(--color-border-light);
  border-radius: 18px;
  cursor: grab;
  transition: all var(--transition-fast);
  background: rgba(44,125,160,0.03);
}
.cl-item:hover {
  border-color: #2c7da0;
  background: var(--color-card);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}
.cl-item:active { cursor: grabbing; transform: scale(0.96); }
.cl-item-icon { font-size: 1.3rem; }
.cl-item-label {
  font-size: 0.72rem; color: var(--color-text-secondary); font-weight: 500;
}
```

- [ ] **Step 2: 验证 — 检查组件库面板**

```bash
npm run dev
```

访问 `http://localhost:5173/#/builder/editor`：
- 搜索框 12px 大圆角，聚焦有青蓝光晕
- 拖拽卡片 18px 圆角，hover 上浮 + 边框变青蓝
- 分类计数 chip 全圆角药丸 + 青蓝半透明底

- [ ] **Step 3: Commit**

```bash
git add src/modules/builder/editor/ComponentLibrary.vue
git commit -m "style: refine ComponentLibrary with rounded inputs, pill chips, and card hover

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: PropertyPanel.vue — 表单控件 + section + 按钮

**Files:**
- Modify: `src/modules/builder/editor/PropertyPanel.vue`

**Interfaces:**
- Consumes: Task 1 的 CSS 变量覆盖（通过继承）
- Produces: 编辑器风格统一的属性面板

- [ ] **Step 1: 替换 `<style scoped>` 块**

将现有 `<style scoped>` 完整替换为：

```css
.pp-root { padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
.pp-section {
  padding: 1rem;
  border-radius: 18px;
  background: rgba(44,125,160,0.02);
  border: 1px solid var(--color-border-light);
}
.pp-title {
  margin: 0 0 0.8rem;
  font-size: 0.95rem; font-weight: 700;
  color: var(--color-primary-dark);
  display: flex; align-items: center; justify-content: space-between;
}
.pp-subtitle {
  margin: 0.8rem 0 0.5rem;
  font-size: 0.8rem; font-weight: 600;
  color: var(--color-text-light);
  display: flex; align-items: center; justify-content: space-between;
}
.pp-field { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.6rem; }
.pp-field label {
  font-size: 0.76rem; color: var(--color-text-light); font-weight: 500;
}
.pp-field input[type="text"],
.pp-field input[type="number"],
.pp-field textarea,
.pp-field select {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  font-size: 0.82rem; outline: none;
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.pp-field input:focus,
.pp-field textarea:focus,
.pp-field select:focus {
  border-color: #2c7da0;
  box-shadow: 0 0 0 3px var(--editor-input-focus-glow);
}
.pp-field textarea { resize: vertical; min-height: 60px; }
.pp-field input[type="color"] {
  width: 40px; height: 32px; padding: 2px; cursor: pointer;
  border-radius: 8px; border: 1px solid var(--color-border);
}
.pp-field-row { display: flex; gap: 0.5rem; }
.pp-field-row .pp-field { flex: 1; }
.pp-check {
  display: flex; flex-direction: row; align-items: center; gap: 0.4rem;
  cursor: pointer; font-size: 0.82rem; color: var(--color-text-secondary);
}
.pp-check input[type="checkbox"] { width: auto; accent-color: #2c7da0; }

.pp-stat { font-size: 0.82rem; color: var(--color-text-secondary); margin: 0; }
.pp-hint {
  font-size: 13px; color: #687b8b; line-height: 1.7;
  margin: 0.4rem 0 0;
}

.pp-del {
  border: none; background: transparent; cursor: pointer;
  font-size: 1rem; color: var(--color-text-light);
  padding: 0.25rem 0.4rem; border-radius: 8px;
  transition: all var(--transition-fast);
}
.pp-del:hover {
  color: #c0392b;
  background: rgba(192,57,43,0.06);
}

.pp-add {
  border: 1px solid #2c7da0; border-radius: 999px;
  padding: 0.15rem 0.6rem;
  background: transparent; color: #2c7da0;
  font-size: 0.72rem; cursor: pointer; font-weight: 600;
  transition: all var(--transition-fast);
}
.pp-add:hover {
  background: #2c7da0; color: #fff;
}

.pp-sensor-row { display: flex; gap: 0.3rem; margin-bottom: 0.4rem; align-items: center; }
.pp-sr-name { flex: 2; }
.pp-sr-val { flex: 1; }
.pp-sr-unit { flex: 1; }
.pp-sr-status { flex: 1.2; }
.pp-sensor-row input,
.pp-sensor-row select {
  padding: 0.35rem 0.45rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.76rem; outline: none;
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.pp-sensor-row input:focus,
.pp-sensor-row select:focus {
  border-color: #2c7da0;
  box-shadow: 0 0 0 2px var(--editor-input-focus-glow);
}
.pp-sr-del {
  border: none; background: transparent; cursor: pointer;
  color: var(--color-text-light);
  font-size: 1rem; padding: 0 0.2rem;
  border-radius: 4px;
  transition: all var(--transition-fast);
}
.pp-sr-del:hover { color: #c0392b; }
```

- [ ] **Step 2: 验证 — 检查属性面板**

```bash
npm run dev
```

访问 `http://localhost:5173/#/builder/editor`，选中不同组件：
- section 区块 18px 圆角 + 极淡渐变底
- 输入框 12px 大圆角，聚焦青蓝光晕
- hint 文字 13px + `#687b8b` + 1.7 行高
- 删除按钮 hover 变红
- 添加传感器按钮全圆角药丸

- [ ] **Step 3: Commit**

```bash
git add src/modules/builder/editor/PropertyPanel.vue
git commit -m "style: refine PropertyPanel with rounded sections, focus glows, and pill buttons

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: buildPreview.js — 预览导出颜色同步

**Files:**
- Modify: `src/modules/builder/editor/buildPreview.js`

**Interfaces:**
- Consumes: `renderChartSvg`、`renderSensorMarkup`（自动获得 Task 3、4 的样式更新）
- Produces: `buildPreviewHtml(state)` → 颜色与编辑器一致的预览 HTML

- [ ] **Step 1: 更新硬编码颜色**

在 `buildPreview.js` 中做以下替换：

- 第 20 行图片占位底 `#f2ede4` → `#f2f6f8`，文字 `#8a8a8a` → `#687b8b`
- 第 46 行 body 背景 `#e8e4dc` → `#edf3f7`
- 第 50 行 stage 阴影 `rgba(77,107,62,0.14)` → `rgba(36,90,115,0.18)`

- [ ] **Step 2: 验证 — 预览窗口颜色一致**

```bash
npm run dev
```

访问编辑器，点击 "👁 预览"：
- 预览窗口背景色、图片占位符颜色、stage 阴影与编辑器一致
- 图表和传感器组件自动继承渲染器的科技蓝样式

- [ ] **Step 3: Commit**

```bash
git add src/modules/builder/editor/buildPreview.js
git commit -m "style: sync buildPreview colors with tech-blue editor theme

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Verification Checklist

1. `npm run dev` — 编辑器页面正常渲染，无 console 错误
2. 页面背景三重渐变光晕可见
3. 左右面板 24px 大圆角毛玻璃卡片
4. 顶栏深色玻璃底 + "SCREEN BUILDER" 标签
5. 顶栏按钮全圆角药丸形，hover 上浮
6. 画布 24px 十字丝网格
7. Stage 大投影 + 内阴影凸起卡片感
8. 组件选中青蓝色光晕（非硬边框）
9. 缩放手柄白底青蓝边框 + 4px 圆角
10. 右键菜单 18px 圆角毛玻璃
11. 底部状态栏深色底
12. 传感器组件深色科技风（暗青渐变 + 玻璃卡片）
13. 图表组件色板更新为科技蓝
14. 组件库卡片 18px 圆角，hover 上浮
15. 搜索框聚焦青蓝光晕
16. 属性面板 section 18px 圆角 + 输入框聚焦光晕
17. 预览窗口颜色一致
18. BuilderHub 入口页保持暖色不变
19. 其余模块（villages、practice 等）不受影响
20. `npx vitest run` — 所有已有测试通过
