# Map3D 编辑态缩略图 拖动平移视角

**日期**：2026-07-13
**作者**：alice
**范围**：`src/modules/builder/editor/map3d/Map3DComponent.vue`

## 背景

编辑态里 Map3D 组件展示的是一张由天地图 WMTS 瓦片拼贴出来的静态缩略图。当前调整视角中心的唯一途径是重新在属性面板里搜索村庄。用户希望能直接在缩略图上按住鼠标拖动来微调地理中心。

## 目标

- 编辑态缩略图内部拖动 → 平移地理中心（`comp.props.centerLng` / `centerLat`）
- 保持"抓住地图拖"的语义（Google Maps 风格）
- 不影响预览态 Cesium 场景，不影响组件本身在画布上的位置

## 范围

**本 spec 只修改**：`Map3DComponent.vue`

**不修改**：
- `tianditu.js`（换算函数就近内联，不新增导出）
- `cesiumScene.js`
- `componentFactory.js`
- `PropertyPanel.vue`
- `EditorCanvas.vue`

## 交互决定（已在 brainstorming 中确认）

| 议题 | 决定 |
| --- | --- |
| 拖动语义 | 地图 canvas 内部拖动永远平移视角。不影响外部组件拖动。 |
| 方向 | 抓住地图拖（手指往右 → 地图往右 → 中心 lng 往左） |
| 拖动中的图像 | 只 CSS 位移已有瓦片，不发新 HTTP 请求 |
| 拖动结束 | 计算新 `centerLng/Lat` → 写入 props → 移除 transform → watcher 触发 `renderThumbnail` 用新中心重画 |
| Undo 历史 | mouseup 时 `pushHistory()` 一次；<3px 位移不记 |
| villageName | 保留不变 |
| 平移出天地图范围 | 依赖现有 `imageFailed` 逻辑显示"缩略图暂不可用"占位 |

## 架构

改动集中在一个组件内，可以按 3 个职责拆分：

1. **拖动状态机**（`panState` 局部变量或 ref）：记录起点鼠标坐标 + 起点 `centerLng/Lat` + 起点 zoom
2. **实时视觉反馈**：直接在 `thumbCanvas.value.style.transform` 上写 `translate(dx, dy)`，不走 Vue reactive
3. **像素 → 经纬度换算**：内联在 `Map3DComponent.vue` 里的纯函数 `pixelsToLngLat(dx, dy, centerLat, zoom)`

外部世界看不到变化：`comp.props.centerLng/Lat` 依然是唯一的对外状态；watch 依然是唯一的重绘触发点。拖动只是"修改这两个 prop 的第三种方式"（另外两种是搜索、属性面板手动编辑）。

## 数据流

### pointerdown

- 检查 `e.button === 0`（左键）
- 快照当前状态：
  ```js
  panState = {
    startClientX: e.clientX,
    startClientY: e.clientY,
    startLng: comp.value.props.centerLng,
    startLat: comp.value.props.centerLat,
    startZoom: comp.value.props.thumbnailZoom ?? 17,
    pointerId: e.pointerId,
  }
  ```
- `canvas.setPointerCapture(e.pointerId)` — 即使指针拖出组件也能收到 up
- `e.stopPropagation()` — 不让事件冒到 stage

### pointermove

- 只有 `panState` 非空才处理
- `dx = e.clientX - startClientX`；`dy = e.clientY - startClientY`
- 除以 `state.zoom`（stage 全局缩放）：`dxCanvas = dx / stageZoom`，`dyCanvas = dy / stageZoom`
- `` canvas.style.transform = `translate(${dxCanvas}px, ${dyCanvas}px)` ``
- 不改任何 Vue reactive 状态

### pointerup

- 若 `sqrt(dx² + dy²) < 3`（屏幕像素）→ 归零 transform、清空 panState、**不写 props、不 pushHistory**
- 否则：
  1. 用 `pixelsToLngLat(dxCanvas, dyCanvas, startLat, startZoom)` 换算
  2. 一次性写入 `comp.props.centerLng = startLng + dLng`、`centerLat = startLat + dLat`
  3. `canvas.style.transform = ''` 归零
  4. 现有 watcher 触发 `renderThumbnail()` 用新中心重画
  5. `pushHistory()`（从 stageEditor.js 导入）
  6. 释放 pointer capture、清空 panState

### pointercancel（比如窗口失焦、Alt+Tab）

- 等同于 ESC：transform 归零、清空 panState、**不改 props**

### keydown Escape（拖动中按 ESC）

- 归零 transform、清空 panState、不改 props、不 pushHistory
- 只在 pointer capture 期间才监听

## 换算公式

Web Mercator 在纬度 `lat` 处每像素多少米：

```
metersPerPixel = 156543.03392 * cos(lat * π / 180) / 2^zoom
```

一个像素代表的经度差（同纬度下 1° 经度对应的地面距离约 = `111320 * cos(lat)` 米）：

```
metersPerDegLng = 111320 * cos(lat * π / 180)
metersPerDegLat = 110540    // 常量（地球稍扁）
```

因此 `pixelsToLngLat`：

```js
function pixelsToLngLat(dx, dy, centerLat, zoom) {
  const latRad = centerLat * Math.PI / 180
  const mpp = 156543.03392 * Math.cos(latRad) / Math.pow(2, zoom)
  const dxMeters = dx * mpp
  const dyMeters = dy * mpp
  // 抓住地图拖：手指向右（dx > 0） → 中心 lng 变小
  const dLng = -dxMeters / (111320 * Math.cos(latRad))
  // 抓住地图拖：手指向下（dy > 0） → 中心 lat 变大（画布下方多出来的是"北"边内容）
  // 屏幕 y 朝下，纬度北为正，两轴反向 —— 所以负号 * 负号
  const dLat = dyMeters / 110540
  return { dLng, dLat }
}
```

方向的第一性验证（"抓住地图拖"）：
- 手指 dx>0（往右拖）→ dLng<0 → 中心 lng 减小 → 原本在中心的地物出现在右侧 → 视觉上"地图跟着手指往右滑" ✓
- 手指 dy>0（往下拖）→ dLat>0 → 中心 lat 增大（往北）→ 原本在中心的地物出现在下方 → 视觉上"地图跟着手指往下滑" ✓

## 边界与错误处理

| 情况 | 行为 |
| --- | --- |
| < 3px 位移 | 视作意外抖动，不做任何事 |
| ESC / pointercancel | 归零 transform，不改 props |
| 拖出天地图范围 | 复用现有 `imageFailed → 占位` 分支 |
| stage 全局 zoom ≠ 1 | dx/dy 除以 `state.zoom` 后再换算 |
| 组件卸载 | `onUnmounted` 释放 pointer capture、清空 panState |
| 属性面板同时修改 lng/lat | 换算基于起点快照，覆盖式写入；用户明显在拖，覆盖符合直觉 |
| 右键 / 中键 | 不进入 pan 模式（`e.button !== 0`） |

## 测试

**加入 `src/__tests__/builder-tianditu.test.js`（纯函数）**：

- 赤道 zoom=17，dx=+100：`mpp = 156543 / 131072 ≈ 1.194 m/px` → `dLng ≈ -100 × 1.194 / 111320 ≈ -0.001073°`（预期精度 ±1e-6）
- 纬度 30° zoom=17，dx=+100：因 cos(30°)≈0.866，`|dLng|` 应比赤道情况大约 1/0.866 ≈ 1.155 倍
- dx=0, dy=0 → dLng=0, dLat=0
- 方向：dx=+100 → dLng < 0（抓住地图拖）
- 方向：dy=+100 → dLat > 0（画布下方多出来的是北边内容）
- zoom=18 相比 zoom=17，同 dx 下 `|dLng|` 应减半

**手工浏览器验证清单**：

1. 拖动画布，视角跟着手指走
2. 松手后瓦片重画到新中心，"缩略图 zoom" 属性面板值不变
3. 拖动一次后 Ctrl+Z 撤销回原位置
4. 3px 内的抖动不触发历史（连按 Ctrl+Z 应该跳过它）
5. 拖出中国境内 → 显示"缩略图暂不可用"占位
6. 拖动中按 ESC → 视角归位
7. 拖动中 Alt+Tab 切走再回来 → 视角归位（pointercancel）
8. 属性面板里"缩略图 zoom" 滑到 15 或 18，再拖动 → 换算随 zoom 变化（更粗/更细）
9. 编辑器全局 zoom 切到 50%、150% → 拖动手感一致

**不测**：Vue 组件事件流（pointerdown/move/up 派发到 jsdom 太脆），CSS transform 视觉（人眼验证一次即可），`pushHistory` 被调用（stageEditor 已有测试）。

## 依赖

从 `stageEditor.js` 导入 `pushHistory`（现有导出，无需新增）。

## 非目标

- 不做右键菜单里的"重置到搜索到的官方位置"
- 不做双击缩放
- 不做滚轮缩放（zoom 由属性面板滑块控制）
- 不做键盘方向键平移
- 不做惯性/动量滚动
