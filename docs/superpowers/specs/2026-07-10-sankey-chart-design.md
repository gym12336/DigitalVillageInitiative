# 桑基图（Sankey Diagram）组件设计

## 概述

在 builder 可视化编辑器中新增桑基图 chart 类型，用于展示流向关系数据。桑基图以带宽表示流量大小，左侧为来源节点、右侧为去向节点，中间用曲线连接。

## 数据格式

CSV 三元组格式，每行一条流向：

```csv
source,target,value
产业收入,基础设施建设,120
产业收入,教育投入,80
产业收入,医疗健康,50
政策补贴,基础设施建设,60
政策补贴,教育投入,40
```

- `source`：来源节点名称
- `target`：去向节点名称
- `value`：流量数值（必须为正数）

系统自动从数据中提取所有唯一节点，计算每条链接的带宽比例。

## 节点布局

单层流向：左侧一列来源节点 → 右侧一列去向节点。

- 每个节点的垂直位置由其链接累积位置决定
- 节点高度 = 该节点所有流入/流出流量之和成正比
- 同侧节点间有均匀间距

## SVG 渲染算法

1. **解析**：从 CSV 构建 `{ nodes, links }` 结构，计算 `maxFlow`
2. **布局**：
   - 来源节点垂直排列在左侧（x ≈ 10% 宽度），去向节点在右侧（x ≈ 90% 宽度）
   - 每个节点高度 = 其流量占总流量的比例 × 可用高度
   - 节点用 `<rect>` 绘制，标签在节点旁
3. **连线**：
   - 每条 link 用 `<path>` 绘制三次贝塞尔曲线
   - 曲线起点 = 来源节点的右边缘对应流出口，终点 = 去向节点的左边缘对应流入
   - 线宽（stroke-width）= `link.value / maxFlow * maxBandWidth`
   - 线色跟随来源节点的颜色，带透明度
4. **颜色**：使用现有 `COLORS` 调色板，按来源节点循环分配

## 改动文件

| 文件 | 改动内容 |
|---|---|
| `src/modules/builder/editor/componentFactory.js` | `defaultCsvFor('sankey')` 返回示例 CSV |
| `src/modules/builder/editor/chartRenderer.js` | 新增 `parseCSVSankey()` + `renderSankeyChart()`，`renderChartSvg` 添加 `case 'sankey'` |
| `src/modules/builder/editor/ComponentLibrary.vue` | 桑基图条目 `chartType` 从 `'bar'` 改为 `'sankey'` |

## 与现有体系的兼容性

- 桑基图作为 `chart` 类型的子类型（`chartType: 'sankey'`），与 bar/pie/radar 等完全一致
- 复用现有的 PropertyPanel 图表属性编辑器（标题、CSV 数据编辑）
- 组件库已预留「关系流向 → 桑基图」条目，仅需修正 chartType
- 渲染逻辑内联在 chartRenderer.js，不引入新文件
