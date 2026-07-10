# 大屏展示工作台 · 设计规格

> 版本：v1.0 | 日期：2026-07-10 | 状态：待实现

---

## 1. 概述

### 1.1 定位

大屏展示工作台（Display Workbench）是成果搭建台的第二个工作台，与大组件编辑台（Big Component Editor）并列。它用于排版使用**所有可用组件**（原生小组件 + 用户自定义大组件），构建最终的大屏展示页，并支持一键导出。

### 1.2 与大组件编辑台的关系

```
大组件编辑台 ──「生产」──→ 自定义大组件 ──「收录」──→ 大屏展示工作台
                                                       +
                                               原生小组件（13 类）
                                                       ↓
                                              构建大屏展示页 → 导出
```

- **大组件编辑台**：组合小组件 → 保存为大组件 → 收录到自定义大组件库
- **大屏展示工作台**：消费原生小组件 + 自定义大组件 → 排版大屏页 → 导出

### 1.3 核心差异

| 维度 | 大组件编辑台 | 大屏展示工作台 |
|------|-------------|---------------|
| 组件来源 | 13 类原生小组件 | 13 类原生小组件 + 自定义大组件 |
| 产物 | 自定义大组件 | 大屏展示页 |
| 导出 | 大组件 JSON | 完整 HTML 页面 |

---

## 2. 架构设计

### 2.1 整体布局

沿用大组件编辑台的三栏布局和科技蓝主题：

```
┌──────────────────────────────────────────────────────┐
│  顶栏：组件快捷添加 + 撤销/重做 + 缩放 + 保存/预览     │
├──────────┬──────────────────────────┬────────────────┤
│ 组件库    │                         │  属性面板        │
│ (260px)  │       画布              │  (300px)        │
│          │   (拖拽/缩放/框选/       │                │
│ 13 类    │    撤销/重做/右键菜单)    │  选中组件属性    │
│ 原生组件  │                         │  画布设置        │
│          │                         │                │
│ ──────── │                         │                │
│ ★自定义  │                         │                │
│  大组件   │                         │                │
│          │                         │                │
└──────────┴──────────────────────────┴────────────────┘
```

### 2.2 代码复用策略

大屏展示工作台**最大化复用**大组件编辑台的现有模块：

| 模块 | 复用方式 | 说明 |
|------|---------|------|
| `stageEditor.js` | 直接复用 | 状态管理、撤销重做、选择、保存/加载 |
| `componentFactory.js` | 直接复用 | text/image/chart/agri-sensor 创建 |
| `chartRenderer.js` | 直接复用 | SVG 图表渲染 |
| `sensorRenderer.js` | 直接复用 | 传感器面板渲染 |
| `buildPreview.js` | 直接复用 | HTML 导出 |
| `PropertyPanel.vue` | 直接复用 | 属性编辑面板 |
| `EditorCanvas.vue` | **参考重构** | 画布 + 顶栏，需支持大组件的展开渲染 |

### 2.3 新增模块

| 文件 | 职责 |
|------|------|
| `DisplayWorkbench.vue` | 重写：三栏布局壳子，引入 DisplayComponentLibrary + 画布 + 属性面板 |
| `DisplayComponentLibrary.vue` | 新建：组件库面板，13 类原生组件 + 自定义大组件分类 |
| `bigComponentStore.js` | 新建：自定义大组件的 CRUD + localStorage 持久化 |

### 2.4 文件变更清单

| 文件 | 动作 | 说明 |
|------|------|------|
| `src/modules/builder/display/DisplayWorkbench.vue` | 重写 | 占位页 → 完整工作台 |
| `src/modules/builder/display/DisplayComponentLibrary.vue` | 新建 | 扩展版组件库 |
| `src/modules/builder/display/bigComponentStore.js` | 新建 | 大组件持久化 |
| `src/modules/builder/editor/EditorCanvas.vue` | 修改 | 增加「保存为大组件」按钮 |
| `src/modules/builder/editor/BigComponentEditor.vue` | 不改 | 无需变更 |
| `src/modules/builder/BuilderHub.vue` | 修改 | 激活大屏展示工作台卡片 |
| `src/modules/builder/routes.js` | 不改 | 路由已存在 |

---

## 3. 数据结构

### 3.1 自定义大组件

```javascript
// bigComponentStore 中存储的大组件结构
{
  id: 'bc_1700000000000',       // 唯一标识
  name: '村庄概览看板',           // 用户命名的名称
  thumbnail: '',                 // 缩略图（后续可生成 canvas 截图）
  createdAt: 1700000000000,      // 创建时间戳
  children: [                    // 子组件数组（stageEditor 组件格式的快照）
    {
      type: 'agri-sensor',
      x: 0, y: 0,
      width: 430, height: 400,
      props: { title: '传感器', sensors: [...] }
    },
    {
      type: 'chart',
      x: 450, y: 0,
      width: 520, height: 320,
      props: { title: '数据图表', chartType: 'bar', csvText: '...' }
    },
  ],
  // 自动计算的元信息
  totalWidth: 970,               // children 中 max(x + width)
  totalHeight: 400,              // children 中 max(y + height)
}
```

### 3.2 localStorage 键名

| 键 | 用途 | 使用者 |
|----|------|--------|
| `builder-save` | 编辑台画布状态 | BigComponentEditor |
| `builder-display-save` | 展示台画布状态 | DisplayWorkbench |
| `builder-big-components` | 自定义大组件库 | bigComponentStore |

---

## 4. 交互流程

### 4.1 大组件编辑台 → 保存大组件

```
用户在编辑台选中若干组件
  → 点击顶栏「📦 保存为大组件」
  → 弹出命名弹窗（输入大组件名称）
  → 确认 → 以选中组件为 children 创建大组件记录
  → 存入 localStorage 'builder-big-components'
  → Toast 提示「已收录到自定义大组件库」
```

### 4.2 大屏展示工作台 → 使用大组件

```
用户在展示台左侧组件库
  → 展开「自定义大组件」分类
  → 拖拽某个大组件到画布
  → 大组件的所有 children 被实例化到画布上
  → children 的相对位置以大组件定义为准
  → 实例化后各子组件可独立选中、编辑（不再保持组关系）
```

### 4.3 大屏展示工作台 → 导出

```
与编辑台完全一致：
  点击顶栏「👁 预览」→ buildAndOpen() → 新窗口打开完整 HTML
```

---

## 5. 组件设计

### 5.1 DisplayWorkbench.vue

三栏布局壳子，结构和 BigComponentEditor.vue 一致：

- 左侧：`DisplayComponentLibrary`
- 中间：复用 `EditorCanvas`（需适配使其支持大组件渲染）
- 右侧：`PropertyPanel`（直接复用）

使用相同的科技蓝 CSS 变量覆盖。

### 5.2 DisplayComponentLibrary.vue

在 ComponentLibrary.vue 的 13 个分类基础上，追加第 14 个分类：

```javascript
{
  id: 'custom-big',
  icon: '🧩',
  name: '自定义大组件',
  items: []  // 从 bigComponentStore 动态加载
}
```

每个大组件 item 的拖拽数据为 `{ type: 'big-component', bigComponentId: 'bc_...' }`。

### 5.3 bigComponentStore.js

```javascript
// 核心 API
export function loadBigComponents()            // 从 localStorage 读取全部大组件
export function saveBigComponent(name, children) // 保存新的大组件
export function deleteBigComponent(id)          // 删除大组件
export function getBigComponent(id)             // 获取单个大组件
```

---

## 6. 顶栏变更

EditorCanvas 顶栏新增一个按钮：

```
[← 返回] [T 文本] [📊 图表] [🖼 图片] [🌡 传感器] | [↩] [↪] | [📦 保存为大组件] [缩放] | [💾 保存] [👁 预览]
```

点击「📦 保存为大组件」且当前有选中组件时：
1. 弹出命名对话框
2. 将选中的组件（如选中了一个大组件中的子组件，则取该子组件所在的大组件全部 children）序列化
3. 计算 relative 坐标（以最小 x、最小 y 为原点归零）
4. 存入 bigComponentStore

---

## 7. 测试要点

- bigComponentStore 的 CRUD 操作
- 大组件拖入画布后子组件正确展开
- 大组件子组件坐标正确偏移
- 保存大组件时坐标归零计算正确
- 删除大组件后组件库列表更新
- 展示台和编辑台的 localStorage 键不冲突
- BuilderHub 卡片状态正确切换

---

## 8. 后续迭代（不在本期范围）

- 大组件缩略图自动生成
- 大组件拖入后保持组关系（可整体移动/缩放）
- 结合规则引擎（语义约束、布局模板）
- 大组件编辑台内的结合规则引导
- 大屏自适应布局（响应式断点）
