# 村庄 3D 地形图组件 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在低代码搭建器中新增「村庄 3D 地形图」组件，支持天地图搜索定位村庄、编辑态静态图预览、预览态 Cesium 3D 渲染。

**Architecture:** 纯逻辑模块 `cesiumScene.js`（无 Vue 依赖）封装所有 Cesium API；`Map3DComponent.vue` 仅负责 Vue 生命周期与 UI 状态桥接；编辑态用天地图静态图，预览态动态加载 Cesium。密钥通过 `/api/config` 启动时拉取一次并缓存。

**Tech Stack:** Vue 3 + Vite 6 + CesiumJS ^1.118 + 天地图 API v2 + Express 5 + vitest

## Global Constraints

- Cesium 版本 `^1.118`，使用 `scene.verticalExaggeration`（非旧版 `globe.terrainExaggeration`）
- 编辑态不加载 Cesium（用天地图静态图缩略图代替）
- 预览态单页最多 4 个 map-3d 实例
- 不引入行政边界矢量数据（用范围圆代替）
- map-3d 不支持嵌入 `layout-box` 或 `flow-box`；仅作为顶层组件
- 密钥不入 git：`.env` 已在 `.gitignore`；`.env.example` 只放占位
- XSS 防护：编辑态用 Vue 模板绑定（自动转义）；预览态用 `esc()` 函数

---

### Task 1: 后端配置接口与 .env 模板

**Files:**
- Create: `server/routes/config.js`
- Modify: `server/app.js:30-37`（挂载路由）
- Modify: `.env.example:26`（追加两个占位）

**Interfaces:**
- Produces: `GET /api/config` → `{ tiandituKey: string, ionToken: string }`，从 `process.env.TIANDITU_KEY` / `process.env.CESIUM_ION_TOKEN` 读取，未配置返回空字符串
- Produces: `makeConfigRouter()` 工厂函数，签名与现有路由一致 `(db?, secret?) => router`

- [ ] **Step 1: 创建 `server/routes/config.js`**

```js
// server/routes/config.js
import { Router } from 'express'

export function makeConfigRouter() {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json({
      tiandituKey: process.env.TIANDITU_KEY || '',
      ionToken: process.env.CESIUM_ION_TOKEN || '',
    })
  })

  return router
}
```

- [ ] **Step 2: 在 `server/app.js` 挂载路由**

找到 `app.use('/api/voice', makeVoiceRouter(db))` 行（第 37 行附近），在其后添加：

```js
import { makeConfigRouter } from './routes/config.js'
// ... 在 createApp 函数体内，app.use('/api/voice', ...) 之后：
app.use('/api/config', makeConfigRouter())
```

- [ ] **Step 3: 更新 `.env.example`**

在文件末尾追加以下两行（第 26 行 `TENCENT_MAP_KEY=` 之后）：

```
# ---- 3D 地图组件 ----
# 天地图 API Key（https://console.tianditu.gov.cn 申请）
TIANDITU_KEY=
# Cesium Ion Token（https://ion.cesium.com 申请）
CESIUM_ION_TOKEN=
```

- [ ] **Step 4: 验证端点**

```bash
curl http://localhost:3001/api/config
```
预期返回：`{"tiandituKey":"","ionToken":""}`（`.env` 未配置时为空字符串）

- [ ] **Step 5: Commit**

```bash
git add server/routes/config.js server/app.js .env.example
git commit -m "feat: add GET /api/config endpoint for tiandituKey and ionToken"
```

---

### Task 2: 前端密钥缓存模块与应用启动初始化

**Files:**
- Create: `src/modules/builder/editor/map3d/mapConfig.js`
- Modify: `src/main.js:1-6`

**Interfaces:**
- Consumes: `GET /api/config` → `{ tiandituKey, ionToken }`（Task 1）
- Produces: `fetchMapConfig()` — 启动时调用一次，写入模块级缓存
- Produces: `getTiandituKey()` → `string`
- Produces: `getIonToken()` → `string`

- [ ] **Step 1: 创建 `src/modules/builder/editor/map3d/mapConfig.js`**

```js
// src/modules/builder/editor/map3d/mapConfig.js

let _tiandituKey = ''
let _ionToken = ''
let _fetched = false

export async function fetchMapConfig() {
  if (_fetched) return
  try {
    const res = await fetch('/api/config')
    if (res.ok) {
      const data = await res.json()
      _tiandituKey = data.tiandituKey || ''
      _ionToken = data.ionToken || ''
    }
  } catch (e) {
    console.warn('[map3d] 获取密钥配置失败，地图功能将受限:', e)
  }
  _fetched = true
}

export function getTiandituKey() {
  return _tiandituKey
}

export function getIonToken() {
  return _ionToken
}
```

- [ ] **Step 2: 修改 `src/main.js` 启动时拉取配置**

```js
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { fetchMapConfig } from './modules/builder/editor/map3d/mapConfig.js'

async function boot() {
  await fetchMapConfig()
  createApp(App).use(router).mount('#app')
}

boot()
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/builder/editor/map3d/mapConfig.js src/main.js
git commit -m "feat: add mapConfig module with app-startup key fetch"
```

---

### Task 3: 天地图 API 封装模块

**Files:**
- Create: `src/modules/builder/editor/map3d/tianditu.js`
- Test: `src/__tests__/builder-tianditu.test.js`

**Interfaces:**
- Consumes: `getTiandituKey()` from `mapConfig.js`（Task 2）
- Produces: `searchVillages({ name, provinceCode?, cityKeyword? })` → `Promise<Array<{ name, address, lng, lat }>>`
- Produces: `buildStaticImageUrl(lng, lat, zoom, w, h)` → `string`
- Produces: `buildImageryProvider(tk)` → `Cesium.UrlTemplateImageryProvider`（动态 import Cesium）
- Produces: `buildLabelProvider(tk)` → `Cesium.UrlTemplateImageryProvider`
- Produces: `PROVINCE_MAP` — 34 省/直辖市/自治区/特别行政区静态数组 `[{ name, adminCode }]`
- Produces: `normalizeRegion(address)` → 规范化行政区层级字符串 `"省 · 市 · 区/县 · 乡镇"`

- [ ] **Step 1: 创建 `src/modules/builder/editor/map3d/tianditu.js`**

```js
// src/modules/builder/editor/map3d/tianditu.js
import { getTiandituKey } from './mapConfig.js'

// 34 省/直辖市/自治区/特别行政区 adminCode 映射
export const PROVINCE_MAP = [
  { name: '不限', adminCode: '' },
  { name: '北京市', adminCode: '110000' },
  { name: '天津市', adminCode: '120000' },
  { name: '河北省', adminCode: '130000' },
  { name: '山西省', adminCode: '140000' },
  { name: '内蒙古自治区', adminCode: '150000' },
  { name: '辽宁省', adminCode: '210000' },
  { name: '吉林省', adminCode: '220000' },
  { name: '黑龙江省', adminCode: '230000' },
  { name: '上海市', adminCode: '310000' },
  { name: '江苏省', adminCode: '320000' },
  { name: '浙江省', adminCode: '330000' },
  { name: '安徽省', adminCode: '340000' },
  { name: '福建省', adminCode: '350000' },
  { name: '江西省', adminCode: '360000' },
  { name: '山东省', adminCode: '370000' },
  { name: '河南省', adminCode: '410000' },
  { name: '湖北省', adminCode: '420000' },
  { name: '湖南省', adminCode: '430000' },
  { name: '广东省', adminCode: '440000' },
  { name: '广西壮族自治区', adminCode: '450000' },
  { name: '海南省', adminCode: '460000' },
  { name: '重庆市', adminCode: '500000' },
  { name: '四川省', adminCode: '510000' },
  { name: '贵州省', adminCode: '520000' },
  { name: '云南省', adminCode: '530000' },
  { name: '西藏自治区', adminCode: '540000' },
  { name: '陕西省', adminCode: '610000' },
  { name: '甘肃省', adminCode: '620000' },
  { name: '青海省', adminCode: '630000' },
  { name: '宁夏回族自治区', adminCode: '640000' },
  { name: '新疆维吾尔自治区', adminCode: '650000' },
  { name: '香港特别行政区', adminCode: '810000' },
  { name: '澳门特别行政区', adminCode: '820000' },
  { name: '台湾省', adminCode: '710000' },
]

const SEARCH_TIMEOUT = 5000
const TIANDITU_SEARCH_URL = 'https://api.tianditu.gov.cn/v2/search'
const TIANDITU_IMG_URL = 'https://t{s}.tianditu.gov.cn/img_w/wmts'
const TIANDITU_CIA_URL = 'https://t{s}.tianditu.gov.cn/cia_w/wmts'

/**
 * 搜索村庄
 * @param {Object} opts
 * @param {string} opts.name - 村名
 * @param {string} [opts.provinceCode] - 省份 adminCode，空字符串表示全国搜索
 * @param {string} [opts.cityKeyword] - 市/区县关键字（前端二次过滤）
 * @returns {Promise<Array<{ name: string, address: string, lng: number, lat: number }>>}
 */
export async function searchVillages({ name, provinceCode = '', cityKeyword = '' }) {
  const tk = getTiandituKey()
  if (!tk) {
    throw new Error('天地图密钥未配置')
  }

  const params = new URLSearchParams({
    keyWord: name,
    queryType: '1',    // 1 = 普通搜索（行政区划+地名）
    tk,
  })
  if (provinceCode) {
    params.set('specify', provinceCode)
  }

  const url = `${TIANDITU_SEARCH_URL}?${params.toString()}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT)

  let data
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`天地图搜索接口返回 ${res.status}`)
    }
    data = await res.json()
  } finally {
    clearTimeout(timer)
  }

  if (!data || data.status !== '0' || !Array.isArray(data.pois)) {
    return []
  }

  let results = data.pois
    .filter(poi => poi.lon && poi.lat)
    .map(poi => ({
      name: poi.name || '',
      address: poi.address || '',
      lng: parseFloat(poi.lon),
      lat: parseFloat(poi.lat),
    }))

  // 前端按市/区县关键字二次过滤
  if (cityKeyword && cityKeyword.trim()) {
    const kw = cityKeyword.trim()
    results = results.filter(r => r.address.includes(kw))
  }

  return results
}

/**
 * 拼装天地图静态图 URL（用于编辑态缩略图）
 */
export function buildStaticImageUrl(lng, lat, zoom = 14, w = 640, h = 420) {
  const tk = getTiandituKey()
  // 天地图静态图：img_w 影像 + cia_w 注记叠加
  const base = 'https://api.tianditu.gov.cn/static'
  const center = `${lng},${lat}`
  return `${base}?center=${center}&zoom=${zoom}&size=${w},${h}&layers=img_w,cia_w&tk=${tk}`
}

/**
 * 规范化行政区层级字符串
 * 输入天地图 address 字段原始值，输出 "省 · 市 · 区/县 · 乡镇"
 */
export function normalizeRegion(address) {
  if (!address) return ''
  // 天地图返回的 address 形如 "云南省普洱市澜沧拉祜族自治县竹塘乡"
  // 简单的正则提取省市区县乡镇
  const parts = []
  const match = address.match(
    /^(.+?(?:省|自治区|特别行政区|市))?(.+?(?:市|自治州|地区|盟))?(.+?(?:县|区|自治县|县级市|旗))?(.+?(?:乡|镇|街道))?$/
  )
  if (match) {
    if (match[1]) parts.push(match[1])
    if (match[2]) parts.push(match[2])
    if (match[3]) parts.push(match[3])
    if (match[4]) parts.push(match[4])
  }
  // fallback: 直接返回原始 address
  return parts.length > 0 ? parts.join(' · ') : address
}

/**
 * 构建天地图影像图层（仅 cesiumScene.js 调用，动态 import Cesium）
 */
export function buildImageryProvider(tk) {
  // 动态 import Cesium —— 调用方保证 Cesium 已加载
  return new Cesium.UrlTemplateImageryProvider({
    url: `${TIANDITU_IMG_URL}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={TileMatrix}&TILEROW={TileRow}&TILECOL={TileCol}&tk=${tk}`,
    maximumLevel: 18,
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
  })
}

/**
 * 构建天地图注记图层
 */
export function buildLabelProvider(tk) {
  return new Cesium.UrlTemplateImageryProvider({
    url: `${TIANDITU_CIA_URL}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={TileMatrix}&TILEROW={TileRow}&TILECOL={TileCol}&tk=${tk}`,
    maximumLevel: 18,
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
  })
}
```

- [ ] **Step 2: 创建测试文件 `src/__tests__/builder-tianditu.test.js`**

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock mapConfig before importing tianditu
vi.mock('../modules/builder/editor/map3d/mapConfig.js', () => ({
  getTiandituKey: vi.fn(() => 'test-key-123'),
}))

import {
  searchVillages,
  buildStaticImageUrl,
  normalizeRegion,
  PROVINCE_MAP,
} from '../modules/builder/editor/map3d/tianditu.js'

describe('tianditu', () => {
  describe('PROVINCE_MAP', () => {
    it('包含 35 条记录（34 省 + 不限）', () => {
      expect(PROVINCE_MAP).toHaveLength(35)
    })

    it('所有省份 adminCode 唯一', () => {
      const codes = PROVINCE_MAP.filter(p => p.adminCode !== '')
      const seen = new Set()
      for (const p of codes) {
        expect(seen.has(p.adminCode)).toBe(false)
        seen.add(p.adminCode)
      }
    })

    it('第一条为"不限"，adminCode 为空字符串', () => {
      expect(PROVINCE_MAP[0].name).toBe('不限')
      expect(PROVINCE_MAP[0].adminCode).toBe('')
    })
  })

  describe('buildStaticImageUrl', () => {
    it('拼装正确的天地图静态图 URL', () => {
      const url = buildStaticImageUrl(100.5, 23.8, 14, 640, 420)
      expect(url).toContain('api.tianditu.gov.cn/static')
      expect(url).toContain('center=100.5,23.8')
      expect(url).toContain('zoom=14')
      expect(url).toContain('size=640,420')
      expect(url).toContain('layers=img_w,cia_w')
      expect(url).toContain('tk=test-key-123')
    })
  })

  describe('normalizeRegion', () => {
    it('规范化标准格式地址', () => {
      const result = normalizeRegion('云南省普洱市澜沧拉祜族自治县竹塘乡')
      expect(result).toContain('云南省')
      expect(result).toContain('普洱市')
      expect(result).toContain('澜沧')
      expect(result).toContain('竹塘乡')
    })

    it('空字符串返回空字符串', () => {
      expect(normalizeRegion('')).toBe('')
    })

    it('null/undefined 返回空字符串', () => {
      expect(normalizeRegion(null)).toBe('')
      expect(normalizeRegion(undefined)).toBe('')
    })
  })

  describe('searchVillages', () => {
    beforeEach(() => {
      global.fetch = vi.fn()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('构造正确的请求 URL（含 specify 参数）', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: '0', pois: [] }),
      })

      await searchVillages({ name: '和平村', provinceCode: '530000' })

      const calledUrl = global.fetch.mock.calls[0][0]
      expect(calledUrl).toContain('api.tianditu.gov.cn/v2/search')
      expect(calledUrl).toContain('keyWord=%E5%92%8C%E5%B9%B3%E6%9D%91')
      expect(calledUrl).toContain('specify=530000')
      expect(calledUrl).toContain('queryType=1')
      expect(calledUrl).toContain('tk=test-key-123')
    })

    it('无 provinceCode 时不传 specify 参数', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: '0', pois: [] }),
      })

      await searchVillages({ name: '和平村' })

      const calledUrl = global.fetch.mock.calls[0][0]
      expect(calledUrl).not.toContain('specify=')
    })

    it('返回空数组当天地图返回空结果', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: '0', pois: [] }),
      })

      const results = await searchVillages({ name: '不存在村庄' })
      expect(results).toEqual([])
    })

    it('5 秒超时时抛出错误', async () => {
      vi.useFakeTimers()
      global.fetch.mockImplementationOnce(() =>
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 6000)
        })
      )

      const promise = searchVillages({ name: 'test' })
      vi.advanceTimersByTime(5100)

      await expect(promise).rejects.toThrow()
      vi.useRealTimers()
    })

    it('按 cityKeyword 做前端二次过滤', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: '0',
          pois: [
            { name: '和平村', address: '云南省普洱市澜沧县竹塘乡', lon: '99.9', lat: '22.5' },
            { name: '和平村', address: '云南省昆明市宜良县狗街镇', lon: '103.1', lat: '24.9' },
          ],
        }),
      })

      const results = await searchVillages({ name: '和平村', cityKeyword: '普洱' })
      expect(results).toHaveLength(1)
      expect(results[0].address).toContain('普洱')
    })

    it('网络错误时抛出错误', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(searchVillages({ name: 'test' })).rejects.toThrow('Network error')
    })
  })
})
```

- [ ] **Step 3: 运行测试验证**

```bash
npx vitest run src/__tests__/builder-tianditu.test.js
```
预期：所有测试 PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/builder/editor/map3d/tianditu.js src/__tests__/builder-tianditu.test.js
git commit -m "feat: add tianditu API module with search, static image, and province map"
```

---

### Task 4: Cesium 场景管理模块

**Files:**
- Create: `src/modules/builder/editor/map3d/cesiumScene.js`

**Interfaces:**
- Consumes: `buildImageryProvider(tk)`, `buildLabelProvider(tk)` from `tianditu.js`（Task 3）
- Produces: `createScene(container, opts)` → `Promise<{ flyTo, setTerrainExaggeration, setRangeCircle, setZoomLimits, pauseRendering, resumeRendering, resize, destroy }>`
- 注意：此模块涉及 WebGL/Canvas，jsdom 无法有效模拟，靠手动验证覆盖

- [ ] **Step 1: 创建 `src/modules/builder/editor/map3d/cesiumScene.js`**

```js
// src/modules/builder/editor/map3d/cesiumScene.js
// 纯逻辑模块，无 Vue 依赖。封装所有 Cesium API 调用。
// Cesium 在预览态按需动态 import，编辑器主 bundle 不打包。

/**
 * @typedef {Object} SceneOpts
 * @property {number} lng - 经度
 * @property {number} lat - 纬度
 * @property {number} terrainExaggeration - 地形夸张系数 1.0–3.0
 * @property {boolean} showRangeCircle - 是否显示范围圆
 * @property {number} rangeRadius - 范围圆半径（米）
 * @property {number} defaultHeight - 相机默认高度（米）
 * @property {number} defaultPitch - 相机默认倾斜角（度）
 * @property {number} minZoomHeight - 最小缩放高度（米）
 * @property {number} maxZoomHeight - 最大缩放高度（米）
 * @property {string} tiandituKey - 天地图密钥
 * @property {string} ionToken - Cesium Ion Token
 * @property {Function} onError - 错误回调 ({ type, reason })
 */

export async function createScene(container, opts) {
  // 动态 import Cesium（仅预览态触发）
  const Cesium = await import('cesium')

  // 1. 检测 WebGL 支持（容错）
  if (typeof WebGLRenderingContext === 'undefined') {
    opts.onError && opts.onError({ type: 'no-webgl', reason: '浏览器不支持 WebGL' })
    return createNoopController()
  }

  // 2. 配置 Ion Token（必须在创建 Viewer 之前）
  if (opts.ionToken) {
    Cesium.Ion.defaultAccessToken = opts.ionToken
  }

  // 3. 创建 Viewer（关闭所有 UI 控件）
  const viewer = new Cesium.Viewer(container, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    imageryProvider: false,   // 手动添加天地图图层
  })

  const { scene, camera, globe, entities } = viewer

  try {
    // 4. 手动添加天地图影像 + 注记图层
    if (opts.tiandituKey) {
      const imgLayer = new Cesium.UrlTemplateImageryProvider({
        url: `https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={TileMatrix}&TILEROW={TileRow}&TILECOL={TileCol}&tk=${opts.tiandituKey}`,
        maximumLevel: 18,
        subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
      })
      viewer.imageryLayers.addImageryProvider(imgLayer)

      const labelLayer = new Cesium.UrlTemplateImageryProvider({
        url: `https://t{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={TileMatrix}&TILEROW={TileRow}&TILECOL={TileCol}&tk=${opts.tiandituKey}`,
        maximumLevel: 18,
        subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
      })
      viewer.imageryLayers.addImageryProvider(labelLayer)
    } else {
      opts.onError && opts.onError({ type: 'no-tianditu-key', reason: '天地图密钥未配置' })
    }

    // 5. 加载全球地形（依赖 Ion Token）
    if (opts.ionToken) {
      try {
        const terrainProvider = await Cesium.createWorldTerrainAsync({
          requestVertexNormals: true,
        })
        globe.terrainProvider = terrainProvider
      } catch (e) {
        // 降级为无地形平面
        globe.terrainProvider = new Cesium.EllipsoidTerrainProvider()
        opts.onError && opts.onError({ type: 'terrain-failed', reason: e.message || '地形加载失败' })
      }
    } else {
      // 无 Ion Token → 平面模式
      globe.terrainProvider = new Cesium.EllipsoidTerrainProvider()
      opts.onError && opts.onError({ type: 'no-ion-token', reason: 'Ion Token 未配置' })
    }

    // 6. 关闭全局特效
    scene.skyBox.show = false
    scene.skyAtmosphere.show = false
    scene.sun.show = false
    scene.moon.show = false
    scene.fog.enabled = false
    globe.showGroundAtmosphere = false
    globe.enableLighting = false

    // 7. 性能优化
    globe.showSkirts = false
    globe.underground = false

    // 8. 地形夸张
    scene.verticalExaggeration = opts.terrainExaggeration || 1.5

    // 9. 相机限制
    scene.screenSpaceCameraController.minimumZoomDistance = opts.minZoomHeight || 500
    scene.screenSpaceCameraController.maximumZoomDistance = opts.maxZoomHeight || 5000

    // 10. 标注贴地
    globe.depthTestAgainstTerrain = true

    // 11. 按需渲染
    scene.requestRenderMode = true
    scene.maximumRenderTimeChange = Infinity
    viewer.targetFrameRate = 30

    // 12. 标注实体：中心点 + 村名 + 范围圆
    const pointEntity = entities.add({
      position: Cesium.Cartesian3.fromDegrees(opts.lng, opts.lat),
      point: new Cesium.PointGraphics({
        pixelSize: 12,
        color: Cesium.Color.fromCssColorString('#e74c3c'),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      }),
    })

    const labelEntity = entities.add({
      position: Cesium.Cartesian3.fromDegrees(opts.lng, opts.lat),
      label: new Cesium.LabelGraphics({
        text: '',  // 暂时留空，由外部设置
        font: '16px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -16),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      }),
    })

    const ellipseEntity = entities.add({
      ellipse: new Cesium.EllipseGraphics({
        semiMinorAxis: opts.rangeRadius || 500,
        semiMajorAxis: opts.rangeRadius || 500,
        material: Cesium.Color.fromCssColorString('rgba(231, 76, 60, 0.15)'),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('rgba(231, 76, 60, 0.5)'),
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      }),
      show: opts.showRangeCircle !== false,
    })

    // 13. 飞行到村庄
    const pitchRad = Cesium.Math.toRadians(opts.defaultPitch || 60)
    camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        opts.lng, opts.lat, opts.defaultHeight || 1200
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: pitchRad,
        roll: 0,
      },
      duration: 2.5,
    })

    // -- ResizeObserver --
    let resizeObserver = null
    let resizeTimer = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimer)
        resizeTimer = setTimeout(() => {
          viewer.resize()
          // requestRenderMode 下 resize 后需手动触发渲染
          scene.requestRender()
        }, 100)
      })
      resizeObserver.observe(container)
    }

    // -- IntersectionObserver --
    let intersectionObserver = null
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            viewer.useDefaultRenderLoop = true
            scene.requestRender()
          } else {
            viewer.useDefaultRenderLoop = false
          }
        }
      })
      intersectionObserver.observe(container)
    }

    // 内部状态
    let _defaultHeight = opts.defaultHeight || 1200
    let _defaultPitch = opts.defaultPitch || 60
    let _destroyed = false

    // -- 返回控制器 --
    const controller = {
      async flyTo(lng, lat) {
        if (_destroyed) return
        const target = Cesium.Cartesian3.fromDegrees(lng, lat, _defaultHeight)
        camera.flyTo({
          destination: target,
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(_defaultPitch),
            roll: 0,
          },
          duration: 2.5,
        })
        // 更新标注实体位置
        pointEntity.position = Cesium.Cartesian3.fromDegrees(lng, lat)
        labelEntity.position = Cesium.Cartesian3.fromDegrees(lng, lat)
        ellipseEntity.position = Cesium.Cartesian3.fromDegrees(lng, lat)
      },

      setTerrainExaggeration(val) {
        if (_destroyed) return
        scene.verticalExaggeration = val
        scene.requestRender()
      },

      setRangeCircle(show, radius) {
        if (_destroyed) return
        ellipseEntity.show = show
        if (show) {
          ellipseEntity.ellipse.semiMinorAxis = radius
          ellipseEntity.ellipse.semiMajorAxis = radius
        }
        scene.requestRender()
      },

      setZoomLimits(min, max) {
        if (_destroyed) return
        scene.screenSpaceCameraController.minimumZoomDistance = min
        scene.screenSpaceCameraController.maximumZoomDistance = max
      },

      setLabel(text) {
        if (_destroyed) return
        labelEntity.label.text = text
        scene.requestRender()
      },

      setDefaultCamera(height, pitch) {
        _defaultHeight = height
        _defaultPitch = pitch
      },

      pauseRendering() {
        if (_destroyed) return
        viewer.useDefaultRenderLoop = false
      },

      resumeRendering() {
        if (_destroyed) return
        viewer.useDefaultRenderLoop = true
        scene.requestRender()
      },

      resize() {
        if (_destroyed) return
        viewer.resize()
        scene.requestRender()
      },

      destroy() {
        if (_destroyed) return
        _destroyed = true

        // 1. 取消飞行
        camera.cancelFlight()

        // 2. 清除实体
        entities.removeAll()

        // 3. 断开 Observer
        if (resizeObserver) {
          resizeObserver.disconnect()
          resizeObserver = null
        }
        if (intersectionObserver) {
          intersectionObserver.disconnect()
          intersectionObserver = null
        }

        // 4. 销毁 Viewer
        viewer.destroy()

        // 5. 清空容器
        container.innerHTML = ''
      },
    }

    return controller
  } catch (e) {
    // 初始化过程中任意步骤出错 → 安全销毁
    try { viewer.destroy() } catch (_) { /* ignore */ }
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;">3D 渲染初始化失败</div>'
    opts.onError && opts.onError({ type: 'init-failed', reason: e.message })
    return createNoopController()
  }
}

/** 空操作控制器（出错或 WebGL 不可用时返回） */
function createNoopController() {
  const noop = () => {}
  return {
    flyTo: noop,
    setTerrainExaggeration: noop,
    setRangeCircle: noop,
    setZoomLimits: noop,
    setLabel: noop,
    setDefaultCamera: noop,
    pauseRendering: noop,
    resumeRendering: noop,
    resize: noop,
    destroy: noop,
  }
}
```

- [ ] **Step 2: 确认文件创建正确**

确认 `src/modules/builder/editor/map3d/cesiumScene.js` 存在且不 import Vue。

- [ ] **Step 3: Commit**

```bash
git add src/modules/builder/editor/map3d/cesiumScene.js
git commit -m "feat: add cesiumScene pure-logic module with full lifecycle"
```

---

### Task 5: 村庄搜索输入框组件

**Files:**
- Create: `src/modules/builder/editor/map3d/VillageSearchField.vue`

**Interfaces:**
- Consumes: `searchVillages({ name, provinceCode, cityKeyword })`, `PROVINCE_MAP`, `normalizeRegion(address)` from `tianditu.js`（Task 3）
- Props: `modelValue: { villageName, centerLng, centerLat, region, filterProvince, filterCity }` — 即 `comp.props`
- Emits: `update:modelValue` — 选中村庄后更新父组件 `comp.props`

- [ ] **Step 1: 创建 `src/modules/builder/editor/map3d/VillageSearchField.vue`**

```vue
<!-- src/modules/builder/editor/map3d/VillageSearchField.vue -->
<template>
  <div class="vsf-root">
    <!-- 省份下拉 -->
    <div class="pp-field">
      <label>省份筛选（可选）</label>
      <select v-model="filterProvince" @change="onFilterChange">
        <option v-for="p in PROVINCE_MAP" :key="p.adminCode" :value="p.adminCode">
          {{ p.name }}
        </option>
      </select>
    </div>

    <!-- 市/区县关键字 -->
    <div class="pp-field">
      <label>市 / 区县关键字（可选）</label>
      <input
        type="text"
        v-model="filterCity"
        placeholder="如：普洱市"
        @input="onFilterChange"
      />
    </div>

    <!-- 搜索框 -->
    <div class="pp-field">
      <label>村庄名称</label>
      <div class="vsf-search-row">
        <input
          ref="searchInput"
          type="text"
          v-model="searchText"
          placeholder="输入村名，如：和平村"
          @keydown.enter="doSearch"
        />
        <button class="vsf-search-btn" @click="doSearch" :disabled="searching">
          {{ searching ? '搜索中...' : '🔍 搜索' }}
        </button>
      </div>
    </div>

    <!-- 候选下拉 -->
    <div v-if="candidates.length > 0" class="vsf-candidates">
      <div
        v-for="(c, i) in candidates"
        :key="i"
        class="vsf-candidate-item"
        @click="selectCandidate(c)"
      >
        <span class="vsf-cand-name">{{ c.name }}</span>
        <span class="vsf-cand-addr">{{ formatAddress(c) }}</span>
      </div>
    </div>

    <!-- 已定位状态 -->
    <div v-if="isLocated" class="vsf-located">
      <span>✅ 已定位到：{{ modelValue.villageName }}（{{ modelValue.region }}）</span>
      <a class="vsf-research" @click="resetSearch">重新搜索</a>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="vsf-error">{{ errorMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { searchVillages, normalizeRegion, PROVINCE_MAP } from './tianditu.js'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    // { villageName, centerLng, centerLat, region, filterProvince, filterCity }
  },
})

const emit = defineEmits(['update:modelValue'])

const searchText = ref('')
const filterProvince = ref(props.modelValue.filterProvince || '')
const filterCity = ref(props.modelValue.filterCity || '')
const candidates = ref([])
const searching = ref(false)
const errorMsg = ref('')
const isLocated = ref(false)

// 初始化：如果已定位显示已定位状态
watch(
  () => props.modelValue.centerLng,
  (val) => {
    if (val != null) {
      isLocated.value = true
    }
  },
  { immediate: true }
)

let debounceTimer = null

function onFilterChange() {
  emit('update:modelValue', {
    ...props.modelValue,
    filterProvince: filterProvince.value,
    filterCity: filterCity.value,
  })
}

async function doSearch() {
  const name = searchText.value.trim()
  if (!name) return

  searching.value = true
  errorMsg.value = ''
  candidates.value = []

  try {
    const results = await searchVillages({
      name,
      provinceCode: filterProvince.value,
      cityKeyword: filterCity.value,
    })

    if (results.length === 0) {
      errorMsg.value = '未找到该村庄，请检查名称或缩小行政区范围'
    } else {
      candidates.value = results
    }
  } catch (e) {
    errorMsg.value = '搜索失败，请重试'
    console.error('[VillageSearchField] 搜索失败:', e)
  } finally {
    searching.value = false
  }
}

function selectCandidate(candidate) {
  const region = normalizeRegion(candidate.address)
  emit('update:modelValue', {
    ...props.modelValue,
    villageName: candidate.name,
    centerLng: candidate.lng,
    centerLat: candidate.lat,
    region: region,
    filterProvince: filterProvince.value,
    filterCity: filterCity.value,
  })
  candidates.value = []
  errorMsg.value = ''
  isLocated.value = true
}

function resetSearch() {
  isLocated.value = false
  searchText.value = ''
  candidates.value = []
  errorMsg.value = ''
  emit('update:modelValue', {
    ...props.modelValue,
    villageName: '',
    centerLng: null,
    centerLat: null,
    region: '',
  })
}

function formatAddress(candidate) {
  return normalizeRegion(candidate.address) || candidate.address || ''
}
</script>

<style scoped>
.vsf-root {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.vsf-search-row {
  display: flex;
  gap: 0.4rem;
}

.vsf-search-row input {
  flex: 1;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  font-size: 0.82rem;
  outline: none;
  background: var(--color-bg);
  color: var(--color-text);
}

.vsf-search-row input:focus {
  border-color: #2c7da0;
  box-shadow: 0 0 0 3px var(--editor-input-focus-glow);
}

.vsf-search-btn {
  padding: 0.45rem 0.8rem;
  border: 1px solid #2c7da0;
  border-radius: 12px;
  background: #2c7da0;
  color: #fff;
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.vsf-search-btn:hover {
  background: #245a73;
}

.vsf-search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.vsf-candidates {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  max-height: 200px;
  overflow-y: auto;
  background: var(--color-card);
}

.vsf-candidate-item {
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0.7rem;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-fast);
}

.vsf-candidate-item:last-child {
  border-bottom: none;
}

.vsf-candidate-item:hover {
  background: rgba(44, 125, 160, 0.04);
}

.vsf-cand-name {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--color-text);
}

.vsf-cand-addr {
  font-size: 0.72rem;
  color: var(--color-text-light);
  margin-top: 0.15rem;
}

.vsf-located {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.7rem;
  background: rgba(44, 125, 160, 0.05);
  border-radius: 10px;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  flex-wrap: wrap;
  gap: 0.3rem;
}

.vsf-research {
  color: #2c7da0;
  cursor: pointer;
  font-size: 0.74rem;
  text-decoration: underline;
}

.vsf-error {
  color: #c0392b;
  font-size: 0.76rem;
  padding: 0.4rem 0.6rem;
  background: rgba(192, 57, 43, 0.05);
  border-radius: 8px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/editor/map3d/VillageSearchField.vue
git commit -m "feat: add VillageSearchField with search, candidates, and province filter"
```

---

### Task 6: Map3D Vue 组件（编辑态 + 预览态）

**Files:**
- Create: `src/modules/builder/editor/map3d/Map3DComponent.vue`

**Interfaces:**
- Consumes: `buildStaticImageUrl(lng, lat, zoom, w, h)` from `tianditu.js`（Task 3）
- Consumes: `createScene(container, opts)` from `cesiumScene.js`（Task 4）
- Consumes: `getTiandituKey()`, `getIonToken()` from `mapConfig.js`（Task 2）
- Props: `component` — 完整的 component 对象 `{ id, type, x, y, width, height, props }`
- Props: `mode` — `'edit' | 'preview'`

- [ ] **Step 1: 创建 `src/modules/builder/editor/map3d/Map3DComponent.vue`**

```vue
<!-- src/modules/builder/editor/map3d/Map3DComponent.vue -->
<template>
  <div ref="rootRef" class="m3d-root" :style="rootStyle">
    <!-- 编辑态：未定位 → 灰色占位 -->
    <div v-if="mode === 'edit' && !isLocated" class="m3d-placeholder">
      <span class="m3d-placeholder-icon">🏔️</span>
      <span class="m3d-placeholder-text">请在属性面板输入村庄名</span>
    </div>

    <!-- 编辑态：已定位 → 静态图缩略图 -->
    <img
      v-else-if="mode === 'edit' && isLocated"
      :src="staticImageUrl"
      :style="{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }"
      @error="onImageError"
      :alt="comp.props.villageName || '村庄地图'"
    />

    <!-- 编辑态：静态图加载失败 → 灰色占位 + 村名 -->
    <div v-else-if="mode === 'edit' && imageFailed" class="m3d-placeholder">
      <span class="m3d-placeholder-icon">🖼️</span>
      <span class="m3d-placeholder-text">缩略图暂不可用 · {{ comp.props.villageName }}</span>
    </div>

    <!-- 预览态：Cesium 挂载容器 -->
    <div v-else-if="mode === 'preview'" ref="cesiumContainer" class="m3d-cesium-container"></div>

    <!-- 错误状态（预览态密钥缺失） -->
    <div v-if="errorState" class="m3d-error-overlay">
      <span>{{ errorMessage }}</span>
      <button v-if="errorState === 'no-tianditu-key' || errorState === 'bad-tianditu-key'" @click="retry">重试</button>
    </div>

    <!-- 地形不可用角标 -->
    <div v-if="terrainUnavailable" class="m3d-terrain-badge">
      地形数据不可用{{ terrainReason ? '（' + terrainReason + '）' : '' }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { buildStaticImageUrl } from './tianditu.js'
import { getTiandituKey, getIonToken } from './mapConfig.js'

const props = defineProps({
  component: { type: Object, required: true },
  mode: { type: String, default: 'edit' },   // 'edit' | 'preview'
})

const comp = computed(() => props.component)
const isLocated = computed(() => comp.value.props.centerLng != null && comp.value.props.centerLat != null)

const rootRef = ref(null)
const cesiumContainer = ref(null)

const imageFailed = ref(false)
const errorState = ref(null)       // null | 'no-tianditu-key' | 'bad-tianditu-key' | 'no-webgl'
const errorMessage = ref('')
const terrainUnavailable = ref(false)
const terrainReason = ref('')

let sceneController = null

// 静态图 URL（编辑态）
const staticImageUrl = computed(() => {
  if (!isLocated.value) return ''
  const { centerLng, centerLat } = comp.value.props
  const w = comp.value.width || 640
  const h = comp.value.height || 420
  return buildStaticImageUrl(centerLng, centerLat, 14, Math.round(w), Math.round(h))
})

function onImageError() {
  imageFailed.value = true
}

// 属性变化时重置静态图错误状态
watch(
  () => [comp.value.props.centerLng, comp.value.props.centerLat],
  () => { imageFailed.value = false }
)

// 编辑态：watch 属性变化仅刷新静态图 URL（computed 自动处理）

// 预览态：初始化 Cesium 场景
onMounted(async () => {
  if (props.mode !== 'preview') return
  if (!isLocated.value) return
  await initCesiumScene()
})

onUnmounted(() => {
  if (sceneController) {
    sceneController.destroy()
    sceneController = null
  }
})

async function initCesiumScene() {
  if (!cesiumContainer.value) return

  const tiandituKey = getTiandituKey()
  const ionToken = getIonToken()

  if (!tiandituKey) {
    errorState.value = 'no-tianditu-key'
    errorMessage.value = '天地图密钥未配置，请联系管理员'
    return
  }

  try {
    const { createScene } = await import('./cesiumScene.js')
    const p = comp.value.props

    sceneController = await createScene(cesiumContainer.value, {
      lng: p.centerLng,
      lat: p.centerLat,
      terrainExaggeration: p.terrainExaggeration || 1.5,
      showRangeCircle: p.showRangeCircle !== false,
      rangeRadius: p.rangeRadius || 500,
      defaultHeight: p.defaultHeight || 1200,
      defaultPitch: p.defaultPitch || 60,
      minZoomHeight: p.minZoomHeight || 500,
      maxZoomHeight: p.maxZoomHeight || 5000,
      tiandituKey,
      ionToken,
      onError: (err) => {
        if (err.type === 'no-tianditu-key') {
          errorState.value = 'no-tianditu-key'
          errorMessage.value = '天地图密钥未配置，请联系管理员'
        } else if (err.type === 'bad-tianditu-key') {
          errorState.value = 'bad-tianditu-key'
          errorMessage.value = '天地图密钥无效'
        } else if (err.type === 'no-webgl') {
          errorState.value = 'no-webgl'
          errorMessage.value = '浏览器不支持 3D 渲染'
        } else if (err.type === 'no-ion-token' || err.type === 'terrain-failed') {
          terrainUnavailable.value = true
          terrainReason.value = err.type === 'no-ion-token' ? 'Ion Token 未配置' : ''
        }
      },
    })

    if (sceneController && p.villageName) {
      sceneController.setLabel(p.villageName)
    }
  } catch (e) {
    console.error('[Map3DComponent] Cesium 初始化失败:', e)
    errorState.value = 'init-failed'
    errorMessage.value = '3D 渲染初始化失败'
  }
}

function retry() {
  errorState.value = null
  errorMessage.value = ''
  terrainUnavailable.value = false
  initCesiumScene()
}

// 预览态：watch 属性变化 → 转发给 sceneController
watch(
  () => comp.value.props.centerLng,
  (newVal) => {
    if (props.mode === 'preview' && sceneController && newVal != null) {
      sceneController.flyTo(newVal, comp.value.props.centerLat)
      sceneController.setLabel(comp.value.props.villageName || '')
    }
  }
)

watch(
  () => comp.value.props.terrainExaggeration,
  (val) => {
    if (props.mode === 'preview' && sceneController) {
      sceneController.setTerrainExaggeration(val)
    }
  }
)

watch(
  () => [comp.value.props.showRangeCircle, comp.value.props.rangeRadius],
  ([show, radius]) => {
    if (props.mode === 'preview' && sceneController) {
      sceneController.setRangeCircle(show, radius)
    }
  }
)

watch(
  () => [comp.value.props.defaultHeight, comp.value.props.defaultPitch],
  ([height, pitch]) => {
    if (props.mode === 'preview' && sceneController) {
      sceneController.setDefaultCamera(height, pitch)
    }
  }
)

watch(
  () => [comp.value.props.minZoomHeight, comp.value.props.maxZoomHeight],
  ([min, max]) => {
    if (props.mode === 'preview' && sceneController) {
      sceneController.setZoomLimits(min, max)
    }
  }
)

const rootStyle = computed(() => ({
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '12px',
}))
</script>

<style scoped>
.m3d-root {
  background: #f2f6f8;
  border: 1px solid rgba(44, 125, 160, 0.08);
}

.m3d-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 0.5rem;
  color: #8ea3b2;
}

.m3d-placeholder-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.m3d-placeholder-text {
  font-size: 0.82rem;
}

.m3d-cesium-container {
  width: 100%;
  height: 100%;
}

.m3d-error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background: rgba(242, 246, 248, 0.95);
  color: #8ea3b2;
  font-size: 0.84rem;
  z-index: 10;
  border-radius: 12px;
}

.m3d-error-overlay button {
  padding: 0.35rem 0.9rem;
  border: 1px solid #2c7da0;
  border-radius: 999px;
  background: transparent;
  color: #2c7da0;
  cursor: pointer;
  font-size: 0.78rem;
}

.m3d-terrain-badge {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 0.15rem 0.5rem;
  background: rgba(0, 0, 0, 0.45);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.64rem;
  border-radius: 6px;
  z-index: 5;
  pointer-events: none;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/editor/map3d/Map3DComponent.vue
git commit -m "feat: add Map3DComponent with edit static-image and preview Cesium modes"
```

---

### Task 7: 组件工厂与组件库集成

**Files:**
- Modify: `src/modules/builder/editor/componentFactory.js:1-15,165-179` — 新增 `createMap3DComponent` + switch case
- Modify: `src/modules/builder/editor/ComponentLibrary.vue:73-76` — geo 分类新增拖拽条目
- Test: `src/__tests__/builder-componentFactory.test.js:1-77`

**Interfaces:**
- Produces: `createMap3DComponent(x, y)` → 返回 `{ type: 'map-3d', x, y, width: 640, height: 420, props: { ...默认值 } }`
- Consumes: `COMPONENT_CATEGORIES` 中 geo 分类（Task 8 消费）

- [ ] **Step 1: 在 `componentFactory.js` 新增工厂函数**

在 `createFlowBoxComponent` 函数之后（第 165 行后），`createEmptyChildComponent` 之前，添加：

```js
export function createMap3DComponent(x, y) {
  return {
    type: 'map-3d',
    x, y,
    width: 640,
    height: 420,
    props: {
      // 定位
      villageName: '',
      centerLng: null,
      centerLat: null,
      region: '',

      // 搜索筛选
      filterProvince: '',
      filterCity: '',

      // 视觉
      terrainExaggeration: 1.5,
      showRangeCircle: true,
      rangeRadius: 500,

      // 相机
      defaultHeight: 1200,
      defaultPitch: 60,
      minZoomHeight: 500,
      maxZoomHeight: 5000,
    },
  }
}
```

- [ ] **Step 2: 在 `createComponent` switch 中新增分支**

在 `case 'flow-box':` 之后（第 12 行），`default:` 之前，添加：

```js
    case 'map-3d':    return createMap3DComponent(x, y)
```

- [ ] **Step 3: 在 `ComponentLibrary.vue` geo 分类新增条目**

找到 `COMPONENT_CATEGORIES` 数组中 `id: 'geo'` 的分类（第 73-76 行），在 `items` 数组末尾添加：

```js
      { label: '村庄 3D 地形图', icon: '🏔️', type: 'map-3d' },
```

修改后该分类为：

```js
  {
    id: 'geo', icon: '🗺️', name: '讲「空间」— 地理分布',
    items: [
      { label: '地图散点', icon: '📍', type: 'chart', chartType: 'bar' },
      { label: '村庄 3D 地形图', icon: '🏔️', type: 'map-3d' },
    ],
  },
```

- [ ] **Step 4: 更新组件工厂测试**

在 `src/__tests__/builder-componentFactory.test.js` 中：
- 第 3 行 import 增加 `createMap3DComponent`
- 在第 74 行 `createComponent` 测试中增加 `'map-3d'` 断言
- 新增 `describe('createMap3DComponent', ...)` 块

```js
import {
  createComponent,
  createTextComponent,
  createImageComponent,
  createChartComponent,
  createSensorComponent,
  createMap3DComponent,
} from '../modules/builder/editor/componentFactory.js'

// ... 保持现有测试不变 ...

// 在 createSensorComponent describe 之后新增：
  describe('createMap3DComponent', () => {
    it('returns a map-3d component with all default props', () => {
      const c = createMap3DComponent(100, 200)
      expect(c.type).toBe('map-3d')
      expect(c.x).toBe(100)
      expect(c.y).toBe(200)
      expect(c.width).toBe(640)
      expect(c.height).toBe(420)

      // 定位默认值
      expect(c.props.villageName).toBe('')
      expect(c.props.centerLng).toBeNull()
      expect(c.props.centerLat).toBeNull()
      expect(c.props.region).toBe('')

      // 搜索筛选默认值
      expect(c.props.filterProvince).toBe('')
      expect(c.props.filterCity).toBe('')

      // 视觉默认值
      expect(c.props.terrainExaggeration).toBe(1.5)
      expect(c.props.showRangeCircle).toBe(true)
      expect(c.props.rangeRadius).toBe(500)

      // 相机默认值
      expect(c.props.defaultHeight).toBe(1200)
      expect(c.props.defaultPitch).toBe(60)
      expect(c.props.minZoomHeight).toBe(500)
      expect(c.props.maxZoomHeight).toBe(5000)
    })
  })

// 在 createComponent dispatch 测试中增加 map-3d 分支：
// 找到 expect(createComponent('agri-sensor', 10, 20).type).toBe('agri-sensor')
// 在其后添加：
      expect(createComponent('map-3d', 10, 20).type).toBe('map-3d')
```

- [ ] **Step 5: 运行测试**

```bash
npx vitest run src/__tests__/builder-componentFactory.test.js
```
预期：所有测试 PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/builder/editor/componentFactory.js src/modules/builder/editor/ComponentLibrary.vue src/__tests__/builder-componentFactory.test.js
git commit -m "feat: add map-3d to componentFactory and ComponentLibrary geo category"
```

---

### Task 8: 属性面板集成

**Files:**
- Modify: `src/modules/builder/editor/PropertyPanel.vue:28-31,731-996`

**Interfaces:**
- Consumes: `comp.type === 'map-3d'` — 在 PropertyPanel 中新增属性区块
- Consumes: `VillageSearchField` from `./map3d/VillageSearchField.vue`（Task 5）

- [ ] **Step 1: 在 PropertyPanel 模板中新增 map-3d 属性区块**

在 `<!-- Flow-box props -->` 区块（`v-if="comp.type === 'flow-box'"`）的闭合 `</template>` 之后、最外层 `</template>` 之前，添加 map-3d 属性区块：

```vue
      <!-- Map3D props -->
      <div v-if="comp.type === 'map-3d'" class="pp-section">
        <!-- 区块 1: 村庄定位 -->
        <h4 class="pp-subtitle">📍 村庄定位</h4>
        <VillageSearchField v-model="comp.props" />

        <!-- 区块 2: 地形显示 -->
        <h4 class="pp-subtitle" style="margin-top:1rem;">⛰️ 地形显示</h4>
        <div class="pp-field">
          <label>地形夸张：{{ comp.props.terrainExaggeration.toFixed(1) }}</label>
          <input
            type="range"
            v-model.number="comp.props.terrainExaggeration"
            min="1.0"
            max="3.0"
            step="0.1"
          />
        </div>
        <div class="pp-field">
          <label class="pp-check">
            <input type="checkbox" v-model="comp.props.showRangeCircle" />
            显示范围圆
          </label>
        </div>
        <div class="pp-field">
          <label>范围圆半径（米）：{{ comp.props.rangeRadius }}</label>
          <div style="display:flex;gap:0.5rem;align-items:center;">
            <input
              type="range"
              v-model.number="comp.props.rangeRadius"
              min="100"
              max="5000"
              step="100"
              style="flex:1;"
              :disabled="!comp.props.showRangeCircle"
            />
            <input
              type="number"
              v-model.number="comp.props.rangeRadius"
              min="100"
              max="5000"
              style="width:80px;"
              :disabled="!comp.props.showRangeCircle"
            />
          </div>
        </div>

        <!-- 区块 3: 相机视角 -->
        <h4 class="pp-subtitle" style="margin-top:1rem;">📷 相机视角</h4>
        <div class="pp-field">
          <label>默认高度（米）</label>
          <input
            type="number"
            v-model.number="comp.props.defaultHeight"
            min="500"
            max="5000"
          />
        </div>
        <div class="pp-field">
          <label>默认倾斜角：{{ comp.props.defaultPitch }}°</label>
          <input
            type="range"
            v-model.number="comp.props.defaultPitch"
            min="30"
            max="85"
            step="1"
          />
        </div>
        <div class="pp-field-row">
          <div class="pp-field">
            <label>最小缩放高度（米）</label>
            <input
              type="number"
              v-model.number="comp.props.minZoomHeight"
              min="100"
              max="5000"
            />
          </div>
          <div class="pp-field">
            <label>最大缩放高度（米）</label>
            <input
              type="number"
              v-model.number="comp.props.maxZoomHeight"
              min="100"
              max="5000"
            />
          </div>
        </div>
      </div>
```

- [ ] **Step 2: 在 script setup 中导入 VillageSearchField**

在 `<script setup>` 区块的 import 部分（约第 738 行），`import PracticeImagePicker from './PracticeImagePicker.vue'` 之后，添加：

```js
import VillageSearchField from './map3d/VillageSearchField.vue'
```

- [ ] **Step 3: 在 typeLabel 函数中增加 map-3d 标签**

找到 `typeLabel` 函数（约第 747 行），在返回对象中添加 `'map-3d'` 条目：

```js
function typeLabel(type) {
  const labels = { text: '📝 文本', image: '🖼 图片', chart: '📊 图表', 'agri-sensor': '🌡 传感器', 'timeline': '⏳ 时间轴', 'datatable': '📋 数据表', 'layout-box': '📦 多组件框', 'flow-box': '🎠 流动组件框', 'map-3d': '🏔️ 村庄 3D 地形图' }
  return labels[type] || type
}
```

- [ ] **Step 4: 确认 VillageSearchField v-model 双向绑定正确**

`VillageSearchField` 的 `v-model` 绑定的是 `comp.props`，组件内部通过 `emit('update:modelValue', newProps)` 更新。由于 `comp` 是 computed 来自 stageEditor 的响应式对象，`comp.props` 整体替换即可触发响应式更新。

- [ ] **Step 5: Commit**

```bash
git add src/modules/builder/editor/PropertyPanel.vue
git commit -m "feat: add map-3d property panel with village search, terrain, and camera sections"
```

---

### Task 9: 编辑器画布集成

**Files:**
- Modify: `src/modules/builder/editor/EditorCanvas.vue:223-262,830`

**Interfaces:**
- Consumes: `Map3DComponent` from `./map3d/Map3DComponent.vue`（Task 6）
- Produces: `renderComponentMarkup` case `'map-3d'` → 输出占位 `<div>` + Teleport 挂载点

- [ ] **Step 1: 在 `renderComponentMarkup` 中新增 case**

在 `case 'flow-box':` 之后、函数末尾 `}` 之前（约第 261 行），添加：

```js
    case 'map-3d': {
      const located = c.props.centerLng != null
      if (!located) {
        inner = `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f2f6f8;border:1px solid rgba(44,125,160,0.08);border-radius:12px;color:#8ea3b2;font-size:13px;gap:6px;"><span style="font-size:2rem;opacity:0.5;">🏔️</span><span>请在属性面板输入村庄名</span></div>`
      } else {
        inner = `<div data-map-3d-id="${c.id}" style="width:100%;height:100%;border-radius:12px;overflow:hidden;background:#f2f6f8;"></div>`
      }
      break
    }
```

- [ ] **Step 2: 在模板层通过 Teleport 挂载 Map3DComponent**

在 `EditorCanvas.vue` 的 `<script setup>` 中导入 Map3DComponent：

```js
import Map3DComponent from './map3d/Map3DComponent.vue'
```

在 `<template>` 中 `</div>`（`.ec-viewport` 闭合标签之前）附近，添加 Teleport 挂载区 —— 但由于 `stageHtml` 是 innerHTML 渲染的，Teleport 目标需要 DOM 中存在 `[data-map-3d-id]` 元素。需要在 `onMounted` 之后用 `watch(stageHtml)` 处理。

更务实的做法是不用 Teleport（Teleport 对 innerHTML 渲染的 DOM 不友好），而是在 `stageHtml` computed 更新后通过 `nextTick` 手动创建 Vue app 实例挂载到每个 `[data-map-3d-id]`。

**但是**，spec 明确说用 `<Teleport>` 挂载。由于 canvas 用 `v-html`（innerHTML），Teleport 的目标必须是已挂载的真实 DOM。`v-html` 更新后 DOM 存在所以 Teleport 可以工作。我们需要在模板中为每个 map-3d 组件输出 Teleport。

实际方案：在模板中直接用 `v-for` 遍历 `state.components` 中 type 为 `map-3d` 的组件，然后用 `<Teleport :to="`[data-map-3d-id='${c.id}']`">` 挂载。

在 `<template>` 的 `.ec-viewport` 内部末尾（`</div>` 闭合前）、框选矩形之后，添加：

```vue
      <!-- Map3D Teleport 挂载点 -->
      <template v-for="c in map3dComponents" :key="c.id">
        <Teleport v-if="c._domReady" :to="`[data-map-3d-id='${c.id}']`">
          <Map3DComponent :component="c" mode="edit" />
        </Teleport>
      </template>
```

在 `<script setup>` 中添加：

```js
import { nextTick } from 'vue'

const map3dComponents = computed(() =>
  state.components.filter(c => c.type === 'map-3d')
)
```

但这里有个问题：Teleport 的目标必须在 Teleport 渲染时已存在于 DOM 中。`v-html` 是异步的——computed 更新后 Vue 会在下一个 tick 更新 innerHTML。所以需要等 `stageHtml` 更新后在 `nextTick` 中标记 `_domReady`。

简化处理：使用 `watch(stageHtml, ...)` + `nextTick`。

在 `<script setup>` 的 `onMounted` 附近添加：

```js
// Map3D Teleport 就绪标记
watch(stageHtml, async () => {
  await nextTick()
  for (const c of state.components) {
    if (c.type === 'map-3d') {
      c._domReady = document.querySelector(`[data-map-3d-id='${c.id}']`) !== null
    }
  }
}, { immediate: true })
```

**更简单的方案（推荐）**：不用 Teleport，不用 v-html。直接在 canvas 中为非 map-3d 组件用 v-html，map-3d 组件在模板中用绝对定位的 `<div>` + `<Map3DComponent>` 直接渲染。但这需要拆分 stageHtml 逻辑。

**最终方案（务实）**：保持 v-html 方式，但在 stageHtml 的 computed 中不用 Teleport。改为在 `watch(stageHtml)` + `nextTick` 后直接在 DOM 占位元素上通过程序化方式挂载。但 Vue 3 的 `createApp` 太重。

**最简方案（遵循 spec 精神但务实实现）**：移除 Teleport 方案，改为在模板中与 v-html 同级渲染 map-3d 组件的绝对定位覆盖层。`stageHtml` 中 map-3d 的 case 仅输出空的透明占位 div。真正的 Map3DComponent 在模板中用绝对定位叠在上面。

在模板 `.ec-stage-wrap` 内、`.ec-stage` 之后添加：

```vue
        <!-- Map3D 组件（编辑态，绝对定位覆盖在 stage 上方） -->
        <div
          v-for="c in map3dComponents"
          :key="'m3d-' + c.id"
          :style="{
            position: 'absolute',
            left: (c.x * state.zoom) + 'px',
            top: (c.y * state.zoom) + 'px',
            width: (c.width * state.zoom) + 'px',
            height: (c.height * state.zoom) + 'px',
            pointerEvents: 'none',
          }"
        >
          <Map3DComponent :component="c" mode="edit" />
        </div>
```

在 `<script setup>` 中添加 `map3dComponents` computed。

- [ ] **Step 2 最终实现（务实）**：将以下代码添加到 EditorCanvas.vue

在 `<script setup>` 中，`import` 区域，`import { createComponent } from './componentFactory.js'` 之后添加：

```js
import Map3DComponent from './map3d/Map3DComponent.vue'
```

在 `const stageHtml = computed(...)` 之后添加：

```js
const map3dComponents = computed(() =>
  state.components.filter(c => c.type === 'map-3d')
)
```

在模板的 `.ec-stage-wrap` div 内部、`.ec-stage` div 之后、`<!-- Box selection overlay -->` 之前，添加：

```vue
        <!-- Map3D 组件覆盖层（编辑态，绝对定位避开 v-html 限制） -->
        <div
          v-for="c in map3dComponents"
          :key="'m3d-' + c.id"
          :style="{
            position: 'absolute',
            left: (c.x * state.zoom) + 'px',
            top: (c.y * state.zoom) + 'px',
            width: (c.width * state.zoom) + 'px',
            height: (c.height * state.zoom) + 'px',
            zIndex: 1,
          }"
        >
          <Map3DComponent :component="c" mode="edit" />
        </div>
```

- [ ] **Step 3: 在 stageHtml 中，map-3d case 输出最小占位**

在 `renderComponentMarkup` 中 `case 'map-3d':` 仅输出一个透明占位，保持组件在 stage 上的 x/y/width/height 定位用于拖拽/选中/调整大小：

```js
    case 'map-3d':
      inner = `<div style="width:100%;height:100%;border-radius:12px;background:transparent;"></div>`
      break
```

- [ ] **Step 4: 工具栏增加快捷添加按钮**

在 `.ec-tb-left` 区域（第 16 行 `flow-box` 按钮之后）添加：

```html
        <button class="tb-btn" @click="addToCanvas('map-3d')">🏔️ 3D地图</button>
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/builder/editor/EditorCanvas.vue
git commit -m "feat: integrate Map3DComponent into editor canvas with overlay rendering"
```

---

### Task 10: 预览构建器集成

**Files:**
- Modify: `src/modules/builder/editor/buildPreview.js:121-156,158-195`

**Interfaces:**
- Consumes: `cesiumScene.js`（Task 4）— 预览 HTML 中动态 import
- Produces: `renderComponentHtml` case `'map-3d'` → 输出占位 div + 初始化脚本
- Produces: `buildPreviewHtml` 注入公共脚本

- [ ] **Step 1: 在 `renderComponentHtml` 中新增 case**

在 `case 'flow-box':` 之后（第 152 行）、函数末尾 `}` 之前，添加：

```js
    case 'map-3d': {
      const located = p.centerLng != null && p.centerLat != null
      if (!located) {
        inner = `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f2f6f8;border-radius:12px;color:#8ea3b2;font-size:13px;gap:6px;"><span style="font-size:2rem;opacity:0.5;">🏔️</span><span>请在属性面板输入村庄名</span></div>`
      } else {
        inner = `<div id="map3d-${c.id || ''}" style="width:100%;height:100%;border-radius:12px;overflow:hidden;background:#f2f6f8;"></div>
<script type="module">
(function() {
  var container = document.getElementById('map3d-${c.id || ''}');
  if (!container) return;

  // 实例超限检查：单页最多 4 个
  window.__map3dCount = (window.__map3dCount || 0) + 1;
  if (window.__map3dCount > 4) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8ea3b2;font-size:13px;">实例超限，单页最多 4 个 3D 地图</div>';
    return;
  }

  var opts = {
    lng: ${p.centerLng},
    lat: ${p.centerLat},
    terrainExaggeration: ${p.terrainExaggeration || 1.5},
    showRangeCircle: ${p.showRangeCircle !== false},
    rangeRadius: ${p.rangeRadius || 500},
    defaultHeight: ${p.defaultHeight || 1200},
    defaultPitch: ${p.defaultPitch || 60},
    minZoomHeight: ${p.minZoomHeight || 500},
    maxZoomHeight: ${p.maxZoomHeight || 5000},
    tiandituKey: window.__tiandituKey || '',
    ionToken: window.__ionToken || '',
    onError: function(err) {
      if (err.type === 'no-tianditu-key' || err.type === 'bad-tianditu-key') {
        container.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#8ea3b2;font-size:13px;gap:8px;"><span>天地图密钥未配置，请联系管理员</span></div>';
      } else if (err.type === 'no-webgl') {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8ea3b2;font-size:13px;">浏览器不支持 3D 渲染</div>';
      }
    }
  };

  // 动态 import cesiumScene（仅预览页）
  import('${CESIUM_SCENE_URL}')
    .then(function(m) {
      return m.createScene(container, opts);
    })
    .then(function(ctrl) {
      if (ctrl && ctrl.setLabel) {
        ctrl.setLabel('${esc(p.villageName || '')}');
      }
    })
    .catch(function(e) {
      console.error('[map3d preview] 初始化失败:', e);
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8ea3b2;font-size:13px;">3D 渲染初始化失败</div>';
    });
})();
</script>`
      }
      break
    }
```

- [ ] **Step 2: 在 `buildPreviewHtml` 头部注入公共脚本（密钥 + Cesium）**

修改 `buildPreviewHtml` 函数，在 `</head>` 之前注入密钥和 Cesium 加载脚本：

```js
export function buildPreviewHtml(state, baseUrl) {
  const componentsHtml = state.components.map(c => renderComponentHtml(c)).join('\n')
  const baseTag = baseUrl ? `<base href="${esc(baseUrl)}">` : ''

  // 判断是否有 map-3d 组件
  const hasMap3d = state.components.some(c => c.type === 'map-3d' && c.props.centerLng != null)

  // 注入密钥 + Cesium 预加载（仅当有 map-3d 组件时）
  const map3dHead = hasMap3d ? `
<script type="module">
  // 从父窗口获取密钥（预览页用 window.open 打开，可访问 opener）
  if (window.opener && window.opener.__map3dKeys) {
    window.__tiandituKey = window.opener.__map3dKeys.tiandituKey || '';
    window.__ionToken = window.opener.__map3dKeys.ionToken || '';
  }
  window.__map3dCount = 0;
</script>
<link rel="stylesheet" href="https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Widgets/widgets.css">
` : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
${baseTag}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>成果预览</title>
${map3dHead}
<style>
...
```

- [ ] **Step 3: 在 `buildAndOpen` 中将密钥暴露给子窗口**

修改 `buildAndOpen` 函数，在打开预览前设置 `window.__map3dKeys`：

```js
export function buildAndOpen(state) {
  // 将密钥暴露给预览子窗口（通过 opener 访问）
  import('./map3d/mapConfig.js').then(m => {
    window.__map3dKeys = {
      tiandituKey: m.getTiandituKey(),
      ionToken: m.getIonToken(),
    }
  })

  const html = buildPreviewHtml(state, window.location.origin + '/')
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
```

- [ ] **Step 4: 处理 `CESIUM_SCENE_URL`**

由于 `buildPreviewHtml` 生成的是静态 HTML，`cesiumScene.js` 在预览页中通过动态 import 加载。开发环境通过 Vite dev server 提供，生产环境构建为独立 chunk。

开发环境取值简化方案：在 `buildPreviewHtml` 中将 `CESIUM_SCENE_URL` 替换为：

```js
// 开发环境：通过 import.meta.url 计算 cesiumScene.js 的 dev server URL
// 简化：使用相对路径 + base tag（base tag 已设置为 origin + '/'）
const CESIUM_SCENE_URL = '/src/modules/builder/editor/map3d/cesiumScene.js'
```

但这个路径在开发环境可以通过 Vite 的模块转换（Vite 会处理 `/src/...` 路径），而生产环境需要对应构建产物。

**务实处理**：在 `buildPreviewHtml` 中，将 `CESIUM_SCENE_URL` 替换逻辑简化为：

```js
function renderComponentHtml(c) {
  // ... 对于 map-3d case，使用 CESIUM_SCENE_URL 占位符
  // 在 buildPreviewHtml 中统一替换
}
```

实际在 `renderComponentHtml` 中使用占位符 `__CESIUM_SCENE_URL__`，然后在 `buildPreviewHtml` 中统一替换：

```js
// buildPreviewHtml 中：
const isDev = import.meta.env.DEV
const cesiumSceneUrl = isDev
  ? '/src/modules/builder/editor/map3d/cesiumScene.js'
  : '/assets/cesiumScene.js'  // 生产构建产物路径（由 vite.config.js 确定）

const componentsHtml = state.components
  .map(c => renderComponentHtml(c))
  .join('\n')
  .replace(/__CESIUM_SCENE_URL__/g, cesiumSceneUrl)
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/builder/editor/buildPreview.js
git commit -m "feat: add map-3d preview HTML generation with dynamic Cesium import"
```

---

### Task 11: 构建配置

**Files:**
- Modify: `package.json:1-37` — 新增 `cesium` 依赖
- Modify: `vite.config.js:1-18` — 配置 Cesium 静态资源 + cesiumScene 独立入口

- [ ] **Step 1: 安装 cesium 依赖**

```bash
npm install cesium@^1.118
```

- [ ] **Step 2: 配置 `vite.config.js`**

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    vue(),
    // 复制 Cesium 静态资源到 public/
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/cesium/Build/Cesium/Workers/*',
          dest: 'cesium/Workers',
        },
        {
          src: 'node_modules/cesium/Build/Cesium/Assets/*',
          dest: 'cesium/Assets',
        },
        {
          src: 'node_modules/cesium/Build/Cesium/Widgets/*',
          dest: 'cesium/Widgets',
        },
      ],
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  define: {
    // Cesium 需要全局 CESIUM_BASE_URL
    CESIUM_BASE_URL: JSON.stringify('/cesium'),
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        // cesiumScene 作为独立入口（预览页按需加载）
        cesiumScene: fileURLToPath(new URL('./src/modules/builder/editor/map3d/cesiumScene.js', import.meta.url)),
      },
      output: {
        // 独立 chunk 命名
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'cesiumScene'
            ? 'assets/cesiumScene.[hash].js'
            : 'assets/[name].[hash].js'
        },
      },
    },
  },
})
```

注意：需要安装 `vite-plugin-static-copy`：

```bash
npm install -D vite-plugin-static-copy
```

如果不想引入新 devDep，也可以手动在 `public/` 下建 cesium 目录并复制文件（用 npm `postinstall` 脚本）。

**替代方案（不引入额外插件）**：在 `package.json` 中添加 postinstall 脚本：

```json
"scripts": {
  "postinstall": "node scripts/copy-cesium-assets.js",
  ...
}
```

创建 `scripts/copy-cesium-assets.js`：

```js
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cesiumBase = join(__dirname, '..', 'node_modules', 'cesium', 'Build', 'Cesium')
const publicCesium = join(__dirname, '..', 'public', 'cesium')

if (existsSync(cesiumBase)) {
  mkdirSync(publicCesium, { recursive: true })
  for (const dir of ['Workers', 'Assets', 'Widgets']) {
    const src = join(cesiumBase, dir)
    const dest = join(publicCesium, dir)
    if (existsSync(src)) {
      cpSync(src, dest, { recursive: true })
      console.log(`[postinstall] 已复制 cesium/${dir} → public/cesium/${dir}`)
    }
  }
}
```

使用此替代方案时，`vite.config.js` 不需要 `viteStaticCopy` 插件和 `define.CESIUM_BASE_URL`。

**推荐使用替代方案（更简洁，不引入额外插件依赖）**。

- [ ] **Step 3: 更新 vite.config.js（简洁版，不用额外插件）**

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        cesiumScene: fileURLToPath(new URL('./src/modules/builder/editor/map3d/cesiumScene.js', import.meta.url)),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'cesiumScene'
            ? 'assets/cesiumScene.[hash].js'
            : 'assets/[name].[hash].js'
        },
      },
    },
  },
})
```

- [ ] **Step 4: 运行一次 postinstall 脚本确认复制成功**

```bash
node scripts/copy-cesium-assets.js
```

验证 `public/cesium/Workers/`, `public/cesium/Assets/`, `public/cesium/Widgets/` 存在。

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.js scripts/copy-cesium-assets.js public/cesium/
git commit -m "build: add cesium dependency, vite config for static assets and cesiumScene chunk"
```

---

### Task 12: 集成测试与收尾验证

**Files:**
- Create: `src/__tests__/builder-tianditu.test.js`（Task 3 已创建）
- Modify: `src/__tests__/builder-componentFactory.test.js`（Task 7 已修改）

（`cesiumScene.js` 不在此做单元测试——涉及 WebGL/Canvas，jsdom 无法有效模拟；靠手动验证清单覆盖。）

- [ ] **Step 1: 运行全量测试**

```bash
npx vitest run
```
预期：所有已有测试仍然 PASS，新增测试 PASS

- [ ] **Step 2: 确认 dev server 可正常启动**

```bash
npm run dev
```
预期：无编译错误，页面正常加载

- [ ] **Step 3: 确认后端可正常启动**

```bash
npm run server
```
预期：无启动错误，`/api/config` 返回 200

- [ ] **Step 4: 手动验证清单**

按照 spec 第 10 节逐项验证：

- [ ] 从组件库拖入「村庄 3D 地形图」→ 画布出现灰色占位框
- [ ] 属性面板搜索村名 → 弹出候选列表 → 选择后 4 个字段全部写入
- [ ] 编辑态：切换村庄 → 静态图 URL 更新
- [ ] 编辑态：拖动/调整尺寸 → 无卡顿
- [ ] 点击预览按钮 → 新窗口打开，Cesium 加载，飞行到目标村庄，看到地形隆起
- [ ] 预览态：鼠标滚轮缩放 → 视角在 500m–5km 内变化
- [ ] 预览态：鼠标右键拖 → 视角旋转/倾斜
- [ ] 属性面板调地形夸张滑块 → 保存并再次预览 → 隆起程度变化
- [ ] 关闭范围圆 → 预览态圆消失；调整半径 → 圆变大变小
- [ ] 一个画布放 3 个 map-3d 组件 → 预览时全部正常渲染
- [ ] 一个画布放 5 个 map-3d 组件 → 第 5 个显示「实例超限」占位
- [ ] 关闭预览窗口 → DevTools 检查主编辑器无内存增长
- [ ] 密钥错误场景（临时改坏 `.env`）→ 组件显示错误占位框 + 重试按钮
- [ ] 断网后搜索 → Toast 提示「搜索失败」
- [ ] 保存到数据库后重新加载 → 所有属性完整还原
- [ ] undo/redo 对 map-3d 属性变化有效
- [ ] 删除组件 → 无残留 DOM / 无控制台错误
- [ ] layout-box 槽位类型下拉不出现 map-3d 选项
- [ ] flow-box 同上

- [ ] **Step 5: Final commit（如有修复/微调）**

```bash
git add -A
git commit -m "chore: final integration tweaks for map-3d component"
```

---

## Self-Review

### 1. Spec Coverage

| Spec Section | Covered by Task |
|---|---|
| §1 目标与范围（拖拽、搜索、3D、零侵入） | Tasks 7-11 |
| §2 模块拆分（6 新增 + 11 修改文件） | Tasks 1-11 |
| §3 组件数据模型 | Task 7（工厂默认值） |
| §4 属性面板 UI（3 区块） | Task 8（PropertyPanel）+ Task 5（VillageSearchField） |
| §5 数据流（密钥、搜索、属性变化、生命周期） | Tasks 2, 3, 6, 9, 10 |
| §6 Cesium 场景初始化与优化（10 步初始化 + 更新行为 + 销毁流程） | Task 4 |
| §7 错误处理（10 种场景） | Tasks 4, 6, 10 |
| §8 性能优化清单 | Tasks 4, 6, 10 |
| §9 安全考量（密钥、XSS、防抖） | Tasks 1, 2, 5, 10 |
| §10 测试策略（单元 + 手动验证 + 集成验收） | Tasks 3, 7, 12 |

### 2. Placeholder Scan

无 TBD / TODO / "implement later" / "add appropriate error handling" 等占位符。所有步骤包含实际代码。

### 3. Type Consistency

- `createMap3DComponent(x, y)` 返回的 props 字段名与 PropertyPanel 绑定、Map3DComponent watch、cesiumScene opts、buildPreview HTML 生成保持一致（`villageName`, `centerLng`, `centerLat`, `region`, `filterProvince`, `filterCity`, `terrainExaggeration`, `showRangeCircle`, `rangeRadius`, `defaultHeight`, `defaultPitch`, `minZoomHeight`, `maxZoomHeight`）
- `createScene(container, opts)` 在 cesiumScene.js 和 Map3DComponent.vue 中的调用参数一致
- `searchVillages({ name, provinceCode, cityKeyword })` 在 tianditu.js 和 VillageSearchField.vue 中一致
- `getTiandituKey()` / `getIonToken()` 在 mapConfig.js 和各调用方一致

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-13-village-3d-map-component.md`.**
