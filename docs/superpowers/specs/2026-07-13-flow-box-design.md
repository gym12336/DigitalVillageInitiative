# 流动组件框（flow-box）设计

## 概述

新增组合类组件 `flow-box`（流动组件框），类似于 `layout-box`（多组件框），可嵌入多个子组件，但一次只展示一个，子组件按顺序轮播呈现，支持滑动切换动画、鼠标滚轮手动切换、自动轮播。

## 需求摘要

| 方面 | 决定 |
|---|---|
| 组件类型名 | `flow-box` |
| 容器行为 | 嵌入多个子组件，一次只展示一个 |
| 子组件排序 | 属性面板中可拖拽调整顺序 |
| 切换动画 | 左右滑动（轮播风格），仅预览态播放动画，编辑态即时切换 |
| 导航 | 底部圆点指示器，可点击跳转；无左右箭头 |
| 手动切换 | 鼠标滚轮滚动控制 |
| 自动轮播 | 支持，间隔时间用户可配置（默认 5 秒） |
| 循环模式 | 首尾循环（无限轮播） |
| 子组件尺寸 | 填满容器 |
| 默认尺寸 | 900 × 500 |
| 分类 | 放入「组合」分类，与 layout-box 并列 |

## 数据模型

```js
{
  type: 'flow-box',
  x, y,
  width: 900, height: 500,
  props: {
    title: '',
    children: [],           // 子组件数组，按展示顺序排列
    activeIndex: 0,         // 当前展示的子组件索引
    autoPlay: true,         // 是否自动轮播
    interval: 5,            // 自动轮播间隔（秒），范围 1-30
    animation: 'slide',     // 切换动画类型（当前仅 'slide'，字段预留扩展）
    animationDuration: 400, // 动画时长（ms），可选 200/400/600
  }
}
```

与 `layout-box` 的区别：
- 没有 `slotCount` / `layout` / `splitRatios` — 不需要分屏布局
- `children[]` 是扁平动态数组，不是固定长度的稀疏插槽数组
- 新增轮播控制字段：`activeIndex`、`autoPlay`、`interval`、`animation`、`animationDuration`

## 渲染机制

### 编辑态（EditorCanvas）

- 始终展示 `activeIndex` 对应的当前子组件
- 子组件填满整个 flow-box 容器区域
- 底部叠加圆点指示器（半透明背景，不遮挡子组件内容）：
  - 每个子组件对应一个圆点
  - 当前激活圆点高亮（主题色填充），其余为空心或半透明
  - 点击圆点切换到对应子组件
- 鼠标滚轮在 flow-box 区域内切换子组件
- 选中态：蓝色选中框 + 四角拖拽手柄 + 右下角缩放手柄（与其他组件一致）
- 空状态（children 为空）：显示虚线占位提示「拖入组件开始轮播」
- 编辑态不做切换动画，即时切换

### 预览态（buildPreview）

- 按设定间隔自动轮播（autoPlay 为 true 时）
- 响应鼠标滚轮手动切换
- 切换时播放左右滑动动画（CSS transform + transition）
- 同样渲染圆点指示器
- 无编辑交互（无选中框、手柄、拖入）

### 切换动画

仅预览态播放，编辑态即时切换。

滑动逻辑：
1. 计算方向：目标索引 > 当前索引 → 向左滑入（→），目标索引 < 当前索引 → 向右滑入（←）
2. 首尾循环时，从最后一个到第一个视为向前（→），从第一个到最后一个视为向后（←）
3. 旧组件滑出视野，新组件滑入，动画完成后更新 `activeIndex`
4. 动画参数：`transition: transform ${animationDuration}ms ease`

## 属性面板

### 容器层（默认视图）

| 属性 | 控件 | 说明 |
|---|---|---|
| 标题 | 文本输入框 | 与 layout-box 一致 |
| 子组件列表 | 可拖拽排序列表 | 每项显示组件类型图标 + 名称，拖拽手柄调整顺序，右侧删除按钮 |
| 自动轮播 | 开关 | 开启/关闭 |
| 轮播间隔 | 数字输入 | 1-30 秒，autoPlay 关闭时置灰 |
| 动画时长 | 下拉选择 | 快(200ms) / 中(400ms) / 慢(600ms)，默认中 |

### 子组件编辑层

点击子组件列表中的某一项 → 进入该子组件的属性编辑界面，顶部显示「← 返回容器」按钮（与 layout-box 子编辑模式一致）。

## 拖入交互

从组件库拖拽组件到 flow-box 区域时：
1. 通过 `document.elementFromPoint()` 检测落点是否在 flow-box 的 `[data-flow-box]` 元素内
2. 创建对应的子组件实例
3. 追加到 `children[]` 末尾
4. 自动切换 `activeIndex` 到新组件

## 涉及文件

| 文件 | 变更 |
|---|---|
| `src/modules/builder/editor/componentFactory.js` | 新增 `createFlowBoxComponent(x, y)` 工厂函数 |
| `src/modules/builder/editor/EditorCanvas.vue` | 新增 `renderFlowBoxMarkup()`、拖入 flow-box 逻辑、滚轮切换、圆点点击 |
| `src/modules/builder/editor/PropertyPanel.vue` | 新增 flow-box 容器属性编辑 + 子组件列表排序 |
| `src/modules/builder/editor/buildPreview.js` | 新增 `renderFlowBoxPreview()` 含滑动动画 |
| `src/modules/builder/editor/ComponentLibrary.vue` | 「组合」分类新增 flow-box 条目 |
| `src/modules/builder/display/DisplayComponentLibrary.vue` | 同上 |

## 边界情况

| 场景 | 处理 |
|---|---|
| children 为空 | 编辑态显示占位提示；预览态显示空状态（不报错） |
| 只有 1 个子组件 | 正常显示，不轮播，不显示圆点指示器 |
| 自动轮播 + 用户滚轮 | 滚轮操作后重置自动轮播计时器（防止刚手动切完就被自动切走） |
| 删除当前子组件 | activeIndex 自动调整：如果是最后一个则减 1，否则保持（后续元素前移） |
| 首尾循环 | 最后一个 → 第一个 和 第一个 → 最后一个 都允许，动画方向正确 |

## 不包含的内容

- 上下滑动 / 淡入淡出 / 缩放 / 3D 翻转等其他动画类型（`animation` 字段预留，本次仅实现 `slide`）
- 移动端触摸滑动
- 缩略图导航
