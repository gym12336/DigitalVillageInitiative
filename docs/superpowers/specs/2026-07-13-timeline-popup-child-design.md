# 时间轴事件悬浮弹出小组件

**日期**: 2026-07-13  
**状态**: 已确认

## 概述

重新设计时间轴组件：每个事件可关联一个已有的基础组件（文本、图片、图表、传感器、时间轴、数据表），该小组件默认隐藏，鼠标 hover 到事件上时悬浮弹出。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/modules/builder/editor/componentFactory.js` | 默认事件结构增加 child/popupWidth/popupHeight |
| `src/modules/builder/editor/PropertyPanel.vue` | 事件编辑区增加关联小组件的类型选择和属性配置 |
| `src/modules/builder/editor/timelineRenderer.js` | 渲染弹出层 HTML + CSS hover 逻辑 |
| `src/modules/builder/editor/buildPreview.js` | 无需改动（CSS hover 天然支持） |
| `src/modules/builder/editor/EditorCanvas.vue` | 无需改动（复用 renderTimelineMarkup） |

## 1. 数据模型

每个事件新增字段：

```js
{
  date: '2020-03',
  title: '事件标题',
  description: '事件描述',
  child: null,        // 可选：关联的小组件对象，null 表示无
  popupWidth: 280,    // 弹出层宽度
  popupHeight: 200,   // 弹出层高度
}
```

`child` 结构为标准组件对象（除 `layout-box`、`flow-box` 外均可）：

```js
{ type: 'chart', x: 0, y: 0, width: 280, height: 200, props: { chartType: 'bar', ... } }
```

## 2. Component Factory

`createTimelineComponent` 的默认事件：`child: null`，`popupWidth: 280`，`popupHeight: 200`。  
新增辅助函数 `createEmptyChildComponent(type)` 用于创建指定类型的空 child。

## 3. PropertyPanel

每个事件行下方增加「关联小组件」配置区：

- `<select>` 选择类型：无 / 文本 / 图片 / 图表 / 传感器 / 时间轴 / 数据表
- 选择类型后显示该类型的属性编辑（复用 PropertyPanel 现有按类型渲染逻辑，pattern 同 layout-box slot 子组件编辑）
- 弹出宽高两个 `<input type="number">`

`addTimelineEvent` 默认 child 为 null；`removeTimelineEvent` 无需额外处理。

## 4. Renderer（timelineRenderer.js）

`renderTimelineMarkup` 中每个事件渲染逻辑：

- 若有 `child`，在事件卡片同侧生成弹出层 `<div>`
- 弹出层使用 CSS class 控制显示/隐藏，hover 热区覆盖事件卡片 + 弹出层区域，防止鼠标移动过程中消失
- 弹出层样式：白色背景、圆角、`box-shadow: 0 4px 24px rgba(0,0,0,0.15)`、`opacity` + `transform` 过渡 ~200ms
- 弹出层内容调用 `renderComponentHtml(child)` 渲染
- 若 `child` 为 null，不渲染弹出层

## 5. 边界情况

- **child 组件尺寸超出弹出层**：子组件渲染时使用 `overflow: hidden` 裁剪
- **事件靠近画布边缘**：弹出层优先往右展开，右边缘不足时往左
- **多个事件密集排列**：弹出层 z-index 确保在最上层
- **预览导出**：CSS hover 机制原生支持，buildPreview.js 无需改动
