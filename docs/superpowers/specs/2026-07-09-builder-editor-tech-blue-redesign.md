# 大组件编辑台 · 科技蓝 UI 重设计

> 为 builder 编辑器的四件套（BigComponentEditor、EditorCanvas、ComponentLibrary、PropertyPanel）及其 JS 渲染器（chartRenderer、sensorRenderer）重新设计视觉风格，参考深色科技风大屏编辑器设计规范。

**范围：** 仅限大组件编辑台（`/builder/editor`），BuilderHub 入口页和其他模块保持现有暖色主题不变。

**方案：** 在 `BigComponentEditor.vue` 的 `.editor-root` 上覆盖 CSS 变量，子组件零修改（变量名不变，自动继承新色值）。硬编码颜色和渲染器 JS 文件同步更新。

**源主题参考：** 另一智慧农业可视化项目的编辑器 UI。核心调色板为青钢蓝（`#245a73` / `#2c7da0`）+ 深色玻璃面板 + 暖橙点缀光晕。

---

## 一、调色板映射

### 1.1 CSS 变量覆盖（在 `.editor-root` 上定义）

| 变量名 | 当前暖色值 | 新科技蓝值 | 用途 |
|--------|-----------|-----------|------|
| `--color-bg` | `#faf8f5` | `#f2f6f8` | 浅底色 |
| `--color-bg-deep` | `#f2ede4` | `#edf2f7` | 深底色 |
| `--color-primary` | `#6b8c5c` | `#2c7da0` | 主色调（按钮、边框、强调） |
| `--color-primary-soft` | `#8aaa7a` | `#4aa3c0` | 主色浅变体 |
| `--color-primary-dark` | `#4d6b3e` | `#245a73` | 深主色（标题、hover） |
| `--color-primary-deep` | `#3a4d2f` | `#1a3f50` | 最深主色 |
| `--color-secondary` | `#d4a373` | `#56ccf2` | 次要强调蓝 |
| `--color-secondary-soft` | `#e6c8a8` | `#a8e0f8` | 次要强调浅 |
| `--color-accent` | `#e8c99b` | `rgba(44,125,160,0.10)` | 强调底色 |
| `--color-accent-soft` | `#f3e2c8` | `rgba(44,125,160,0.05)` | 强调浅底色 |
| `--color-highlight` | `#e07a5f` | `#c0392b` | 删除/危险红 |
| `--color-highlight-soft` | `#f0a590` | `#e08070` | 删除红色浅 |
| `--color-card` | `#ffffff` | `rgba(255,255,255,0.92)` | 面板底（毛玻璃） |
| `--color-text` | `#1e1e1e` | `#1c2834` | 主文字色 |
| `--color-text-secondary` | `#5a5a5a` | `#627586` | 次级文字 |
| `--color-text-light` | `#8a8a8a` | `#687b8b` | 提示文字 |
| `--color-border` | `#ede8e0` | `rgba(44,125,160,0.12)` | 边框 |
| `--color-border-light` | `#f2efe8` | `rgba(44,125,160,0.06)` | 淡边框 |

### 1.2 阴影重定义

| 变量名 | 新值 |
|--------|------|
| `--shadow-xs` | `0 1px 3px rgba(36,90,115,0.04)` |
| `--shadow-sm` | `0 2px 8px rgba(36,90,115,0.06)` |
| `--shadow-card` | `0 4px 24px rgba(36,90,115,0.08)` |
| `--shadow-card-hover` | `0 8px 40px rgba(36,90,115,0.14)` |
| `--shadow-lg` | `0 12px 48px rgba(36,90,115,0.15)` |
| `--shadow-xl` | `0 20px 60px rgba(36,90,115,0.22)` |

### 1.3 编辑器专用 CSS 变量（新增，仅编辑器范围）

```css
--editor-topbar-bg: rgba(18,28,39,0.92);     /* 顶栏深色底 */
--editor-topbar-shadow: 0 18px 50px rgba(0,0,0,0.15);
--editor-canvas-dot: rgba(101,126,152,0.12);  /* 画布十字丝 */
--editor-canvas-grid-line: rgba(101,126,152,0.08);
--editor-select-glow: rgba(44,125,160,0.26);  /* 选中光晕 */
--editor-select-bg: rgba(44,125,160,0.06);    /* 选中底色 */
--editor-input-focus-glow: rgba(44,125,160,0.12); /* 输入框聚焦光晕 */
```

### 1.4 图表色板（chartRenderer.js）

```js
const COLORS = [
  '#2f80ed', '#56ccf2', '#6fcf97', '#f2c94c',
  '#9b51e0', '#eb5757', '#f2994a', '#2c7da0',
  '#6fcf97', '#5d9cec',
]
```

### 1.5 传感器状态色（sensorRenderer.js）

```js
const STATUS_COLORS = {
  normal: '#6fcf97',   // 绿
  warning: '#f2c94c',  // 黄
  error: '#eb5757',    // 红
}
```

---

## 二、编辑器外壳（BigComponentEditor.vue）

### 2.1 页面背景

三重渐变叠加在 `.editor-root`，营造科技光晕感：

```css
background:
  radial-gradient(circle at top left, rgba(88,164,176,0.22), transparent 30%),
  radial-gradient(circle at bottom right, rgba(236,184,101,0.22), transparent 34%),
  linear-gradient(145deg, #f2f6f8, #edf2f7, #f8fbfd);
```

### 2.2 左侧面板 — 组件库

- 宽度 260px（从 240px 微调）
- 大圆角 24px + 白色毛玻璃 `var(--color-card)` + `backdrop-filter: blur(20px)`
- 微弱边框 `1px solid var(--color-border)`
- 大投影 `var(--shadow-card)`
- 悬浮卡片感，与页面背景形成层次
- 折叠按钮：全圆角药丸 `border-radius: 999px`，12px 圆角边框

### 2.3 右侧面板 — 属性

- 宽度 300px（从 280px 微调）
- 同左侧面板的毛玻璃卡片风格
- 选中组件时从右侧滑入（保持现有 transition 逻辑）

---

## 三、画布区域（EditorCanvas.vue）

### 3.1 顶栏

深色玻璃底，与浅色画布区形成明显层次对比：

```css
background: var(--editor-topbar-bg);
box-shadow: var(--editor-topbar-shadow);
backdrop-filter: blur(12px);
padding: 0.5rem 1rem;
```

左上角小标签 "SCREEN BUILDER"：
- 颜色 `#2c7da0`
- `text-transform: uppercase` + `letter-spacing: 0.1em`
- `font-size: 11px` + `font-weight: 700`

工具栏按钮：
- `border-radius: 999px` 全圆角药丸形
- 默认透明底 + 浅白边框 `rgba(255,255,255,0.15)` + 白色文字 `rgba(255,255,255,0.85)`
- hover：上浮 `translateY(-1px)` + 阴影扩散 + 背景增亮
- primary 按钮（保存/预览）：青蓝底 `#2c7da0` + 白色文字

缩放下拉框：12px 大圆角 + 深色底 + 白色文字

### 3.2 画布视口

网格十字丝点阵 + 浅渐变底（24px 间距）：

```css
background:
  linear-gradient(90deg, var(--editor-canvas-grid-line) 1px, transparent 1px),
  linear-gradient(var(--editor-canvas-grid-line) 1px, transparent 1px),
  linear-gradient(145deg, #f8fbfd, #edf3f7);
background-size: 24px 24px, 24px 24px, auto;
```

### 3.3 Stage（画板卡片）

```css
background: #ffffff;
box-shadow:
  inset 0 0 0 1px rgba(0,0,0,0.04),
  0 26px 60px rgba(36,90,115,0.18);
border-radius: 4px;
```

### 3.4 组件在画布中（innerHTML 全局样式）

所有组件的共同特征：
- `position: absolute` + `border-radius: 18px`
- hover 轻微上浮 + 投影：
  ```css
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(36,90,115,0.12);
  ```
- **选中态**：青蓝色外发光描边（替代 `outline` 硬边框）：
  ```css
  box-shadow: 0 0 0 3px var(--editor-select-glow);
  ```
- 保留 `ec-sel` class 用于选中态

缩放手柄（8 方向）：
- `width: 10px; height: 10px; border-radius: 4px`
- 白色底 `#ffffff` + `border: 2px solid #2c7da0`
- 比原来的直角方块更柔和

### 3.5 框选矩形

```css
border: 1px dashed #2c7da0;
background: var(--editor-select-bg);
```

### 3.6 右键菜单

- `border-radius: 18px` 大圆角
- 毛玻璃底 `background: var(--color-card)` + `backdrop-filter: blur(12px)`
- `box-shadow: var(--shadow-lg)`
- 菜单项 hover 底改为 `rgba(44,125,160,0.06)`

### 3.7 底部状态栏

```css
background: var(--editor-topbar-bg);
color: rgba(255,255,255,0.6);
font-size: 0.72rem;
```

---

## 四、画布中组件渲染

### 4.1 图表组件（chartRenderer.js）

| 元素 | 当前值 | 新值 |
|------|--------|------|
| SVG 背景 | `#fff` | `#fafdfe` |
| 色板数组 | 暖色系 10 色 | 科技蓝 10 色（见 1.4） |
| 标题色 | `#333` | `#1c2834` |
| 网格线 | `#eee` | `rgba(101,126,152,0.12)` |
| Y 轴文字 | `#999` | `#687b8b` |
| 柱状图数值 | `#666` | `#627586` |
| X 轴标签 | `#888` | `#687b8b` |
| 饼图标签 | `#666` | `#627586` |
| 折线图数值 | `#666` | `#627586` |
| 无数据背景 | `#faf8f5` | `#f8fbfd` |
| 无数据文字 | `#999` | `#687b8b` |

### 4.2 传感器组件（sensorRenderer.js）— 深色科技风重写

整体布局保持不变，视觉效果重写为深色玻璃科技风：

**外层容器：**
```css
background: linear-gradient(135deg, rgba(7,35,49,0.96), rgba(18,74,93,0.92));
border-radius: 18px;
box-shadow: inset 0 0 0 1px rgba(165,215,228,0.08);
```

**头部区域：**
- 左侧小标签 "SENSORS / DATA"：`#a5d7e4` 青色 + `font-size: 10px` + `text-transform: uppercase` + `letter-spacing: 0.08em` + `opacity: 0.7`
- 右侧模式 chip "手动"：全圆角药丸 `border-radius: 999px` + `rgba(165,215,228,0.12)` 底 + `#c8e8f0` 文字 + `font-size: 10px`
- 标题行：白色大标题 `#ffffff` + `font-size: 17px` + `font-weight: 800` + `letter-spacing: 0.02em`

**数据卡片（每个传感器）：**
```css
background: rgba(230,249,242,0.08);
border-radius: 12px;
border: 1px solid rgba(165,215,228,0.06);
padding: 12px 14px;
```
- 传感器名称：`rgba(255,255,255,0.7)` + `font-size: 12px`
- 数值：`#ffffff` + `font-size: 24px` + `font-weight: 700`
- 单位：`rgba(255,255,255,0.45)` + `font-size: 13px`
- 状态 pill：全圆角药丸 `border-radius: 999px` + 半透明彩色底

状态色更新：
| 状态 | 文字色 | 背景色 |
|------|--------|--------|
| 正常 | `#6fcf97` | `rgba(111,207,151,0.15)` |
| 告警 | `#f2c94c` | `rgba(242,201,76,0.15)` |
| 异常 | `#eb5757` | `rgba(235,87,87,0.15)` |

### 4.3 文本组件

- 保持透明背景（或自定义色）
- hover 选中态通过 `.ec-component` 统一处理（18px 圆角 + 青蓝光晕）

### 4.4 图片组件

- 浅灰底 `#f2f6f8` + 细边框 `1px solid rgba(44,125,160,0.08)`
- 无图片时 placeholder：渐变底 `linear-gradient(135deg, #f2f6f8, #edf2f7)` + 图标文字

---

## 五、左侧面板 — 组件库（ComponentLibrary.vue）

### 5.1 搜索框

```css
border-radius: 12px;
border: 1px solid var(--color-border);
transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
```
聚焦态：
```css
border-color: #2c7da0;
box-shadow: 0 0 0 3px var(--editor-input-focus-glow);
```

### 5.2 分类折叠项

- hover 时文字色变为 `#2c7da0`
- 展开箭头 `::marker` 色变为 `#2c7da0`
- 底部淡分隔线 `var(--color-border-light)`

### 5.3 拖拽卡片

```css
border-radius: 18px;
background: rgba(44,125,160,0.03);
border: 1px solid var(--color-border-light);
```
hover：
```css
transform: translateY(-2px);
border-color: #2c7da0;
box-shadow: var(--shadow-sm);
```

### 5.4 分类计数 chip

```css
border-radius: 999px;
background: rgba(44,125,160,0.08);
color: #2c7da0;
font-size: 0.68rem;
```

---

## 六、右侧面板 — 属性（PropertyPanel.vue）

### 6.1 Section 区块

```css
border-radius: 18px;
background: rgba(44,125,160,0.02);
border: 1px solid var(--color-border-light);
padding: 1rem;
```

### 6.2 输入框 / 下拉框 / 文本域

```css
border-radius: 12px;
border: 1px solid var(--color-border);
```
聚焦态（统一）：
```css
border-color: #2c7da0;
box-shadow: 0 0 0 3px var(--editor-input-focus-glow);
```

### 6.3 属性 hint 文字

```css
font-size: 13px;
color: #687b8b;
line-height: 1.7;
```

### 6.4 删除按钮

```css
color: #c0392b;
border-radius: 8px;
```
hover：`background: rgba(192,57,43,0.06)`

### 6.5 添加按钮（+ 添加传感器）

```css
border-radius: 999px;
border: 1px solid #2c7da0;
color: #2c7da0;
```
hover：
```css
background: #2c7da0;
color: #ffffff;
```

### 6.6 传感器行

- 输入框与全局输入框风格一致（12px 圆角）
- 删除按钮（×）hover 变红 `#c0392b`

---

## 七、文件改动清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `BigComponentEditor.vue` | 中度 | 新增约 45 行 CSS 变量覆盖 + 背景渐变 + 面板大圆角毛玻璃 |
| `EditorCanvas.vue` | 重度 | 顶栏深色重写、画布十字丝网格、stage 投影、组件选中光晕、手柄圆角、框选/右键菜单/状态栏样式 |
| `ComponentLibrary.vue` | 轻度 | 搜索框圆角+光晕、卡片圆角+hover 效果、chip 样式 |
| `PropertyPanel.vue` | 轻度 | section 圆角、表单控件圆角+光晕、按钮样式、hint 文字 |
| `chartRenderer.js` | 轻度 | 色板替换、文字色/网格线色/背景色替换 |
| `sensorRenderer.js` | 重度 | 深色科技风重写（外层容器、头部、数据卡片、状态 pill） |

---

## 八、不做改动

- BuilderHub.vue（入口页，保持暖色调）
- stageEditor.js（纯逻辑，无样式）
- componentFactory.js（纯数据，无样式）
- buildPreview.js（导出预览，保持与编辑器一致的基础渲染，色值同步更新即可）
- theme.css（全局主题，不动）
- 项目其余所有模块
