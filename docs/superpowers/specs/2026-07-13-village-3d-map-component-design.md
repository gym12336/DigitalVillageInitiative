# 村庄 3D 地形图组件 — 设计文档

**日期：** 2026-07-13
**范围：** 低代码搭建器新增可视化组件
**引擎：** CesiumJS + 天地图影像

## 1. 目标与范围

在现有低代码搭建器体系中新增一款「村庄 3D 地形图」组件，与柱状图、时间轴等组件平级：

- 支持从组件库拖拽至画布，自由调整尺寸与位置
- 属性面板输入村庄名称 → 天地图搜索 → 用户从候选中选定 → 组件自动定位到目标村庄，呈现 3D 地形隆起与卫星影像
- 支持鼠标缩放、旋转、倾斜视角
- 对现有低代码组件规范、属性面板、生命周期管理体系零侵入

**明确不做的事（YAGNI）：**

- 不引入行政边界矢量数据（用范围圆代替）
- 不做本地地形切片方案（在线 Cesium Ion 全球地形已足够；私有化部署时再迁移）
- 不支持嵌入「多组件框」`layout-box` 或「流动组件框」`flow-box`；仅作为顶层组件
- 不为村庄坐标独立建库（属性直接存 `component.props`）
- 编辑态不加载 Cesium（用天地图静态图缩略图代替）

## 2. 模块拆分与文件结构

### 新增文件

| 文件 | 职责 | 依赖 |
|---|---|---|
| `src/modules/builder/editor/map3d/Map3DComponent.vue` | Vue 组件。编辑态渲染静态图 `<img>`，预览态挂载 Cesium 容器并调用 `cesiumScene.js`。管理生命周期。 | `cesiumScene.js`, `tianditu.js` |
| `src/modules/builder/editor/map3d/cesiumScene.js` | 纯逻辑模块（无 Vue 依赖）。导出 `createScene(container, opts)` → 返回 `{ flyTo, setTerrainExaggeration, setRangeCircle, setZoomLimits, pauseRendering, resumeRendering, resize, destroy }`。所有 Cesium API 调用封装在此。 | `cesium`（动态 import） |
| `src/modules/builder/editor/map3d/tianditu.js` | 天地图 API 封装。导出：`searchVillages(name)`、`buildStaticImageUrl(lng, lat, zoom, w, h)`、`buildImageryProvider(tk)`、`buildLabelProvider(tk)`。 | `tiandituConfig` |
| `src/modules/builder/editor/map3d/tiandituConfig.js` | 模块级密钥缓存。启动时从 `/api/config` 拉取一次并缓存，`getKey()` 返回当前密钥。 | 无 |
| `src/modules/builder/editor/map3d/VillageSearchField.vue` | 村庄搜索输入框 + 候选列表小组件，服务于属性面板。 | `tianditu.js` |
| `server/routes/config.js` | 提供 `GET /api/config`，返回 `{ tiandituKey: process.env.TIANDITU_KEY || '' }`。 | Express |

### 修改文件

| 文件 | 修改内容 |
|---|---|
| `src/modules/builder/editor/componentFactory.js` | 新增 `createMap3DComponent(x, y)`；`createComponent` switch 增加 `case 'map-3d'` 分支。 |
| `src/modules/builder/editor/ComponentLibrary.vue` | `COMPONENT_CATEGORIES` 里 `geo` 分类下新增拖拽条目 `{ label: '村庄 3D 地形图', icon: '🏔️', type: 'map-3d' }`。 |
| `src/modules/builder/editor/PropertyPanel.vue` | 新增 `v-if="comp.type === 'map-3d'"` 属性表单区块（村庄定位 / 地形显示 / 相机视角）。 |
| `src/modules/builder/editor/EditorCanvas.vue` | `renderComponentMarkup` 增加 `case 'map-3d'`：输出带 `data-map-3d-id="${c.id}"` 的占位 `<div>`；模板层用 `<Teleport>` 挂载 `Map3DComponent` 到对应占位。 |
| `src/modules/builder/editor/buildPreview.js` | `renderComponentHtml` 增加 `case 'map-3d'`：预览态生成带动态加载 Cesium + 初始化脚本的 HTML 片段。 |
| `src/main.js` | 应用启动时 `await fetchTiandituConfig()` 初始化密钥缓存。 |
| `server/index.js` | 挂载 `/api/config` 路由。 |
| `.env.example` | 增加 `TIANDITU_KEY=` 占位。 |
| `.gitignore` | 确认 `.env` 已忽略（现状已忽略，无需改动）。 |
| `package.json` | 新增依赖 `cesium`（约 3MB）。 |
| `vite.config.js` | 配置 Cesium 静态资源复制（`Widgets/`、`Assets/`、`Workers/`）到 `public/cesium/`。 |

### 关键设计点

`cesiumScene.js` 不依赖 Vue，可脱离画布单独引用。`Map3DComponent.vue` 只负责 Vue 生命周期钩子与 UI 状态，业务逻辑委托给 `cesiumScene.js`。

## 3. 组件数据模型

存入 `component.props`（随现有 `saveToDB` 流程持久化，无需新增数据库表）：

```js
{
  type: 'map-3d',
  x, y,
  width: 640,               // 默认宽
  height: 420,              // 默认高
  props: {
    // 定位
    villageName: '',        // 用户选中的村名（展示）
    centerLng: null,        // 经度，null 表示未定位
    centerLat: null,        // 纬度，null 表示未定位
    region: '',             // 上级行政区（省/市/区）

    // 视觉
    terrainExaggeration: 1.5, // 地形夸张系数 1.0–3.0
    showRangeCircle: true,    // 是否显示范围圆
    rangeRadius: 500,         // 范围圆半径（米），100–5000

    // 相机
    defaultHeight: 1200,      // 相机默认高度（米）
    defaultPitch: 60,         // 相机默认倾斜角（度）
    minZoomHeight: 500,       // 最小缩放高度（米）
    maxZoomHeight: 5000,      // 最大缩放高度（米）
  }
}
```

## 4. 属性面板 UI

沿用现有 `.pp-section / .pp-field` 样式；分三个区块。

### 区块 1 — 村庄定位（`VillageSearchField`）

- 搜索框（村名输入）+ 🔍 搜索按钮
- 搜索输入 300ms 防抖，回车触发
- 候选下拉列表：显示 `村名（上级行政区）` 格式，用户点选后写入 `villageName / centerLng / centerLat / region`
- 已定位状态：显示 `✅ 已定位到：李家村（云南省 · 普洱市 · 澜沧县）` + "重新搜索"链接
- 搜索失败：Toast 提示 `未找到该村庄，请检查名称` 或 `搜索失败，请重试`

### 区块 2 — 地形显示

- 地形夸张：滑块 1.0–3.0，步长 0.1
- 范围圆开关：复选框
- 范围圆半径：数字输入 + 滑块 100–5000 米（开关关闭时禁用）

### 区块 3 — 相机视角

- 默认高度：数字输入 500–5000 米
- 默认倾斜角：滑块 30–85 度
- 缩放范围：最小高度 / 最大高度两个数字输入

## 5. 数据流

### 天地图密钥加载（应用启动一次）

```
main.js → await fetchTiandituConfig()
      → GET /api/config → { tiandituKey: 'abc123' }
      → 写入 tiandituConfig.js 模块级缓存
      → 所有需要 tk 的地方通过 getKey() 读取
```

后端 `/api/config` 从 `process.env.TIANDITU_KEY` 读取；`.env` 未配置时返回空字符串，前端 Cesium 初始化时检测到空 key 进入错误占位状态。

### 村庄搜索流程

```
用户输入村名 → 点击 🔍 或回车
  ↓
tianditu.searchVillages(name)  // GET https://api.tianditu.gov.cn/v2/search?...&tk=xxx
  ↓
候选数组 [{ name, region, lng, lat }, ...]
  ↓
候选下拉列表 → 用户点选
  ↓
写入 comp.props（villageName / centerLng / centerLat / region）
  ↓
若预览态已挂载 Cesium：cesiumScene.flyTo(lng, lat)
若编辑态：仅刷新静态图缩略图
```

搜索失败或超时（5 秒）：Toast 提示，不修改 `comp.props`。

### 属性变化响应

`Map3DComponent.vue` 通过 `watch` 监听 props 变化，转发给 `cesiumScene`：

| 属性变化 | 触发行为 |
|---|---|
| `centerLng / centerLat` | 编辑态：换静态图 URL；预览态：`flyTo(lng, lat)` |
| `terrainExaggeration` | 预览态：`setTerrainExaggeration(val)` |
| `showRangeCircle` / `rangeRadius` | 预览态：`setRangeCircle(show, radius)` |
| `defaultHeight` / `defaultPitch` | 保存到内部状态，下次 `flyTo` 时使用 |
| `minZoomHeight` / `maxZoomHeight` | 预览态：`setZoomLimits(min, max)` |

### 编辑态生命周期

```
组件拖入画布
  ↓
componentFactory 创建 { type: 'map-3d', props: {...默认值} }
  ↓
EditorCanvas.stageHtml 生成 <div data-map-3d-id="123">
  ↓
Vue 模板层用 v-for + <Teleport to="[data-map-3d-id='123']"> 挂载 Map3DComponent
  ↓
Map3DComponent onMounted：
  - 若 centerLng/Lat 为 null → 显示灰色占位框「请在属性面板输入村庄名」
  - 若已定位 → tianditu.buildStaticImageUrl → <img> 渲染
  ↓
属性变化 → 静态图 URL 更新
  ↓
组件删除 → onUnmounted → Vue 自动清理（编辑态无 Cesium 副作用）
```

### 预览态生命周期

预览态是通过 `buildPreviewHtml` 生成的独立 HTML 页面，用 `window.open` 打开。

```
buildPreview.js 为每个 map-3d 组件输出：
  <div id="map3d-{id}" style="..."></div>

预览 HTML 头部注入一次公共脚本：
  <script type="module">
    import { createScene } from '<CESIUM_SCENE_URL>'
    window.__createMap3DScene = createScene
  </script>

每个 map-3d 组件在页面尾部输出初始化调用：
  <script type="module">
    window.__createMap3DScene(document.getElementById('map3d-{id}'), { lng, lat, ... })
  </script>
  ↓
新窗口加载 HTML → 动态 import Cesium（按需加载 3MB） → 初始化每个 map-3d 场景
  ↓
用户关闭预览窗口 → 页面销毁 → WebGL 上下文自动释放
```

**`<CESIUM_SCENE_URL>` 的取值：**

- **开发环境（`vite dev`）**：`buildPreviewHtml` 用 `import.meta.url` 计算得到 `cesiumScene.js` 在 dev server 上的完整 URL，注入到 HTML。
- **生产环境（`vite build`）**：`cesiumScene.js` 作为独立入口在 `vite.config.js` 里配置（`rollupOptions.input.cesiumScene`），产物哈希 URL 在构建后写入一个 `dist/manifest.json`，`buildPreviewHtml` 运行时读取并注入。

编辑器主 bundle 不打包 Cesium；`cesiumScene.js` 是独立 chunk，仅预览页按需加载。

## 6. Cesium 场景初始化与优化

### `cesiumScene.js` 接口

```js
export async function createScene(container, opts) {
  // opts: { lng, lat, terrainExaggeration, showRangeCircle, rangeRadius,
  //         defaultHeight, defaultPitch, minZoomHeight, maxZoomHeight,
  //         tiandituKey, onError }

  return {
    flyTo(lng, lat),                    // 平滑飞行到新村庄（2.5 秒）
    setTerrainExaggeration(val),
    setRangeCircle(show, radius),
    setZoomLimits(min, max),
    pauseRendering(),
    resumeRendering(),
    resize(),
    destroy(),
  }
}
```

### 初始化步骤

1. **不设置** `Cesium.Ion.defaultAccessToken`（避免默认拉取 Cesium 服务）
2. **创建 Viewer 并关闭所有 UI 控件**：`animation: false, timeline: false, baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false, fullscreenButton: false, infoBox: false, selectionIndicator: false, imageryProvider: false`
3. **手动添加天地图图层**：影像层（`img_w`）+ 注记层（`cia_w`）叠加
4. **加载全球地形**：`createWorldTerrainAsync({ requestVertexNormals: true })`；失败时降级为 `EllipsoidTerrainProvider`（无地形，平面）
5. **关闭全局特效**：`scene.skyBox.show = false`、`scene.skyAtmosphere.show = false`、`scene.sun.show = false`、`scene.moon.show = false`、`scene.fog.enabled = false`、`globe.showGroundAtmosphere = false`、`globe.enableLighting = false`
6. **村级参数**：
   - `scene.verticalExaggeration = opts.terrainExaggeration`（Cesium ≥ 1.107 使用 `scene.verticalExaggeration`；旧版用 `globe.terrainExaggeration`。本项目依赖 `cesium@^1.118`，采用前者。）
   - `scene.screenSpaceCameraController.minimumZoomDistance = opts.minZoomHeight`
   - `scene.screenSpaceCameraController.maximumZoomDistance = opts.maxZoomHeight`
   - `globe.depthTestAgainstTerrain = true`（标注贴地）
7. **按需渲染**：`scene.requestRenderMode = true`；`scene.maximumRenderTimeChange = Infinity`
8. **目标帧率**：`viewer.targetFrameRate = 30`
9. **飞行到村庄**：`camera.flyTo({ destination: fromDegrees(lng, lat, defaultHeight), orientation: { pitch, heading: 0 }, duration: 2.5 })`
10. **标注实体**：中心点 `PointGraphics`、村名 `LabelGraphics`（带描边）、范围圆 `EllipseGraphics`（若启用），全部 `heightReference: CLAMP_TO_GROUND`

### 更新行为

- `flyTo(lng, lat)`：复用 `defaultHeight / defaultPitch`，2.5 秒平滑飞行；结束后更新标注实体位置（属性更新，不销毁重建）
- `setTerrainExaggeration(val)`：单行 `scene.verticalExaggeration = val`，`requestRenderMode` 自动触发一次重绘
- `setRangeCircle(show, radius)`：`show = false` 时 `entity.show = false`；`show = true` 时更新 `ellipse.semiMinorAxis / semiMajorAxis`
- `pauseRendering / resumeRendering`：`viewer.useDefaultRenderLoop = false / true`；`IntersectionObserver` 检测视口可见性，不可见时暂停
- `resize()`：`ResizeObserver` 监听容器尺寸，节流 100ms 后调用 `viewer.resize()`

### 销毁流程（严格顺序）

1. `viewer.camera.cancelFlight()`
2. `viewer.entities.removeAll()`
3. 断开 `ResizeObserver / IntersectionObserver`
4. `viewer.destroy()`
5. `container.innerHTML = ''`
6. 模块内引用置 `null`

## 7. 错误处理

| 场景 | 触发点 | 处理策略 | 用户反馈 |
|---|---|---|---|
| 天地图密钥未配置 | 应用启动 `/api/config` 返回空 key | Cesium 初始化时检测到空 key，触发 `onError({ type: 'no-key' })` | 组件显示错误占位框「天地图密钥未配置，请联系管理员」 |
| 天地图密钥无效 | 影像图层加载 401/403 | 监听图层错误事件，触发 `onError({ type: 'bad-key' })` | 错误占位框 + "重试"按钮 |
| WebGL 不支持 | `new Viewer` 抛错 | `try/catch` 捕获 | 错误占位框「浏览器不支持 3D 渲染」 |
| 全球地形加载失败 | `createWorldTerrainAsync` reject | 降级为 `EllipsoidTerrainProvider` 继续渲染 | 控制台警告，画面继续可用 |
| 村庄搜索无结果 | 天地图搜索返回空数组 | 属性面板不改动 | Toast「未找到该村庄，请检查名称」 |
| 村庄搜索请求失败 | 网络错误 / 超时（5 秒） | 属性面板不改动 | Toast「搜索失败，请重试」 |
| 静态图缩略图拉取失败 | 编辑态 `<img>` `onerror` | 显示灰色占位 + 村名文字 | 灰色框「缩略图暂不可用 · 李家村」 |
| 组件卸载中场景仍在飞行 | 用户快速删除组件 | `destroy()` 内先 `viewer.camera.cancelFlight()` | 无（内部处理） |
| 单页 map-3d 实例超限（>4） | 预览态第 5 个组件挂载 | 显示占位提示 | 占位框「实例超限，单页最多 4 个 3D 地图」 |

## 8. 性能优化清单

### 必做（Cesium 全局）

- 关闭 skyBox / skyAtmosphere / sun / moon / fog / groundAtmosphere / lighting
- 关闭 baseLayerPicker / geocoder / homeButton / sceneModePicker / navigationHelpButton / fullscreenButton / animation / timeline / infoBox / selectionIndicator
- 关闭地下渲染（`globe.showSkirts = false`, `underground = false`）
- 限制影像图层最大层级（`maximumLevel: 18`，村级足够）
- 限制 `minimumZoomDistance / maximumZoomDistance`

### 核心渲染

- `scene.requestRenderMode = true`（静态时零重绘，GPU 空闲）
- `scene.maximumRenderTimeChange = Infinity`
- `viewer.targetFrameRate = 30`
- 标注实体更新属性而非销毁重建

### 编辑态专属

- 编辑态**完全不加载** Cesium，仅静态图 PNG
- 静态图 URL 由 `centerLng/centerLat + width/height` 拼装，浏览器自动缓存

### 预览态专属

- `IntersectionObserver` 检测视口可见性，不可见时 `useDefaultRenderLoop = false`
- 单个预览 HTML 页面最多 4 个 map-3d 实例（按 `buildPreviewHtml` 中 map-3d 组件出现的顺序计数，从第 5 个开始的组件在其占位 `<div>` 中显示"实例超限"提示，不初始化 Cesium）。避免 WebGL 上下文触顶（浏览器通常限制 8–16）
- `ResizeObserver` 触发 `viewer.resize()` 用 100ms 节流

## 9. 安全考量

- **密钥不入 git**：`.env` 已在 `.gitignore`；`.env.example` 只放占位；`TIANDITU_KEY` 只存 `.env`
- **密钥防盗用**：在天地图后台绑定域名白名单（部署域名 + `localhost` 开发用）
- **XSS 防护**：属性面板输入的村庄名保存到 `component.props`。编辑态用 Vue 模板绑定（自动转义）；预览态生成 HTML 时用 `buildPreview.js` 已有的 `esc()` 函数处理
- **请求最小化**：搜索请求加 300ms 防抖

## 10. 测试策略与验收标准

### 单元测试（`vitest` + `jsdom`）

| 模块 | 测试内容 |
|---|---|
| `tianditu.js` | `searchVillages` 请求 URL 构造正确；空结果、超时、网络错误分支；`buildStaticImageUrl` 参数拼装 |
| `componentFactory.createMap3DComponent` | 返回结构包含所有 props 字段，默认值符合 spec |
| `PropertyPanel` map-3d 区块 | 属性双向绑定；范围圆开关关闭时禁用滑块；搜索选中回填 4 个字段 |
| `VillageSearchField` | 防抖 300ms；候选点选写入回调；无结果分支 |

`cesiumScene.js` 涉及 WebGL / Canvas，jsdom 无法有效模拟，靠手动验证覆盖。

### 手动验证清单

- [ ] 从组件库拖入「村庄 3D 地形图」→ 画布出现灰色占位框
- [ ] 属性面板搜索村名 → 弹出候选列表 → 选择后 4 个字段全部写入
- [ ] 编辑态：切换村庄 → 静态图 URL 更新
- [ ] 编辑态：拖动/调整尺寸 → 无卡顿（帧率与拖普通图片组件相当）
- [ ] 点击预览按钮 → 新窗口打开，Cesium 加载，飞行到目标村庄，看到地形隆起
- [ ] 预览态：鼠标滚轮缩放 → 视角在 500m–5km 内变化，边界处停止
- [ ] 预览态：鼠标右键拖 → 视角旋转/倾斜
- [ ] 属性面板调地形夸张滑块 → 保存并再次预览 → 隆起程度变化
- [ ] 关闭范围圆 → 预览态圆消失；调整半径 → 圆变大变小
- [ ] 一个画布放 3 个 map-3d 组件 → 预览时全部正常渲染
- [ ] 一个画布放 5 个 map-3d 组件 → 第 5 个显示「实例超限」占位
- [ ] 关闭预览窗口 → DevTools 检查主编辑器无内存增长
- [ ] 密钥错误场景（临时改坏 `.env`）→ 组件显示错误占位框 + 重试按钮
- [ ] 断网后搜索 → Toast 提示「搜索失败」

### 集成验收

- [ ] 保存到数据库（`saveToDB`）后重新加载 → 所有属性完整还原
- [ ] `undo / redo` 对 map-3d 属性变化有效
- [ ] 删除组件 → 无残留 DOM / 无控制台错误
- [ ] `layout-box` 槽位类型下拉不出现 map-3d 选项
- [ ] `flow-box` 同上

### 一句话验收

**用户能从组件库拖入组件、通过属性面板搜索并定位到任意村庄，编辑器保持流畅，预览时看到该村庄的 3D 地形隆起、可自由缩放旋转，且组件属性能随画布正确保存与加载。**
