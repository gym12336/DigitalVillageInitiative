# 图表渲染补全 — 第二批（雷达图 + 时间轴 + 数据表）

## 背景

成果搭建台（builder）的组件库有 17 个语义条目，涵盖 14 个叙事场景。batch1 补齐了 3 个低复杂度图表（stacked-bar、dumbbell、trend-badge），目前仍有多个条目拖到画布上降级为柱状图。

第二批选取 3 个中等复杂度组件：

| 组件库条目 | 架构决策 | 场景 |
|-----------|----------|------|
| 雷达图 | `chart` type + 新 `chartType: 'radar'` | 讲「整体画像」— 多维指标蛛网轴 |
| 时间轴 | 新 type `timeline` + 独立 renderer | 讲「过程」— 水平事件时间线 |
| 数据表 | 新 type `datatable` + 独立 renderer | 荣誉佐证 — 结构化表格渲染 |

## 设计原则

- **雷达图**：纯 SVG 渲染，CSV 驱动，走 `renderChartSvg()` 分发
- **时间轴**：纯 HTML 渲染，结构化 props（动态事件列表），不走 SVG
- **数据表**：纯 HTML 渲染，结构化 props（动态行列），不走 SVG
- **零依赖**，不引入第三方图表库
- **与手动拖拽走同一条 add / update / history 路径**

---

## 1. 雷达图 `radar`

### CSV 格式

多组数据叠加对比。首列 `label` 标识数据组，其余列自动识别为维度轴：

```csv
label,产业兴旺,生态宜居,乡风文明,治理有效,生活富裕
李家村,80,65,72,88,70
全县平均,60,55,58,62,50
```

### 解析器

`parseCSVRadar(csvText)` → `{ labels: string[], dimensions: string[], series: { name: string, values: number[] }[] }`

检测 CSV 结构：有 `label` 列 + 至少 2 列数值列。不足 3 维返回空数据。

### 渲染逻辑

- **蛛网骨架**：N 条轴线从中心等角度放射（2π/N 间隔），轴线色 `rgba(101,126,152,0.2)`
- **同心多边形环**：5 层，虚线 `rgba(101,126,152,0.1)`，刻度标签标注在第一条轴左侧
- **数据多边形**：每组数据一个闭合多边形，`fill-opacity: 0.12`，描边 `stroke-width: 2`
- **数据点**：每个顶点圆点 r=3.5
- **维度标签**：标注在多边形顶点外侧，距顶点半径 +18px
- **图例**：底部居中，系列名 + 色块（10×10px）
- **最大值自适应**：取所有数据中的最大值，向上取整至最接近的整十/整百数
- **轴线起点偏移**：从中心偏移 15% 半径处开始（留出刻度空间），实际数据绘制区域占半径的 85%

### 默认尺寸

520 × 380 px（比标准图表略高，适应多边形画布）

### CSV 示例（默认）

```csv
label,产业兴旺,生态宜居,乡风文明,治理有效,生活富裕
李家村,80,65,72,88,70
全县平均,60,55,58,62,50
```

---

## 2. 时间轴 `timeline`

### 数据模型

新增独立 component type `timeline`，不是 chart 子类型：

```js
{
  type: 'timeline',
  x, y,
  width: 600,
  height: 360,
  props: {
    title: '发展历程',
    events: [
      { date: '2020-03', title: '驻村工作队进驻', description: '3名队员入驻李家村开展帮扶工作' },
      { date: '2021-06', title: '茶叶合作社成立', description: '带动周边86户农户参与茶叶种植' },
      { date: '2022-12', title: '通过省级验收', description: '被评为省级美丽乡村示范村' },
    ],
  }
}
```

### 渲染逻辑

- **水平时间轴线**：一条细线（`#a5d7e4`，2px）横贯组件中央偏上
- **节点交替上下**：索引 0 在上、索引 1 在下、索引 2 在上……交替排列
- **每个节点**：
  - 彩色圆点（直径 14px，`COLORS[i % COLORS.length]`）位于线上
  - 上方/下方延伸竖线连接圆点到卡片（`#c8e8f0`，1px）
  - 圆角卡片背景（`rgba(44,125,160,0.04)`，圆角 10px，边框 `rgba(44,125,160,0.06)`）
  - 卡片内：日期标签（小号灰色）、事件标题（粗体 `#1c2834`，14px）、描述（`#627586`，12px，最多 2 行）
- **连接弧线**：时间线起始端和结束端各一个端点圆
- **响应式布局**：节点等距分布，卡片宽度自适应

### 渲染方式

- 纯 HTML/CSS inline style，不走 SVG
- 新建 `src/modules/builder/editor/timelineRenderer.js`
- 导出 `renderTimelineMarkup(component)` → HTML 字符串
- 容器为白色圆角卡片，`overflow: hidden`

### 属性面板

- 标题文本框
- **事件列表**：每个事件包含 3 个字段（date、title、description），每行一个事件
- 底部「+ 添加事件」按钮，每行右侧 × 删除按钮
- 最少保留 1 个事件

### 默认值

```js
events: [
  { date: '2020-03', title: '事件标题', description: '事件描述' },
  { date: '2021-06', title: '事件标题', description: '事件描述' },
  { date: '2022-12', title: '事件标题', description: '事件描述' },
]
```

---

## 3. 数据表 `datatable`

### 数据模型

新增独立 component type `datatable`，不是 chart 子类型：

```js
{
  type: 'datatable',
  x, y,
  width: 560,
  height: 340,
  props: {
    title: '荣誉资质',
    columns: ['荣誉名称', '颁发单位', '时间', '级别'],
    rows: [
      ['全国文明村', '中央文明办', '2021', '国家级'],
      ['省级美丽乡村', '省农业农村厅', '2022', '省级'],
      ['茶叶地理标志', '国家知识产权局', '2020', '国家级'],
      ['示范合作社', '省供销社', '2021', '省级'],
    ],
  }
}
```

### 渲染逻辑

- **容器**：白色圆角卡片（`border-radius: 14px`，浅边框 `rgba(44,125,160,0.08)`）
- **标题栏**：顶部区域，标题文字（16px 粗体 `#1c2834`）+ 底部细线分隔
- **表头行**：背景 `#245a73`，文字白色、11px、粗体、UPPERCASE 字母间距
- **数据行**：奇偶交替底色（`#ffffff` / `rgba(44,125,160,0.03)`）
- **单元格**：padding 12px 14px，文字左对齐 `#627586` 13px，`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- **悬停高亮**：hover 行背景 `rgba(44,125,160,0.06)`（编辑模式下也适用）
- **溢出滚动**：容器 `overflow-y: auto`，行数过多时内部滚动
- **列宽**：`table-layout: auto` 或按列数均分

### 渲染方式

- 纯 HTML `<table>` 标签 + inline CSS
- 新建 `src/modules/builder/editor/datatableRenderer.js`
- 导出 `renderDatatableMarkup(component)` → HTML 字符串

### 属性面板

- 标题文本框
- **列管理**：水平排列的列名 inputs，每列一个 text input + × 删除按钮，尾部「+ 添加列」按钮，最少保留 1 列
- **行管理**：每行显示 N 个单元格 inputs（列数决定），行尾 × 删除按钮，底部「+ 添加行」按钮，最少保留 1 行
- 行列网格编辑，列名和单元格值都是 `v-model` 绑定

### 默认值

```js
columns: ['荣誉名称', '颁发单位', '时间'],
rows: [
  ['示例荣誉', '示例单位', '2024'],
  ['示例荣誉', '示例单位', '2023'],
]
```

---

## 改动清单

| 文件 | 改动 |
|------|------|
| `src/modules/builder/editor/chartRenderer.js` | 新增 `parseCSVRadar()`、`renderRadarChart()`；`renderChartSvg()` switch 加 `case 'radar'` |
| `src/modules/builder/editor/componentFactory.js` | 新增 `createTimelineComponent()`、`createDatatableComponent()`；`createComponent()` switch 加 `case 'timeline'`、`case 'datatable'`；`defaultCsvFor()` 加 `case 'radar'` |
| `src/modules/builder/editor/timelineRenderer.js` | **新建**，导出 `renderTimelineMarkup(component)` |
| `src/modules/builder/editor/datatableRenderer.js` | **新建**，导出 `renderDatatableMarkup(component)` |
| `src/modules/builder/editor/EditorCanvas.vue` | `renderComponentMarkup` switch 加 `case 'timeline'`、`case 'datatable'`；工具栏加「⏱ 时间轴」「📋 数据表」按钮 |
| `src/modules/builder/editor/PropertyPanel.vue` | chartType 下拉加 `<option value="radar">雷达图</option>`；新增 `v-if="comp.type === 'timeline'"` 编辑区；新增 `v-if="comp.type === 'datatable'"` 编辑区 |
| `src/modules/builder/editor/ComponentLibrary.vue` | 雷达图 `chartType: 'bar'` → `'radar'`；时间轴 `type: 'chart'` → `type: 'timeline'`，去掉 `chartType`；数据表 `type: 'chart'` → `type: 'datatable'`，去掉 `chartType` |
| `src/modules/builder/display/DisplayComponentLibrary.vue` | 同上 |
| `src/modules/builder/editor/buildPreview.js` | 渲染 switch 加 `case 'timeline'`、`case 'datatable'` |
| `src/__tests__/` | 新增雷达图解析器+渲染器测试；时间轴/数据表渲染器测试 |

## 不改动

- `stageEditor.js` — 组件模型不变，`addComponentAt` 已通过 type 参数透明传递
- 后端 API — 纯前端渲染
- `sensorRenderer.js` — 与本次改动无关
- `bigComponentStore.js` — 大组件序列化走 `JSON.stringify`，新 type 自动兼容

## 风险

- **雷达图维度过多**：超过 8 个维度时标签会拥挤重叠。解决方案：维度 ≥ 6 时缩小标签字号（12px → 10px）
- **时间轴事件过多**：超过 8 个事件时卡片会拥挤。解决方案：事件 ≥ 6 时缩小卡片字号，≥ 10 时启用垂直滚动
- **数据表行列过多**：PropertyPanel 中行列编辑 grid 可能很大。限制显示最多 20 列 × 50 行，超出部分截断并提示
- **向后兼容**：时间轴和数据表从 `chart` type 改为独立 type，旧的保存数据中如果有 `type: 'chart', chartType: 'bar'` 的时间轴/数据表条目，加载后显示为柱状图（不会崩溃）。新的拖放创建走新 type
