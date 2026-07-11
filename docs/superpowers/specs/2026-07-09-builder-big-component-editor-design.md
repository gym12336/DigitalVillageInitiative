# 成果搭建台 · 大组件编辑台 设计文档

> 版本：v1.0.0 | 日期：2026-07-09 | 状态：设计完成，待实现

---

## 1. 概述

### 1.1 定位

成果搭建台是实践成果可视化 DIY 的核心入口，由两个工作台组成：

| 工作台 | 用途 | 本次范围 |
|--------|------|---------|
| **大组件编辑台** | 将小组件组合为可互动的大组件 | ✅ 完整实现 |
| **大屏展示工作台** | 排版所有组件并导出展示页 | ⏳ 占位 |

### 1.2 设计目标

- 零外部依赖：不引入拖拽库或图表库
- 状态驱动：reactive 状态 → 画布 innerHTML 重绘 + 属性面板 Vue 响应式绑定
- 纯数据模型：组件是纯对象，无类/继承/原型链
- 导出自包含：编译为纯静态 HTML，Blob URL 预览

---

## 2. 文件结构

```
src/modules/builder/
├── routes.js                        # 路由定义
├── BuilderHub.vue                   # 入口Hub：两个工作台选择卡片
├── editor/                          # 大组件编辑台
│   ├── BigComponentEditor.vue       # 三栏布局外壳（全屏）
│   ├── ComponentLibrary.vue         # 左侧：组件库面板（13大类折叠）
│   ├── EditorCanvas.vue             # 中间：画布视口 + 缩放控制
│   ├── PropertyPanel.vue            # 右侧：属性编辑面板（Vue模板）
│   ├── stageEditor.js               # ★ 核心：reactive 状态 + 渲染引擎
│   ├── componentFactory.js          # 工厂函数：createComponent(type, x, y)
│   ├── chartRenderer.js             # 手写 SVG 图表渲染（饼/柱/折线）
│   ├── sensorRenderer.js            # agri-sensor 组件 HTML 渲染
│   └── buildPreview.js              # 编译导出纯静态 HTML
├── display/                         # 大屏展示工作台（占位）
│   └── DisplayWorkbench.vue
└── __tests__/
    ├── stageEditor.test.js
    └── componentFactory.test.js
```

路由注册：
- `/builder` → BuilderHub（入口页）
- `/builder/editor` → BigComponentEditor（大组件编辑台）
- `/builder/display` → DisplayWorkbench（占位）

---

## 3. 数据模型

### 3.1 组件对象

```javascript
// 纯数据对象，所有 type 共享同一结构
{
  id: 1,                       // 自增唯一标识
  type: 'text',                // 'text' | 'image' | 'chart' | 'agri-sensor'
  x: 100, y: 200,              // 画布绝对定位坐标
  width: 300, height: 96,      // 组件尺寸
  props: { ... }               // type 决定 props 结构
}
```

### 3.2 各类型 props 定义

```javascript
// text
props: { text, fontSize, color, fontWeight, textAlign, backgroundColor }

// image
props: { src, alt, objectFit, borderRadius, autoRefresh, refreshInterval }

// chart
props: { title, chartType, csvText, labelColumn, valueColumn }

// agri-sensor
props: { title, sensors: [{ name, value, unit, status }] }
```

### 3.3 全局状态 (stageEditor.js)

```javascript
const state = reactive({
  components: [],             // 数组，顺序 = z-index 层级
  selectedId: null,           // 当前选中（单选模式）
  pageWidth: 1920,
  pageHeight: 1080,
  pageBackground: '#ffffff',
  zoom: 1,                    // 0.25 ~ 2.0
  clipboard: [],              // Ctrl+C 剪切板
  nextId: 1,
  history: [],                // 撤销历史栈（最多50步）
  historyIndex: -1,
})
```

---

## 4. 核心 API (stageEditor.js)

| 方法 | 说明 |
|------|------|
| `addComponentAt(type, x, y)` | 工厂创建 → 插入数组 → pushHistory → renderStage |
| `updateComponent(id, patch)` | 更新 props/位置 → pushHistory → renderStage |
| `deleteComponent(id)` | 删除 → pushHistory → renderStage |
| `selectComponent(id)` | 选中单个组件 |
| `selectByRect(x1, y1, x2, y2)` | 框选，选中最顶层相交组件（单选模式） |
| `moveComponent(id, dx, dy)` | 移动组件（边界约束） |
| `resizeComponent(id, handle, dx, dy)` | 8 手柄缩放 |
| `bringToFront(id)` | 置顶（splice + push） |
| `cloneComponent(id)` | Ctrl+D，偏移 +20px |
| `copySelected()` / `pasteClipboard()` | Ctrl+C/V |
| `undo()` / `redo()` | 历史栈出/入 |
| `setZoom(z, anchorX, anchorY)` | 以鼠标为锚点缩放 |
| `buildPreviewHtml()` | 编译纯静态 HTML → Blob URL |
| `save()` | 序列化 components → localStorage + API |

### 渲染管线

```
state 变更
  → renderStage()       → 画布 innerHTML 全量重绘 → 重新绑定事件
  → Vue 响应式           → 属性面板自动更新（v-model 绑定同一 reactive 对象）
```

### 历史栈（撤销/重做）

每次变更前 snapshot `components` 的 JSON 副本 push 到 `history`，撤销/重做时还原。限制 50 步。

---

## 5. 页面设计

### 5.1 BuilderHub — 入口页

- 复用 PageScaffold 布局模式
- 两张并排卡片："大组件编辑台"（可点击进入）和"大屏展示工作台"（灰显 + "即将开放"标签）
- 卡片样式：`var(--color-card)` 背景、`border-radius: var(--radius)`、`box-shadow: var(--shadow-card)`、hover 上浮 4px
- 每张卡片包含：emoji 图标、标题、一句话描述、操作按钮

### 5.2 BigComponentEditor — 三栏全屏布局

全屏工作台模式：移除 SiteFooter，高度 `100vh - SiteHeader高度`。

| 区域 | 宽度 | 说明 |
|------|------|------|
| 左侧组件库 | 240px | 固定宽度，可折叠 |
| 中间画布 | flex:1 | 自适应填满，含工具栏+画布视口+状态栏 |
| 右侧属性面板 | 280px | 有选中组件时展开，无选中时显示画布设置 |

### 5.3 ComponentLibrary — 左侧组件库

- 顶部搜索框（按组件名称/描述过滤）
- 13 个折叠面板，每面板对应一个叙事意图大类
- 展开的类别以 2 列网格展示组件卡片（图标+名称）
- 组件卡片 `draggable="true"`，拖拽时 `dataTransfer.setData('component-type', type)`
- 每类展示 1-2 个代表组件作为骨架，其余标记"即将上线"

### 5.4 EditorCanvas — 中间画布

**顶部工具栏**：
```
[← 返回] [T 文本] [📊 图表] [🖼 图片] [🌡 传感器] | [↩] [↪] | 缩放:100%▼ | [💾 保存] [👁 预览]
```

**画布视口**：
- 外层 `overflow: auto`，提供滚动条
- 内层按 zoom 缩放：`transform: scale(var(--zoom))`，尺寸 = `pageWidth * zoom × pageHeight * zoom`
- 画布本身白色背景 + `box-shadow`，尺寸 = `pageWidth × pageHeight`
- 所有组件 `position: absolute`，left/top 定位
- 选中组件显示蓝色边框 (`2px solid #3b82f6`) + 8 个圆角手柄

**组件拖拽（画布内移动）**：
- mousedown 在组件上 → 记录 dragState { id, startX, startY, origX, origY }
- mousemove → 计算 delta，更新 component.x/y，调用 renderStage
- mouseup → 清除 dragState，pushHistory

**组件缩放**：
- 8 个手柄分别控制四角（等比缩放）和四边（单向缩放）
- mousedown 在手柄上 → 记录 resizeState，mousemove 实时更新 width/height

**框选**：
- mousedown 在画布空白区域 → 绘制半透明蓝色矩形覆盖层
- mousemove 动态更新矩形
- mouseup → AABB 碰撞检测，选中最顶层相交的单个组件（单选模式）

**缩放**：
- Ctrl+滚轮 或 底部缩放下拉框
- 范围 25% ~ 200%，步长 25%
- 以鼠标在画布上的位置为锚点保持缩放中心

**底部状态栏**：画布尺寸 (1920×1080)、选中组件数

### 5.5 PropertyPanel — 右侧属性面板

三种显示模式：

**无选中**（默认）：
- 画布尺寸设置（宽/高输入框）
- 画布背景色（颜色选择器）
- 组件总数统计

**选中 text 组件**：
- 位置尺寸：x, y, w, h（4 个数字输入框）
- 内容：文本 textarea
- 样式：字号、颜色、粗细、对齐、背景色

**选中 image 组件**：
- 位置尺寸
- 图片 URL 输入
- 填充模式下拉（cover/contain/fill）
- 圆角、自动刷新开关+间隔

**选中 chart 组件**：
- 位置尺寸
- 图表标题
- 图表类型下拉（饼图/柱状图/折线图）
- CSV 数据编辑区（textarea，示例数据可编辑）
- 标签列名、数值列名

**选中 agri-sensor 组件**：
- 位置尺寸
- 卡片标题
- 传感器列表（可增删行：名称、数值、单位、状态）

所有表单控件用 `v-model` 绑定 `state.components` 中的对应字段，自动触发重绘。

---

## 6. 渲染实现

### 6.1 画布渲染 (renderStage)

```javascript
function renderStage() {
  // 1. 更新画布样式
  stage.style.width = state.pageWidth + 'px'
  stage.style.height = state.pageHeight + 'px'
  stage.style.background = state.pageBackground
  stage.style.transform = `scale(${state.zoom})`

  // 2. 遍历组件生成 HTML
  const html = state.components.map(c => {
    switch (c.type) {
      case 'text':    return renderTextMarkup(c)
      case 'image':   return renderImageMarkup(c)
      case 'chart':   return renderChartMarkup(c)
      case 'sensor':  return renderSensorMarkup(c)
    }
  }).join('')

  // 3. 一次性写入
  stage.innerHTML = html

  // 4. 重新绑定事件（mousedown on 组件 / 手柄 / 空白区域）
  bindStageEvents()
}
```

### 6.2 图表 SVG 手写渲染 (chartRenderer.js)

- 饼图：`M cx cy L x1 y1 A r r 0 largeArc 1 x2 y2 Z`，累加角度计算扇形路径
- 柱状图：`<rect>` 按数据比例计算高度和 y 坐标
- 折线图：`<polyline>` 或 `<path>` 连接数据点
- 颜色用固定 10 色调色板循环取色
- 坐标系：手动绘制 x/y 轴线 + 刻度标签

### 6.3 导出 (buildPreview.js)

```javascript
function buildPreviewHtml() {
  // 复用 renderStage 的渲染函数，生成组件 HTML
  // 内嵌所有 CSS（inlined）+ 基础 JS（如有交互）
  // 图表直接渲染为内嵌 SVG
  // 通过 Blob URL 在新窗口打开
}
```

---

## 7. 组件库映射

从设计文档第 9 节 13 大类中，每类选取 1-2 个代表组件作为骨架：

| 大类 | 代表组件 | 对应 type |
|------|---------|-----------|
| ① 讲变化 | 哑铃图、涨跌徽标 | chart |
| ② 讲整体画像 | KPI 卡组、雷达图 | chart / agri-sensor |
| ③ 讲过程 | 时间轴 | chart |
| ④ 讲构成/分布 | 饼图、堆叠柱 | chart |
| ⑤ 讲人与故事 | 人物卡、金句块 | text |
| ⑥ 讲空间 | 地图散点 | chart（后续扩展） |
| ⑦ 封面开场 | 封面大图 | image |
| ⑧ 单点强调 | 大数字 | text |
| ⑨ 关系流向 | 桑基图 | chart（后续扩展） |
| ⑩ 时间频率 | 日历热力 | chart（后续扩展） |
| ⑪ 交互对比 | 前后对比滑块 | chart |
| ⑫ 荣誉佐证 | 数据表 | chart |
| ⑬ 媒体嵌入 | 视频嵌入 | image |

---

## 8. 与项目设计系统融合

- 复用全部 CSS 变量：`--color-bg`, `--color-card`, `--color-primary`, `--color-primary-dark`, `--color-text`, `--color-text-secondary`, `--color-text-light`, `--color-border`, `--color-accent`, `--color-highlight`
- 圆角：`--radius-sm`(8px), `--radius`(16px), `--radius-lg`(20px)
- 阴影：`--shadow-card`, `--shadow-card-hover`, `--shadow-lg`
- 玻璃态面板：`--glass-bg`, `--glass-border`, `--glass-blur`
- 过渡：`--transition`(0.3s cubic-bezier)
- 字体：`--sx-sans`, `--sx-serif`
- 按钮样式：复用 TeamWorkbench 的 `.btn.primary` / `.btn.ghost` 模式

---

## 9. 验证方式

1. **路由验证**：访问 `/builder` 看到 Hub 页；点击"大组件编辑台"进入 `/builder/editor`
2. **拖入验证**：从左侧组件库拖动任意组件到画布，组件出现在 drop 位置并自动选中
3. **属性编辑**：选中组件后右侧面板显示对应表单，修改属性后画布实时更新
4. **移动/缩放**：在画布内拖拽组件可移动，拖拽手柄可缩放
5. **保存/加载**：保存后刷新页面，组件数据从 localStorage 恢复
6. **预览导出**：点击预览按钮，新窗口展示纯静态 HTML 页面
7. **单元测试**：`componentFactory.test.js` 覆盖工厂函数默认值；`stageEditor.test.js` 覆盖 CRUD + 撤销/重做 + 碰撞检测
8. **与现有系统兼容**：SiteHeader 正常显示，不影响其他模块路由
