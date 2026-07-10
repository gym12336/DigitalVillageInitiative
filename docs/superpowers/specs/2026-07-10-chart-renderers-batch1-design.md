# 图表渲染补全 — 第一批（低复杂度）

## 背景

成果搭建台（builder）的组件库展示了 17 个语义条目，涵盖 14 个叙事场景。但 `chartRenderer.js` 只有 3 种真实渲染（bar / pie / line），其余图表类型拖到画布上全部降级为柱状图。

第一批选取 3 个低复杂度图表，实现真实渲染。

## 目标

为以下 3 个占位图表实现专属 SVG 渲染：

| 组件库条目 | 新 chartType | 场景 |
|-----------|-------------|------|
| 堆叠柱 | `stacked-bar` | 讲「构成 / 分布」 |
| 哑铃图 | `dumbbell` | 讲「变化」— 帮扶对比 |
| 涨跌徽标 | `trend-badge` | 讲「变化」— 帮扶对比 |

## 设计原则

- **纯 SVG 渲染**，零依赖，不引入 ECharts
- **复用现有 CSV 数据模型**，仅扩展解析逻辑
- **走现有 `renderChartSvg()` 分发**，不改变架构
- **与手动拖拽走同一条 add / update / history 路径**

---

## 1. 堆叠柱状图 `stacked-bar`

### CSV 格式

支持多列数值（series 列自动检测——除 `label` 外的所有数值列）：

```csv
label,茶叶,水果,粮食
李家村,210,85,130
张家村,150,120,90
王家村,180,70,110
```

### 渲染逻辑

- 每组（label）渲染一根柱子，由多个色段自底向上堆叠
- 柱宽 = 普通柱状图柱宽
- 每个色段内显示对应数值（≥10 时显示）
- 顶部显示该组总量
- 右侧显示图例（series 名称 + 色块）

### 色板

沿用现有 `COLORS` 数组，按 series 索引取色。

---

## 2. 哑铃图 `dumbbell`

### CSV 格式

```csv
label,start,end
茶叶产量,120,210
农户收入,8000,18500
合作社保有量,3,12
```

### 渲染逻辑

- 水平布局：每行一个 label + 一对圆点（start / end）+ 连接线
- start 圆点颜色浅（`#a0c4d8`），end 圆点颜色深（`#2c7da0`）
- 连线灰色虚线
- 右侧标注变化量（如 `+75%`）
- 行高根据数据量自适应，最少 3 行

---

## 3. 涨跌徽标 `trend-badge`

### CSV 格式

```csv
label,value,change
茶叶总产量,210,+75%
农户年均收入,18500,+131%
```

`change` 列可选。正值为涨（绿色），负值为跌（红色）。

### 渲染逻辑

- 大数字 + 趋势箭头 + 变化百分比
- 单行数据时：居中显示超大数字（font-size 按组件高度缩放），下方显示变化箭头
- 多行数据时：每行一个徽标，水平或垂直排列
- 颜色：涨 `#6fcf97`（绿），跌 `#eb5757`（红）
- 背景：浅色圆角卡片

---

## 改动清单

| 文件 | 改动 |
|------|------|
| `src/modules/builder/editor/chartRenderer.js` | 新增 `parseCSVMultiSeries()`、`renderStackedBarChart()`、`renderDumbbellChart()`、`renderTrendBadge()`；`renderChartSvg()` 的 switch 新增 3 个 case |
| `src/modules/builder/editor/componentFactory.js` | 无需改动（chart 组件默认 props 保持不变，`chartType` 由组件库条目指定） |
| `src/modules/builder/editor/PropertyPanel.vue` | `chartType` 下拉框新增 3 个选项：堆叠柱状图、哑铃图、涨跌徽标 |
| `src/modules/builder/editor/ComponentLibrary.vue` | 修正 3 个条目的 `chartType`：堆叠柱 → `stacked-bar`、哑铃图 → `dumbbell`、涨跌徽标 → `trend-badge` |
| `src/__tests__/` | 新增 3 个渲染函数的单元测试 |

## 不改动

- `stageEditor.js` — 组件模型不变，只是 chart 的 props.chartType 取不同值
- `EditorCanvas.vue` — 它只调 `renderChartSvg()`，不感知具体图表类型
- 后端 API — 纯前端渲染

## 风险

- CSV 多列解析向后兼容：现有的双列 CSV（label,value）在堆叠柱中会退化为单 series 堆叠柱（= 普通柱状图），不会报错
- 涨跌徽标的多行模式：先用垂直排列，后续可按需扩展为水平网格
