# Map3D 编辑态缩略图 拖动平移视角 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让编辑态的 Map3D 缩略图 canvas 支持鼠标拖动来平移地理中心（更新 `comp.props.centerLng/centerLat`）。

**Architecture:** 拖动只在 Map3DComponent.vue 内部。拖动过程中用 CSS `transform: translate` 位移 canvas（不改 reactive 状态、不发新请求）。松手时用纯函数 `pixelsToLngLat` 换算屏幕位移为经纬度增量，一次性写入 props；现有 watcher 触发 renderThumbnail 用新中心重画瓦片；调 `pushHistory()` 记一条 undo 历史。

**Tech Stack:** Vue 3 Composition API、Pointer Events API（`setPointerCapture` / `releasePointerCapture` / pointerdown / pointermove / pointerup / pointercancel）、Vitest（纯函数单测）。

## Global Constraints

- 改动只涉及 `src/modules/builder/editor/map3d/Map3DComponent.vue` 和 `src/__tests__/builder-tianditu.test.js`。不改 tianditu.js、cesiumScene.js、componentFactory.js、PropertyPanel.vue、EditorCanvas.vue。
- 拖动过程中不发新 HTTP 请求（性能 + 天地图 QPS）。
- < 3 屏幕像素的位移视作意外抖动，不改 props、不 pushHistory。
- 换算基于拖动开始时的快照（startLng/startLat/startZoom），不受拖动中被外部修改的 reactive 状态影响。
- 抓住地图拖语义：dx>0（手指往右）→ dLng<0；dy>0（手指往下）→ dLat>0。
- Ctrl+Z 一次能撤销一次拖动。

---

### Task 1: 抽出纯函数 `pixelsToLngLat` 并加单测

**Files:**
- Create: `src/modules/builder/editor/map3d/panMath.js`
- Modify: `src/__tests__/builder-tianditu.test.js`（在文件末尾新增 describe）

**Rationale：** 纯函数放独立文件而非 SFC，Vitest 可以直接 import 单测，SFC 保持薄。

**Interfaces:**
- Consumes: 无
- Produces:
  - `export function pixelsToLngLat(dx: number, dy: number, centerLat: number, zoom: number): { dLng: number, dLat: number }` — 把屏幕（canvas）像素位移换算成经纬度增量，遵守"抓住地图拖"方向语义。

- [ ] **Step 1: 写第一个失败测试**

编辑 `src/__tests__/builder-tianditu.test.js`，在文件末尾追加：

```js
import { pixelsToLngLat } from '../modules/builder/editor/map3d/panMath.js'

describe('pixelsToLngLat', () => {
  it('返回 { dLng: 0, dLat: 0 } 当 dx=0, dy=0', () => {
    const r = pixelsToLngLat(0, 0, 30, 17)
    expect(r.dLng).toBe(0)
    expect(r.dLat).toBe(0)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/__tests__/builder-tianditu.test.js`
Expected: FAIL — `Cannot find module '.../panMath.js'`

- [ ] **Step 3: 创建 panMath.js 的最小实现**

Create `src/modules/builder/editor/map3d/panMath.js`：

```js
// Pure conversion functions for Map3D thumbnail drag-to-pan.
// See docs/superpowers/specs/2026-07-13-map3d-drag-pan-design.md

export function pixelsToLngLat(dx, dy, centerLat, zoom) {
  if (dx === 0 && dy === 0) return { dLng: 0, dLat: 0 }
  const latRad = centerLat * Math.PI / 180
  const mpp = 156543.03392 * Math.cos(latRad) / Math.pow(2, zoom)
  const dxMeters = dx * mpp
  const dyMeters = dy * mpp
  const dLng = -dxMeters / (111320 * Math.cos(latRad))
  const dLat = dyMeters / 110540
  return { dLng, dLat }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/__tests__/builder-tianditu.test.js`
Expected: PASS

- [ ] **Step 5: 追加剩余 5 个测试**

在同一个 describe 块里，紧跟第一个 it 之后追加：

```js
  it('赤道 zoom=17，dx=+100 → dLng ≈ -0.001073°', () => {
    const r = pixelsToLngLat(100, 0, 0, 17)
    // mpp = 156543.03392 / 2^17 = 1.1943... m/px
    // dLng = -100 * 1.1943 / 111320 = -0.001073°
    expect(r.dLng).toBeCloseTo(-0.001073, 6)
    expect(r.dLat).toBe(0)
  })

  it('纬度 30°，|dLng| 比赤道大约 1/cos(30°) ≈ 1.155 倍', () => {
    const eq = pixelsToLngLat(100, 0, 0, 17)
    const at30 = pixelsToLngLat(100, 0, 30, 17)
    const ratio = Math.abs(at30.dLng / eq.dLng)
    expect(ratio).toBeCloseTo(1 / Math.cos(30 * Math.PI / 180), 3)
  })

  it('方向：dx=+100 → dLng < 0（抓住地图拖）', () => {
    const r = pixelsToLngLat(100, 0, 30, 17)
    expect(r.dLng).toBeLessThan(0)
  })

  it('方向：dy=+100 → dLat > 0（画布下方是北）', () => {
    const r = pixelsToLngLat(0, 100, 30, 17)
    expect(r.dLat).toBeGreaterThan(0)
  })

  it('zoom=18 相比 zoom=17，同 dx 下 |dLng| 减半', () => {
    const z17 = pixelsToLngLat(100, 0, 30, 17)
    const z18 = pixelsToLngLat(100, 0, 30, 18)
    expect(Math.abs(z18.dLng) / Math.abs(z17.dLng)).toBeCloseTo(0.5, 3)
  })
```

- [ ] **Step 6: 运行完整 describe 确认全通过**

Run: `npx vitest run src/__tests__/builder-tianditu.test.js`
Expected: 6 new tests pass (17 existing + 6 new = 23 total in this file, all green)

- [ ] **Step 7: 提交**

```bash
git add src/modules/builder/editor/map3d/panMath.js src/__tests__/builder-tianditu.test.js
git commit -m "feat(map3d): add pixelsToLngLat pure fn for drag-to-pan

Screen-pixel displacement → geographic delta at a given
center-lat and Web Mercator zoom, using 'grab-the-map' direction.
Six unit tests cover origin, magnitude at equator, cos-latitude
scaling, direction, and zoom halving."
```

---

### Task 2: 组件里加拖动状态 + pointerdown 处理

**Files:**
- Modify: `src/modules/builder/editor/map3d/Map3DComponent.vue`

**Interfaces:**
- Consumes: `pixelsToLngLat` from Task 1（本任务只 import，不用；预留给 Task 3）；`pushHistory` from `../stageEditor.js`（预留给 Task 3）；`state.zoom` from `../stageEditor.js`（预留给 Task 3）
- Produces:
  - 组件内部 `panState`（module-scoped `let`，非 reactive）：`null | { startClientX, startClientY, startLng, startLat, startZoom, pointerId }`
  - canvas 元素的 `@pointerdown="onPanStart"` 事件处理器
  - `onPanStart(e)` — 检查左键、快照起始态、setPointerCapture、stopPropagation。不做位移、不做换算（后续任务）。

- [ ] **Step 1: 在 `<script setup>` 顶部加 import 和状态**

在 [Map3DComponent.vue](src/modules/builder/editor/map3d/Map3DComponent.vue) 的 `<script setup>` 里现有 import 块（`import { getTiandituKey, getIonToken } from './mapConfig.js'` 那行）之后追加：

```js
import { pixelsToLngLat } from './panMath.js'
import { state as editorState, pushHistory } from '../stageEditor.js'
```

然后在现有 `let sceneController = null` / `let drawToken = 0` 声明之后追加：

```js
let panState = null
```

- [ ] **Step 2: 加 onPanStart 函数**

在 `renderThumbnail` 函数之前（约第 74 行），或紧跟 `let panState = null` 之后，插入：

```js
function onPanStart(e) {
  if (e.button !== 0) return
  if (!thumbCanvas.value) return
  const p = comp.value.props
  if (p.centerLng == null || p.centerLat == null) return
  panState = {
    startClientX: e.clientX,
    startClientY: e.clientY,
    startLng: p.centerLng,
    startLat: p.centerLat,
    startZoom: p.thumbnailZoom ?? 17,
    pointerId: e.pointerId,
  }
  try { thumbCanvas.value.setPointerCapture(e.pointerId) } catch (_) {}
  e.stopPropagation()
}
```

- [ ] **Step 3: 把 @pointerdown 绑到 canvas 上**

在 `<template>` 里找到（约第 10-14 行）：

```html
<canvas
  v-else-if="mode === 'edit' && isLocated && !imageFailed"
  ref="thumbCanvas"
  class="m3d-thumb-canvas"
></canvas>
```

改为：

```html
<canvas
  v-else-if="mode === 'edit' && isLocated && !imageFailed"
  ref="thumbCanvas"
  class="m3d-thumb-canvas"
  @pointerdown="onPanStart"
></canvas>
```

- [ ] **Step 4: 手工验证：pointerdown 快照生效**

Run `npm run dev`, 打开 builder 编辑器，加一个 3D 地图组件，搜索选中一个村庄。打开浏览器 DevTools，在 Sources 面板给 `onPanStart` 加断点。按下缩略图，断点应命中，panState 被赋值。松开鼠标（还没有 pointerup 处理，所以 panState 会残留 —— 不影响本步验证）。手工验证完关掉 dev server。

Expected: 断点命中；panState 里各字段值正确（`startLng` = 当前 comp.props.centerLng，`startZoom` = 17 之类）

- [ ] **Step 5: 提交**

```bash
git add src/modules/builder/editor/map3d/Map3DComponent.vue
git commit -m "feat(map3d): capture drag start state on canvas pointerdown

Snapshots startLng/Lat/Zoom + startClientX/Y, calls setPointerCapture
so subsequent pointer events reach us even outside the canvas. Only
left-button drags on a located map enter pan mode."
```

---

### Task 3: 加 pointermove 实时视觉位移

**Files:**
- Modify: `src/modules/builder/editor/map3d/Map3DComponent.vue`

**Interfaces:**
- Consumes: `panState` from Task 2；`editorState.zoom` from stageEditor.js
- Produces:
  - `onPanMove(e)` — 计算 dx/dy，除以 stage zoom，直接写 canvas.style.transform
  - `@pointermove="onPanMove"` 绑定

- [ ] **Step 1: 加 onPanMove 函数**

在 `onPanStart` 后紧跟着插入：

```js
function onPanMove(e) {
  if (!panState) return
  if (!thumbCanvas.value) return
  const stageZoom = editorState.zoom || 1
  const dxCanvas = (e.clientX - panState.startClientX) / stageZoom
  const dyCanvas = (e.clientY - panState.startClientY) / stageZoom
  thumbCanvas.value.style.transform = `translate(${dxCanvas}px, ${dyCanvas}px)`
}
```

- [ ] **Step 2: 把 @pointermove 绑到 canvas 上**

在 `<template>` 里那个 canvas 元素上追加 `@pointermove="onPanMove"`：

```html
<canvas
  v-else-if="mode === 'edit' && isLocated && !imageFailed"
  ref="thumbCanvas"
  class="m3d-thumb-canvas"
  @pointerdown="onPanStart"
  @pointermove="onPanMove"
></canvas>
```

- [ ] **Step 3: 手工验证：拖动过程中缩略图跟着手指走**

Run `npm run dev`, 打开一个已定位的 3D 地图组件。按住鼠标在缩略图内拖动 —— 缩略图应实时跟着手指移动（但松手没有效果，因为还没写 pointerup —— 缩略图会卡在最后位置且 panState 残留 —— 这是预期的中间状态）。

如果需要重置：刷新页面。

Expected: 拖动过程中缩略图跟着鼠标平移；边缘之外露出灰底/空白（正常，等 Task 5 之后松手会重画）

- [ ] **Step 4: 提交**

```bash
git add src/modules/builder/editor/map3d/Map3DComponent.vue
git commit -m "feat(map3d): live-translate canvas during drag via CSS transform

pointermove writes translate(dx/stageZoom, dy/stageZoom) directly
to the canvas element style. No reactive state, no HTTP requests
during the drag."
```

---

### Task 4: 加 pointerup 提交或取消

**Files:**
- Modify: `src/modules/builder/editor/map3d/Map3DComponent.vue`

**Interfaces:**
- Consumes: `panState` from Task 2；`pixelsToLngLat` from Task 1；`pushHistory` from stageEditor.js；`editorState.zoom`
- Produces:
  - `onPanEnd(e)` — 计算 dx/dy，如果 <3px 就取消，否则换算 → 写 props → 归零 transform → pushHistory
  - `@pointerup="onPanEnd"` 绑定
  - 一个私有 helper `cancelPan()` — 归零 transform，释放 pointer capture，清空 panState

- [ ] **Step 1: 加 cancelPan helper**

紧跟 `onPanMove` 后插入：

```js
function cancelPan() {
  if (thumbCanvas.value) thumbCanvas.value.style.transform = ''
  if (panState && thumbCanvas.value) {
    try { thumbCanvas.value.releasePointerCapture(panState.pointerId) } catch (_) {}
  }
  panState = null
}
```

- [ ] **Step 2: 加 onPanEnd 函数**

紧跟 `cancelPan` 后插入：

```js
function onPanEnd(e) {
  if (!panState) return
  const stageZoom = editorState.zoom || 1
  const dxCanvas = (e.clientX - panState.startClientX) / stageZoom
  const dyCanvas = (e.clientY - panState.startClientY) / stageZoom
  const dxScreen = e.clientX - panState.startClientX
  const dyScreen = e.clientY - panState.startClientY
  const distSq = dxScreen * dxScreen + dyScreen * dyScreen
  if (distSq < 9) {
    cancelPan()
    return
  }
  const { dLng, dLat } = pixelsToLngLat(dxCanvas, dyCanvas, panState.startLat, panState.startZoom)
  comp.value.props.centerLng = panState.startLng + dLng
  comp.value.props.centerLat = panState.startLat + dLat
  cancelPan()
  pushHistory()
}
```

- [ ] **Step 3: 把 @pointerup 绑到 canvas 上**

canvas 元素上继续追加 `@pointerup="onPanEnd"`：

```html
<canvas
  v-else-if="mode === 'edit' && isLocated && !imageFailed"
  ref="thumbCanvas"
  class="m3d-thumb-canvas"
  @pointerdown="onPanStart"
  @pointermove="onPanMove"
  @pointerup="onPanEnd"
></canvas>
```

- [ ] **Step 4: 手工验证：拖动可以提交**

Run `npm run dev`, 拖动缩略图然后松手：
- 缩略图应先归零 transform，然后 watcher 触发 renderThumbnail 用新中心重画
- 属性面板里 centerLng / centerLat 值应更新（如果属性面板没显示这两个值，打开 Vue DevTools 看 comp.props）
- 只轻点一下（<3px）不应改动 props

Expected: 拖动后缩略图落在新位置；轻点不改任何东西

- [ ] **Step 5: 手工验证：Ctrl+Z 可以撤销**

拖动一次，按 Ctrl+Z（如果编辑器 undo 快捷键是别的，看 EditorCanvas.vue 里的绑定），centerLng/Lat 应回到拖动之前的值，缩略图应重画回原位置。

Expected: 一次拖动 = 一条 undo 记录

- [ ] **Step 6: 提交**

```bash
git add src/modules/builder/editor/map3d/Map3DComponent.vue
git commit -m "feat(map3d): commit drag on pointerup, cancel below 3px threshold

Converts drag delta to lng/lat via pixelsToLngLat, writes into
comp.props once, and calls pushHistory so Ctrl+Z reverses a full
drag. Below 3 screen pixels a drag is treated as a stray twitch
and props are not touched."
```

---

### Task 5: pointercancel 与 ESC 键取消

**Files:**
- Modify: `src/modules/builder/editor/map3d/Map3DComponent.vue`

**Interfaces:**
- Consumes: `cancelPan` from Task 4
- Produces:
  - `onPanCancel()` — 直接 cancelPan
  - `onWindowKeyDown(e)` — 只在 panState 非空时处理 ESC
  - `@pointercancel="onPanCancel"` 绑定
  - `window.addEventListener('keydown', ...)` 在 onMounted 挂载，onUnmounted 卸载

- [ ] **Step 1: 加 onPanCancel 和 onWindowKeyDown**

紧跟 `onPanEnd` 后插入：

```js
function onPanCancel() {
  cancelPan()
}

function onWindowKeyDown(e) {
  if (panState && e.key === 'Escape') {
    cancelPan()
  }
}
```

- [ ] **Step 2: 把 @pointercancel 绑到 canvas 上**

canvas 元素上追加：

```html
<canvas
  v-else-if="mode === 'edit' && isLocated && !imageFailed"
  ref="thumbCanvas"
  class="m3d-thumb-canvas"
  @pointerdown="onPanStart"
  @pointermove="onPanMove"
  @pointerup="onPanEnd"
  @pointercancel="onPanCancel"
></canvas>
```

- [ ] **Step 3: 在 onMounted / onUnmounted 里挂 keydown**

找到现有的 `onMounted(async () => {` 块（约第 136 行），在开头追加：

```js
  window.addEventListener('keydown', onWindowKeyDown)
```

找到现有的 `onUnmounted(() => {` 块（约第 147 行），在开头追加：

```js
  window.removeEventListener('keydown', onWindowKeyDown)
  cancelPan()
```

（`cancelPan()` 释放拖动中的 pointer capture、清 panState —— 防止组件卸载时残留状态。）

- [ ] **Step 4: 手工验证：ESC 取消拖动**

Run `npm run dev`, 开始拖动缩略图，中途按 ESC：
- 缩略图应立即归零 transform
- centerLng/Lat 应不变
- 释放鼠标后依然不发生任何事（panState 已被 ESC 清空）

Expected: ESC 中断拖动，props 不变，且松手后无残留

- [ ] **Step 5: 手工验证：pointercancel（Alt+Tab / 窗口失焦）**

拖动缩略图到一半，按 Alt+Tab 切走。回来后：
- 缩略图应已归零 transform，props 不变

（浏览器在窗口失焦时会自动派发 pointercancel。若难以复现，也可以打开 DevTools 手动派发一个 PointerCancelEvent 到 canvas 上 —— 但正常 Alt+Tab 就应触发。）

Expected: 拖动被优雅取消，无残留

- [ ] **Step 6: 提交**

```bash
git add src/modules/builder/editor/map3d/Map3DComponent.vue
git commit -m "feat(map3d): cancel drag on ESC or pointercancel

ESC (while panState is active) and pointercancel (window blur,
Alt+Tab, etc) both zero the transform and clear panState without
touching props. Window keydown listener is bound in onMounted
and released in onUnmounted, along with any lingering pan state."
```

---

### Task 6: 加 cursor: grab / grabbing 视觉提示

**Files:**
- Modify: `src/modules/builder/editor/map3d/Map3DComponent.vue`

**Interfaces:**
- Consumes: 无
- Produces: canvas 静止时显示 `cursor: grab`，按住时 `cursor: grabbing`。用一个 reactive ref `isPanning` 驱动。

- [ ] **Step 1: 加 isPanning ref 并在 pan 生命周期里维护**

在 `let panState = null` 之前加：

```js
const isPanning = ref(false)
```

修改 `onPanStart`，在成功进入 pan 模式后设 true：

```js
function onPanStart(e) {
  if (e.button !== 0) return
  if (!thumbCanvas.value) return
  const p = comp.value.props
  if (p.centerLng == null || p.centerLat == null) return
  panState = {
    startClientX: e.clientX,
    startClientY: e.clientY,
    startLng: p.centerLng,
    startLat: p.centerLat,
    startZoom: p.thumbnailZoom ?? 17,
    pointerId: e.pointerId,
  }
  try { thumbCanvas.value.setPointerCapture(e.pointerId) } catch (_) {}
  isPanning.value = true
  e.stopPropagation()
}
```

修改 `cancelPan`，把 isPanning 也清掉：

```js
function cancelPan() {
  if (thumbCanvas.value) thumbCanvas.value.style.transform = ''
  if (panState && thumbCanvas.value) {
    try { thumbCanvas.value.releasePointerCapture(panState.pointerId) } catch (_) {}
  }
  panState = null
  isPanning.value = false
}
```

- [ ] **Step 2: 在 canvas 上加动态 class**

canvas 元素改为：

```html
<canvas
  v-else-if="mode === 'edit' && isLocated && !imageFailed"
  ref="thumbCanvas"
  class="m3d-thumb-canvas"
  :class="{ 'm3d-thumb-canvas--panning': isPanning }"
  @pointerdown="onPanStart"
  @pointermove="onPanMove"
  @pointerup="onPanEnd"
  @pointercancel="onPanCancel"
></canvas>
```

- [ ] **Step 3: 更新 style**

在 `<style scoped>` 里找到 `.m3d-thumb-canvas`（约第 304 行）：

```css
.m3d-thumb-canvas {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 12px;
}
```

改成：

```css
.m3d-thumb-canvas {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 12px;
  cursor: grab;
  touch-action: none;
}

.m3d-thumb-canvas--panning {
  cursor: grabbing;
}
```

（`touch-action: none` 是为了在触屏设备上阻止浏览器把拖动当作页面滚动手势。）

- [ ] **Step 4: 手工验证：光标反馈**

Run `npm run dev`, 鼠标移到缩略图上应显示 grab（张开的手）光标；按下鼠标应变成 grabbing（握紧的手）；松开或按 ESC 后回到 grab。

Expected: cursor 状态与拖动状态同步

- [ ] **Step 5: 提交**

```bash
git add src/modules/builder/editor/map3d/Map3DComponent.vue
git commit -m "feat(map3d): grab/grabbing cursor + touch-action:none

Signals draggability to users. touch-action:none stops mobile
browsers from hijacking the drag as a page-scroll gesture."
```

---

### Task 7: 全套手工浏览器验证

**Files:** 无（验收）

- [ ] **Step 1: 覆盖 spec 里的完整验证清单**

Run `npm run dev`, 打开 builder 编辑器。加一个 3D 地图组件，搜索一个村庄（如"李家村"）。逐条勾选：

- [ ] 拖动画布，视角跟着手指走
- [ ] 松手后瓦片重画到新中心，属性面板里"缩略图 zoom"值不变
- [ ] 拖动一次后 Ctrl+Z 撤销回原位置
- [ ] 3px 内的抖动不触发历史（连按 Ctrl+Z 应该跳过它）
- [ ] 拖出中国境内（大幅拖动）→ 显示"缩略图暂不可用"占位
- [ ] 拖动中按 ESC → 视角归位，props 不变
- [ ] 拖动中 Alt+Tab 切走再回来 → 视角归位（pointercancel）
- [ ] 属性面板里"缩略图 zoom" 滑到 15 或 18，再拖动 → 换算随 zoom 变化（更粗/更细，同样的手指位移下 zoom=18 移动的经纬度是 zoom=17 的一半）
- [ ] 编辑器全局 zoom 切到 50%、150% → 拖动手感一致（手指移动的屏幕距离在编辑器全局缩放下依然对应相同的地理位移）

- [ ] **Step 2: 跑一遍完整测试和 build**

Run:
```
npx vitest run
npm run build
```

Expected: 之前已通过的 builder 相关测试仍然通过；build 无新增错误。

（`src/__tests__/mine-stagePlan-web.test.js` 里 5 条 URL 解析失败与本改动无关，属于既有问题，忽略。）

- [ ] **Step 3: 无需额外提交**

Task 7 只做验收，本身没有代码改动。若发现遗漏在前面任务里，回到对应任务补一次提交。

---

## Self-Review

**Spec coverage:**

| Spec 要求 | 覆盖任务 |
| --- | --- |
| 拖动 = 平移视角、方向语义 | Task 1 (pixelsToLngLat) + Task 4 (提交写入 props) |
| 拖动中只 CSS 位移不发请求 | Task 3 (style.transform)；Task 4 (只在 pointerup 才改 props 触发 renderThumbnail) |
| < 3px 抖动忽略 | Task 4 Step 2 (`distSq < 9`) |
| ESC / pointercancel 归零不改 props | Task 5 |
| Ctrl+Z 记一条 | Task 4 Step 2 (`pushHistory()`) |
| villageName 保留不变 | 默认满足（代码没碰它） |
| 拖出天地图范围 → imageFailed 占位 | 默认满足（renderThumbnail 现有逻辑） |
| stage 全局 zoom ≠ 1 | Task 3 Step 1 (`/ stageZoom`), Task 4 Step 2 (同) |
| pointerdown 只处理左键 | Task 2 Step 2 (`if (e.button !== 0) return`) |
| pointerdown stopPropagation | Task 2 Step 2 |
| setPointerCapture 让拖出组件也收 up | Task 2 Step 2 |
| 组件卸载清理 | Task 5 Step 3 (onUnmounted 里 cancelPan) |
| 6 项纯函数单测 | Task 1 |
| 手工验证清单 9 项 | Task 7 Step 1 |
| cursor:grab/grabbing + touch-action:none | Task 6（spec 未明确要求但符合可用性目标；作为小的可用性增益纳入） |

**Placeholder scan:** 无 TBD/TODO/"add appropriate ..."；每一步都有具体代码或命令；类型和 import 路径一致（`../stageEditor.js` 到 `../modules/builder/editor/stageEditor.js`；`../modules/builder/editor/map3d/panMath.js` 从 tests 里）。

**Type consistency:** `panState` 字段（startClientX/startClientY/startLng/startLat/startZoom/pointerId）在 Task 2/3/4/5 中一致使用。`pixelsToLngLat` 返回 `{ dLng, dLat }` 在 Task 1（定义）和 Task 4（消费）之间一致。`cancelPan` 在 Task 4（定义）和 Task 5（消费）之间一致。`isPanning`（Task 6 才引入）不影响前置任务的语义。

**Rationale trail：** 只此一处例外——Task 1 用独立文件 panMath.js 而非 SFC 内导出，因为 `<script setup>` 无法向外 export 命名符号，测试无法直接 import。
