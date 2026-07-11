# 数乡计划平台 首版 实施计划

- 作者：gym

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Vue3 + Vite 搭建「乡村数字资源库」平台首版：首页作为模块化导航中枢，含一个下钻到区县级的 3D 全国地图（大地金风格），点击村庄散点跳转村庄主页；模块可插拔，新增模块无需改动既有代码。

**Architecture:** 单页应用（Vue3 + Vue Router）。首页读取 `modules.config.js` 模块清单自动渲染入口卡片；路由用 `import.meta.glob` 自动收集各 `modules/*/routes.js`。地图用 ECharts-GL 递归下钻（全国→省→市→区县），数据来自本地 `src/data/villages.json`（核心字段 + 扩展区）。

**Tech Stack:** Vue 3、Vite、Vue Router 4、ECharts + ECharts-GL、Vitest（测试）。Node v24 / npm 11。

**参考设计文档:** `docs/superpowers/specs/2026-07-02-shuxiang-platform-design.md`

---

## 文件结构总览

实施后 `src/` 下的关键文件与职责：

| 文件 | 职责 |
|---|---|
| `src/main.js` | 创建 Vue app、挂载 router |
| `src/App.vue` | 根组件：Header + `<router-view>` + Footer |
| `src/modules.config.js` | 模块清单（唯一登记处），导出 `modules` 数组 |
| `src/router/index.js` | 静态路由 + `import.meta.glob` 自动收集模块路由 |
| `src/views/HomeView.vue` | 首页中枢：3D 地图 + 模块入口卡 |
| `src/components/ChinaMap3D.vue` | 3D 下钻地图核心组件 |
| `src/components/ModuleCard.vue` | 首页模块入口卡片 |
| `src/components/SiteHeader.vue` / `SiteFooter.vue` | 站点页眉页脚 |
| `src/lib/mapDrill.js` | 下钻状态机（纯逻辑，可单测） |
| `src/lib/villages.js` | 村庄数据读取与「村庄→地图散点」映射（纯函数，可单测） |
| `src/data/villages.json` | 村庄示例数据 |
| `src/assets/geo/*.json` | 行政区 geoJSON（按需） |
| `src/assets/theme/earth-gold.js` | 大地金主题色变量 |
| `src/modules/villages/` | 村庄模块（列表 + 详情 + routes.js） |
| `src/modules/_template/` | 新模块脚手架 |

> 注意：本项目将新建在仓库根目录 `d:/UserFolders/Desktop/shuxiang/` 下（与 `docs/`、`DigitalVillageInitiative/` 平级）。所有 `src/`、`package.json` 等直接放根目录。

---

## Task 1: 初始化 Vite + Vue3 工程

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/App.vue`
- Create: `vitest.config.js`

- [ ] **Step 1: 创建 package.json**

在仓库根目录创建 `package.json`：

```json
{
  "name": "shuxiang-platform",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "vue": "^3.5.13",
    "vue-router": "^4.5.0",
    "echarts": "^5.5.1",
    "echarts-gl": "^2.0.9"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.1",
    "vite": "^6.0.7",
    "vitest": "^2.1.8",
    "@vue/test-utils": "^2.4.6",
    "jsdom": "^25.0.1"
  }
}
```

- [ ] **Step 2: 安装依赖**

Run: `npm install`
Expected: 生成 `node_modules/` 与 `package-lock.json`，无 error。

- [ ] **Step 3: 创建 vite.config.js**

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
```

- [ ] **Step 4: 创建 vitest.config.js**

```js
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: { environment: 'jsdom', globals: true },
})
```

- [ ] **Step 5: 创建 index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>数乡计划 · 乡村数字资源库</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 6: 创建 src/App.vue（临时占位，Task 5 会替换内容）**

```vue
<template>
  <div id="app-root">
    <router-view />
  </div>
</template>

<script setup></script>
```

- [ ] **Step 7: 创建 src/main.js（临时，Task 3 接入 router）**

```js
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 8: 启动 dev server 验证**

Run: `npm run dev`
Expected: 输出 `Local: http://localhost:5173/`，浏览器打开无报错（此时页面空白正常）。确认后 Ctrl+C 停止。

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.js vitest.config.js index.html src/main.js src/App.vue
git commit -m "chore: 初始化 Vue3+Vite 工程脚手架"
```

---

## Task 2: 模块清单 modules.config.js

**Files:**
- Create: `src/modules.config.js`
- Test: `src/__tests__/modules.config.test.js`

- [ ] **Step 1: 写失败测试**

`src/__tests__/modules.config.test.js`：

```js
import { describe, it, expect } from 'vitest'
import { modules } from '@/modules.config.js'

describe('modules.config', () => {
  it('是一个非空数组', () => {
    expect(Array.isArray(modules)).toBe(true)
    expect(modules.length).toBeGreaterThan(0)
  })

  it('每个模块含 id/name/icon/path/enabled 字段', () => {
    for (const m of modules) {
      expect(typeof m.id).toBe('string')
      expect(typeof m.name).toBe('string')
      expect(typeof m.icon).toBe('string')
      expect(m.path.startsWith('/')).toBe(true)
      expect(typeof m.enabled).toBe('boolean')
    }
  })

  it('模块 id 唯一', () => {
    const ids = modules.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- modules.config`
Expected: FAIL（找不到 `@/modules.config.js`）。

- [ ] **Step 3: 创建 src/modules.config.js**

```js
// 平台模块清单：新增模块只需在此加一条记录。
// 首页据此渲染入口卡片；路由据 modules/<id>/routes.js 自动收集。
export const modules = [
  { id: 'villages', name: '村庄主页', icon: '🏘️', path: '/villages', enabled: true, desc: '各村数字主页与资源' },
  { id: 'ranking', name: '资源榜单', icon: '🏆', path: '/ranking', enabled: false, desc: '村庄资源排行（建设中）' },
  { id: 'people', name: '人物故事', icon: '👤', path: '/people', enabled: false, desc: '乡村人物纪实（建设中）' },
  { id: 'media', name: '影像库', icon: '🎬', path: '/media', enabled: false, desc: '照片与短视频（建设中）' },
]
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- modules.config`
Expected: PASS（3 个用例）。

- [ ] **Step 5: Commit**

```bash
git add src/modules.config.js src/__tests__/modules.config.test.js
git commit -m "feat: 模块清单 modules.config.js + 校验测试"
```

---

## Task 3: 路由（自动收集模块路由）

**Files:**
- Create: `src/router/index.js`
- Modify: `src/main.js`
- Create: `src/views/NotFoundView.vue`

- [ ] **Step 1: 创建 NotFoundView 占位**

`src/views/NotFoundView.vue`：

```vue
<template>
  <section style="padding: 4rem 2rem; text-align: center;">
    <h2>页面不存在或模块尚未上线</h2>
    <router-link to="/">返回首页</router-link>
  </section>
</template>

<script setup></script>
```

- [ ] **Step 2: 创建 src/views/HomeView.vue 占位（Task 6 完善）**

```vue
<template>
  <section><h1>数乡计划</h1></section>
</template>

<script setup></script>
```

- [ ] **Step 3: 创建 src/router/index.js**

```js
import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

// 自动收集所有模块的路由定义：src/modules/<id>/routes.js 需默认导出路由数组
const moduleRouteFiles = import.meta.glob('../modules/*/routes.js', { eager: true })
const moduleRoutes = Object.values(moduleRouteFiles).flatMap((mod) => mod.default || [])

const routes = [
  { path: '/', name: 'home', component: HomeView },
  ...moduleRoutes,
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
```

> 使用 `createWebHashHistory`：便于直接以静态文件方式部署（无需服务器 rewrite），适合学生团队部署到 GitHub Pages 等。

- [ ] **Step 4: 更新 src/main.js 接入 router**

```js
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'

createApp(App).use(router).mount('#app')
```

- [ ] **Step 5: 启动验证**

Run: `npm run dev`
Expected: 访问 `http://localhost:5173/#/` 显示「数乡计划」；访问 `#/nonexistent` 显示 NotFound 页。Ctrl+C 停止。

- [ ] **Step 6: Commit**

```bash
git add src/router/index.js src/main.js src/views/NotFoundView.vue src/views/HomeView.vue
git commit -m "feat: 路由 + 模块路由自动收集机制"
```

---

## Task 4: 新模块脚手架 _template + villages 模块骨架

**Files:**
- Create: `src/modules/_template/routes.js`, `src/modules/_template/IndexView.vue`
- Create: `src/modules/villages/routes.js`, `src/modules/villages/VillageListView.vue`, `src/modules/villages/VillageDetailView.vue`
- Test: `src/__tests__/router-modules.test.js`

- [ ] **Step 1: 创建 _template/IndexView.vue**

```vue
<template>
  <section style="padding: 3rem 2rem;">
    <h2>{{ title }}</h2>
    <p>这是新模块脚手架。复制 modules/_template 目录并改名即可创建新模块。</p>
  </section>
</template>

<script setup>
const title = '新模块模板'
</script>
```

- [ ] **Step 2: 创建 _template/routes.js**

> 注意：`_template` 目录以下划线开头，Task 3 的 glob `../modules/*/routes.js` 会匹配到它。为避免模板污染真实路由，模板的 routes 默认导出空数组。

```js
// 新模块脚手架。复制本目录改名为 <你的模块id>，再把下方 path/component 换成真实内容，
// 并在 src/modules.config.js 增加一条记录。
export default []
```

- [ ] **Step 3: 创建 villages 模块的两个视图（占位，Task 8/9 完善）**

`src/modules/villages/VillageListView.vue`：

```vue
<template>
  <section style="padding: 2rem;"><h2>村庄列表</h2></section>
</template>

<script setup></script>
```

`src/modules/villages/VillageDetailView.vue`：

```vue
<template>
  <section style="padding: 2rem;"><h2>村庄主页</h2></section>
</template>

<script setup></script>
```

- [ ] **Step 4: 创建 villages/routes.js**

```js
import VillageListView from './VillageListView.vue'
import VillageDetailView from './VillageDetailView.vue'

export default [
  { path: '/villages', name: 'village-list', component: VillageListView },
  { path: '/villages/:id', name: 'village-detail', component: VillageDetailView },
]
```

- [ ] **Step 5: 写测试验证模块路由被收集**

`src/__tests__/router-modules.test.js`：

```js
import { describe, it, expect } from 'vitest'
import { router } from '@/router/index.js'

describe('router 模块自动收集', () => {
  it('包含 villages 模块的列表与详情路由', () => {
    const names = router.getRoutes().map((r) => r.name)
    expect(names).toContain('village-list')
    expect(names).toContain('village-detail')
  })

  it('包含首页与 not-found 兜底路由', () => {
    const names = router.getRoutes().map((r) => r.name)
    expect(names).toContain('home')
    expect(names).toContain('not-found')
  })
})
```

- [ ] **Step 6: 运行测试**

Run: `npm test -- router-modules`
Expected: PASS（2 个用例）。

- [ ] **Step 7: Commit**

```bash
git add src/modules/
git add src/__tests__/router-modules.test.js
git commit -m "feat: 新模块脚手架 _template + villages 模块骨架与路由收集测试"
```

---

## Task 5: 大地金主题 + 页眉页脚

**Files:**
- Create: `src/assets/theme/earth-gold.js`, `src/assets/theme/theme.css`
- Create: `src/components/SiteHeader.vue`, `src/components/SiteFooter.vue`

- [ ] **Step 1: 创建主题色变量 src/assets/theme/earth-gold.js**

> ECharts 的 backgroundColor 只接受纯色或渐变对象，不接受 CSS 渐变字符串，故主题拆成「JS 变量（喂给 ECharts）」与「CSS 变量（喂给页面）」两份。

```js
// 大地金主题：暖褐底 + 金橙发光。JS 变量供 ECharts-GL 使用。
export const earthGold = {
  bg: '#120c06',            // 页面/画布深褐底
  bgSoft: '#2a1f14',        // 次级背景
  regionTop: '#c8963f',     // 地图块顶面
  regionBottom: '#8a5a1f',  // 地图块底面
  border: '#e0b45f',        // 发光边框
  glow: 'rgba(224,180,95,.45)',
  scatter: '#ffcf6b',       // 村庄散点
  scatterGlow: '#ffe6a8',
  text: '#f3e6cf',
  textDim: '#a98c5f',
}
```

- [ ] **Step 2: 创建 src/assets/theme/theme.css**

```css
:root {
  --sx-bg: #120c06;
  --sx-bg-soft: #2a1f14;
  --sx-gold: #e0b45f;
  --sx-gold-soft: #ffcf6b;
  --sx-text: #f3e6cf;
  --sx-text-dim: #a98c5f;
  --sx-border: #3a2c18;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--sx-bg);
  color: var(--sx-text);
  font-family: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
}
a { color: var(--sx-gold-soft); text-decoration: none; }
a:hover { text-decoration: underline; }
```

- [ ] **Step 3: 创建 src/components/SiteHeader.vue**

```vue
<template>
  <header class="site-header">
    <router-link to="/" class="brand">数乡计划</router-link>
    <nav class="nav">
      <router-link to="/">首页</router-link>
      <router-link to="/villages">村庄列表</router-link>
    </nav>
  </header>
</template>

<script setup></script>

<style scoped>
.site-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.9rem 1.6rem;
  border-bottom: 1px solid var(--sx-border);
  background: var(--sx-bg-soft);
}
.brand { font-weight: 700; font-size: 1.15rem; color: var(--sx-gold); }
.nav a { margin-left: 1.2rem; color: var(--sx-text-dim); }
.nav a.router-link-active { color: var(--sx-gold-soft); }
</style>
```

- [ ] **Step 4: 创建 src/components/SiteFooter.vue**

```vue
<template>
  <footer class="site-footer">
    数乡计划 · 乡村数字资源库 · 大学生社会实践项目
  </footer>
</template>

<script setup></script>

<style scoped>
.site-footer {
  padding: 1.4rem; text-align: center;
  color: var(--sx-text-dim); font-size: 0.85rem;
  border-top: 1px solid var(--sx-border);
}
</style>
```

- [ ] **Step 5: 更新 src/App.vue 接入主题与页眉页脚**

```vue
<template>
  <SiteHeader />
  <main><router-view /></main>
  <SiteFooter />
</template>

<script setup>
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import '@/assets/theme/theme.css'
</script>
```

- [ ] **Step 6: 启动验证**

Run: `npm run dev`
Expected: 页面出现深褐底 + 金色「数乡计划」页眉、页脚；导航链接可点。Ctrl+C 停止。

- [ ] **Step 7: Commit**

```bash
git add src/assets/theme/ src/components/SiteHeader.vue src/components/SiteFooter.vue src/App.vue
git commit -m "feat: 大地金主题 + 页眉页脚布局"
```

## Task 6: 村庄示例数据 + 数据校验

**Files:**
- Create: `src/data/villages.json`
- Create: `src/lib/villages.js`
- Test: `src/__tests__/villages.test.js`

- [ ] **Step 1: 创建 src/data/villages.json（示例数据，实地采集后替换）**

> 经纬度为大致坐标、adcode 为区县行政编码（匹配 DataV.GeoAtlas geoJSON）。实施阶段核对准确性。

```json
[
  { "id": "xiaozhuwan", "name": "小朱湾村", "fullName": "武汉市江夏区小朱湾村", "province": "湖北省", "city": "武汉市", "district": "江夏区", "adcode": "420115", "coord": [114.32, 30.34], "type": "文旅基础", "summary": "近郊乡村数字主页样板", "cover": "", "status": "样板试点", "extra": { "history": [], "people": [], "resources": [], "media": [], "route": [], "outcomes": [] } },
  { "id": "dayuwan", "name": "大余湾村", "fullName": "武汉市黄陂区大余湾村", "province": "湖北省", "city": "武汉市", "district": "黄陂区", "adcode": "420116", "coord": [114.47, 31.16], "type": "古村落", "summary": "明清古建筑群传统村落", "cover": "", "status": "候选村", "extra": { "history": [], "people": [], "resources": [], "media": [], "route": [], "outcomes": [] } },
  { "id": "liujiaqiao", "name": "刘家桥村", "fullName": "咸宁市咸安区刘家桥村", "province": "湖北省", "city": "咸宁市", "district": "咸安区", "adcode": "421202", "coord": [114.24, 29.78], "type": "古村落", "summary": "刘氏聚居古村与廊桥", "cover": "", "status": "候选村", "extra": { "history": [], "people": [], "resources": [], "media": [], "route": [], "outcomes": [] } },
  { "id": "yangloudong", "name": "羊楼洞村", "fullName": "咸宁市赤壁市羊楼洞村", "province": "湖北省", "city": "咸宁市", "district": "赤壁市", "adcode": "421281", "coord": [113.78, 29.63], "type": "茶文化", "summary": "万里茶道源头古镇", "cover": "", "status": "候选村", "extra": { "history": [], "people": [], "resources": [], "media": [], "route": [], "outcomes": [] } },
  { "id": "pengjiazhai", "name": "彭家寨", "fullName": "恩施州宣恩县彭家寨", "province": "湖北省", "city": "恩施土家族苗族自治州", "district": "宣恩县", "adcode": "422825", "coord": [109.49, 29.98], "type": "民族村寨", "summary": "土家吊脚楼建筑群", "cover": "", "status": "候选村", "extra": { "history": [], "people": [], "resources": [], "media": [], "route": [], "outcomes": [] } },
  { "id": "xinghua", "name": "杏花村", "fullName": "十堰市郧西县杏花村", "province": "湖北省", "city": "十堰市", "district": "郧西县", "adcode": "420322", "coord": [110.42, 32.99], "type": "农旅融合", "summary": "田园农旅示范村", "cover": "", "status": "候选村", "extra": { "history": [], "people": [], "resources": [], "media": [], "route": [], "outcomes": [] } }
]
```

- [ ] **Step 2: 写失败测试 src/__tests__/villages.test.js**

```js
import { describe, it, expect } from 'vitest'
import villages from '@/data/villages.json'
import { validateVillages, toScatterPoints, filterByRegion } from '@/lib/villages.js'

const CORE = ['id', 'name', 'fullName', 'province', 'city', 'district', 'adcode', 'coord', 'type', 'summary', 'status']

describe('villages 数据与库函数', () => {
  it('示例数据每条含全部核心字段且 coord 为 [lng,lat]', () => {
    const errors = validateVillages(villages, CORE)
    expect(errors).toEqual([])
  })

  it('id 唯一', () => {
    const ids = villages.map((v) => v.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('toScatterPoints 生成 {name,value:[lng,lat],id} 数组，跳过缺 coord 的村', () => {
    const pts = toScatterPoints([
      { id: 'a', name: 'A', coord: [100, 30] },
      { id: 'b', name: 'B', coord: null },
    ])
    expect(pts).toEqual([{ name: 'A', value: [100, 30], id: 'a' }])
  })

  it('filterByRegion 按 province 过滤', () => {
    const out = filterByRegion(villages, { level: 'province', name: '湖北省' })
    expect(out.length).toBe(villages.length)
    expect(filterByRegion(villages, { level: 'province', name: '河南省' })).toEqual([])
  })

  it('filterByRegion level=country 返回全部', () => {
    expect(filterByRegion(villages, { level: 'country' }).length).toBe(villages.length)
  })
})
```

- [ ] **Step 3: 运行确认失败**

Run: `npm test -- villages`
Expected: FAIL（`@/lib/villages.js` 不存在）。

- [ ] **Step 4: 创建 src/lib/villages.js**

```js
// 村庄数据纯函数：校验、地图散点映射、按行政层级过滤。无副作用，可单测。

const REGION_KEY = { province: 'province', city: 'city', district: 'district' }

export function validateVillages(list, coreFields) {
  const errors = []
  list.forEach((v, i) => {
    for (const f of coreFields) {
      if (v[f] === undefined || v[f] === null || v[f] === '') {
        errors.push(`第 ${i} 条(${v.name || v.id || '未知'}) 缺字段: ${f}`)
      }
    }
    if (v.coord && (!Array.isArray(v.coord) || v.coord.length !== 2)) {
      errors.push(`第 ${i} 条(${v.name}) coord 应为 [lng,lat]`)
    }
  })
  return errors
}

export function toScatterPoints(list) {
  return list
    .filter((v) => Array.isArray(v.coord) && v.coord.length === 2)
    .map((v) => ({ name: v.name, value: [v.coord[0], v.coord[1]], id: v.id }))
}

// region: { level: 'country'|'province'|'city'|'district', name?: string }
export function filterByRegion(list, region) {
  if (!region || region.level === 'country') return list
  const key = REGION_KEY[region.level]
  if (!key) return list
  return list.filter((v) => v[key] === region.name)
}
```

- [ ] **Step 5: 运行确认通过**

Run: `npm test -- villages`
Expected: PASS（5 个用例）。

- [ ] **Step 6: Commit**

```bash
git add src/data/villages.json src/lib/villages.js src/__tests__/villages.test.js
git commit -m "feat: 村庄示例数据 + 数据校验与散点映射纯函数"
```

## Task 7: 下钻状态机 mapDrill.js

**Files:**
- Create: `src/lib/mapDrill.js`
- Test: `src/__tests__/mapDrill.test.js`

> 下钻逻辑做成递归分级的纯状态机（对应设计文档 4.2）：每一级持有 level/adcode/name，进入下一级压栈、返回上级出栈、面包屑由栈生成。首版末级为区县（district）。C 阶段追加「村庄层」只需扩展 LEVELS，无需改组件。

- [ ] **Step 1: 写失败测试 src/__tests__/mapDrill.test.js**

```js
import { describe, it, expect } from 'vitest'
import { createDrill, drillDown, drillUp, goToDepth, breadcrumb, canDrill } from '@/lib/mapDrill.js'

describe('mapDrill 下钻状态机', () => {
  it('初始为全国单层', () => {
    const s = createDrill()
    expect(s.stack).toEqual([{ level: 'country', adcode: '100000', name: '全国' }])
    expect(breadcrumb(s)).toEqual(['全国'])
  })

  it('drillDown 逐级压栈 country→province→city→district', () => {
    let s = createDrill()
    s = drillDown(s, { adcode: '420000', name: '湖北省' })
    expect(s.stack.at(-1)).toEqual({ level: 'province', adcode: '420000', name: '湖北省' })
    s = drillDown(s, { adcode: '420100', name: '武汉市' })
    expect(s.stack.at(-1).level).toBe('city')
    s = drillDown(s, { adcode: '420115', name: '江夏区' })
    expect(s.stack.at(-1).level).toBe('district')
    expect(breadcrumb(s)).toEqual(['全国', '湖北省', '武汉市', '江夏区'])
  })

  it('canDrill 在区县末级为 false', () => {
    let s = createDrill()
    s = drillDown(s, { adcode: '420000', name: '湖北省' })
    s = drillDown(s, { adcode: '420100', name: '武汉市' })
    expect(canDrill(s)).toBe(true)
    s = drillDown(s, { adcode: '420115', name: '江夏区' })
    expect(canDrill(s)).toBe(false)
  })

  it('区县末级再 drillDown 不变（不越界）', () => {
    let s = createDrill()
    s = drillDown(s, { adcode: '420000', name: '湖北省' })
    s = drillDown(s, { adcode: '420100', name: '武汉市' })
    s = drillDown(s, { adcode: '420115', name: '江夏区' })
    const before = s.stack.length
    s = drillDown(s, { adcode: '999999', name: '越界' })
    expect(s.stack.length).toBe(before)
  })

  it('drillUp 出栈，全国层再 up 不变', () => {
    let s = createDrill()
    s = drillDown(s, { adcode: '420000', name: '湖北省' })
    s = drillUp(s)
    expect(breadcrumb(s)).toEqual(['全国'])
    s = drillUp(s)
    expect(breadcrumb(s)).toEqual(['全国'])
  })

  it('goToDepth 跳回指定深度（面包屑点击）', () => {
    let s = createDrill()
    s = drillDown(s, { adcode: '420000', name: '湖北省' })
    s = drillDown(s, { adcode: '420100', name: '武汉市' })
    s = goToDepth(s, 1) // 回到湖北省
    expect(breadcrumb(s)).toEqual(['全国', '湖北省'])
  })

  it('createDrill/drillDown 不修改原状态（不可变）', () => {
    const s0 = createDrill()
    const s1 = drillDown(s0, { adcode: '420000', name: '湖北省' })
    expect(s0.stack.length).toBe(1)
    expect(s1.stack.length).toBe(2)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- mapDrill`
Expected: FAIL（`@/lib/mapDrill.js` 不存在）。

- [ ] **Step 3: 创建 src/lib/mapDrill.js**

```js
// 递归分级下钻状态机（纯函数、不可变）。首版末级 district；C 阶段可在末尾加 'village'。
export const LEVELS = ['country', 'province', 'city', 'district']

export function createDrill() {
  return { stack: [{ level: 'country', adcode: '100000', name: '全国' }] }
}

function currentLevelIndex(state) {
  const top = state.stack.at(-1)
  return LEVELS.indexOf(top.level)
}

// 是否还能继续下钻（未到末级）
export function canDrill(state) {
  return currentLevelIndex(state) < LEVELS.length - 1
}

// 进入下一级：target = { adcode, name }
export function drillDown(state, target) {
  if (!canDrill(state)) return state
  const nextLevel = LEVELS[currentLevelIndex(state) + 1]
  return {
    stack: [...state.stack, { level: nextLevel, adcode: target.adcode, name: target.name }],
  }
}

// 返回上一级
export function drillUp(state) {
  if (state.stack.length <= 1) return state
  return { stack: state.stack.slice(0, -1) }
}

// 跳到指定深度（0 = 全国）。用于面包屑点击。
export function goToDepth(state, depth) {
  if (depth < 0 || depth >= state.stack.length) return state
  return { stack: state.stack.slice(0, depth + 1) }
}

export function current(state) {
  return state.stack.at(-1)
}

export function breadcrumb(state) {
  return state.stack.map((f) => f.name)
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- mapDrill`
Expected: PASS（7 个用例）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/mapDrill.js src/__tests__/mapDrill.test.js
git commit -m "feat: 递归分级下钻状态机 mapDrill（纯函数 + 单测）"
```

## Task 8: geoJSON 按需加载器 geoLoader.js

**Files:**
- Create: `src/lib/geoLoader.js`
- Test: `src/__tests__/geoLoader.test.js`

> 对应设计文档 4.3 + 7：按 adcode 按需拉取 geoJSON、带缓存、失败不崩溃。fetcher 作为依赖注入，便于单测。数据源用公开行政区划服务（DataV.GeoAtlas：`https://geo.datav.aliyun.com/areas_v3/bound/<adcode>_full.json`）；离线可换本地 `src/assets/geo/`。

- [ ] **Step 1: 写失败测试 src/__tests__/geoLoader.test.js**

```js
import { describe, it, expect, vi } from 'vitest'
import { createGeoLoader } from '@/lib/geoLoader.js'

describe('geoLoader', () => {
  it('成功拉取并按 adcode 缓存（第二次不再请求）', async () => {
    const fake = { type: 'FeatureCollection', features: [] }
    const fetcher = vi.fn().mockResolvedValue(fake)
    const loader = createGeoLoader({ fetcher })
    const a = await loader.load('420000')
    const b = await loader.load('420000')
    expect(a).toBe(fake)
    expect(b).toBe(fake)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('拉取失败返回 null 且不抛出，记录失败 adcode', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network'))
    const errs = []
    const loader = createGeoLoader({ fetcher, onError: (adcode) => errs.push(adcode) })
    const r = await loader.load('999999')
    expect(r).toBe(null)
    expect(errs).toEqual(['999999'])
  })

  it('urlFor 生成 DataV 地址', () => {
    const loader = createGeoLoader({ fetcher: vi.fn() })
    expect(loader.urlFor('420000')).toContain('420000_full.json')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- geoLoader`
Expected: FAIL（`@/lib/geoLoader.js` 不存在）。

- [ ] **Step 3: 创建 src/lib/geoLoader.js**

```js
// geoJSON 按需加载 + 缓存 + 容错。fetcher 可注入（默认走 fetch），便于单测。
const DATAV = (adcode) => `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`

async function defaultFetcher(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function createGeoLoader({ fetcher = defaultFetcher, urlFor = DATAV, onError } = {}) {
  const cache = new Map()
  return {
    urlFor,
    async load(adcode) {
      if (cache.has(adcode)) return cache.get(adcode)
      try {
        const geo = await fetcher(urlFor(adcode))
        cache.set(adcode, geo)
        return geo
      } catch (e) {
        // 不崩溃：记录失败 adcode，返回 null，调用方保留当前层级
        if (onError) onError(adcode, e)
        else console.error(`[geoLoader] 加载 ${adcode} 失败:`, e)
        return null
      }
    },
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- geoLoader`
Expected: PASS（3 个用例）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/geoLoader.js src/__tests__/geoLoader.test.js
git commit -m "feat: geoJSON 按需加载器（缓存 + 容错 + 单测）"
```

## Task 9: 核心组件 ChinaMap3D.vue

**Files:**
- Create: `src/components/ChinaMap3D.vue`
- Test: `src/__tests__/ChinaMap3D.test.js`

> ECharts-GL 依赖 WebGL/canvas，jsdom 无法真实渲染，故测试 **mock echarts**，只验证：面包屑由 drill 状态渲染、点击村庄散点 emit 事件、goToDepth 回退栈。地图视觉与下钻的真实效果靠 Task 13 手动验收。组件把「状态与交互」和「echarts 渲染」分层：状态用 mapDrill，渲染在 renderMap() 里集中调用 echarts。

- [ ] **Step 1: 写测试 src/__tests__/ChinaMap3D.test.js（mock echarts）**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// mock echarts / echarts-gl：避免真实 WebGL
const setOption = vi.fn()
const on = vi.fn()
const dispose = vi.fn()
vi.mock('echarts', () => ({
  init: vi.fn(() => ({ setOption, on, dispose, resize: vi.fn() })),
  registerMap: vi.fn(),
}))
vi.mock('echarts-gl', () => ({}))

// mock geoLoader：返回一个最小 geoJSON
vi.mock('@/lib/geoLoader.js', () => ({
  createGeoLoader: () => ({
    load: vi.fn().mockResolvedValue({ type: 'FeatureCollection', features: [] }),
    urlFor: (a) => a,
  }),
}))

import ChinaMap3D from '@/components/ChinaMap3D.vue'

const villages = [
  { id: 'xiaozhuwan', name: '小朱湾村', province: '湖北省', city: '武汉市', district: '江夏区', adcode: '420115', coord: [114.32, 30.34] },
]

function mountMap() {
  return mount(ChinaMap3D, {
    props: { villages },
    global: { stubs: { teleport: true } },
  })
}

describe('ChinaMap3D', () => {
  beforeEach(() => { setOption.mockClear(); on.mockClear() })

  it('初始渲染面包屑为「全国」', async () => {
    const w = mountMap()
    await w.vm.$nextTick()
    expect(w.text()).toContain('全国')
  })

  it('点击村庄散点 emit select-village 带村庄 id', async () => {
    const w = mountMap()
    await w.vm.$nextTick()
    w.vm.handleVillageClick({ data: { id: 'xiaozhuwan' } })
    expect(w.emitted()['select-village'][0]).toEqual(['xiaozhuwan'])
  })

  it('goToDepth 回退后面包屑收缩', async () => {
    const w = mountMap()
    await w.vm.$nextTick()
    await w.vm.enterRegion({ adcode: '420000', name: '湖北省' })
    expect(w.text()).toContain('湖北省')
    await w.vm.goToDepth(0)
    expect(w.text()).not.toContain('湖北省')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- ChinaMap3D`
Expected: FAIL（组件不存在）。

- [ ] **Step 3: 创建 src/components/ChinaMap3D.vue（模板 + 面包屑）**

```vue
<template>
  <div class="map3d">
    <nav class="breadcrumb">
      <span
        v-for="(name, i) in crumbs"
        :key="i"
        class="crumb"
        :class="{ active: i === crumbs.length - 1 }"
        @click="goToDepth(i)"
      >{{ name }}<em v-if="i < crumbs.length - 1"> / </em></span>
    </nav>
    <div v-if="loadError" class="map-error">地图数据加载失败，已停留在当前层级。</div>
    <div ref="chartEl" class="chart"></div>
  </div>
</template>
```

- [ ] **Step 4: 追加 `<script setup>`（状态 + 渲染 + 交互）到同一文件**

```vue
<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import 'echarts-gl'
import { createDrill, drillDown, goToDepth as _goToDepth, current, breadcrumb, canDrill } from '@/lib/mapDrill.js'
import { createGeoLoader } from '@/lib/geoLoader.js'
import { toScatterPoints, filterByRegion } from '@/lib/villages.js'
import { earthGold as T } from '@/assets/theme/earth-gold.js'

const props = defineProps({ villages: { type: Array, default: () => [] } })
const emit = defineEmits(['select-village'])

const chartEl = ref(null)
const crumbs = ref(['全国'])
const loadError = ref(false)
let chart = null
let drill = createDrill()
const geo = createGeoLoader({ onError: () => { loadError.value = true } })
// 记录当前 geoJSON 中「区域名 → adcode」，用于点击地图块时下钻
let nameToAdcode = {}

function syncCrumbs() { crumbs.value = breadcrumb(drill) }

async function renderMap() {
  const cur = current(drill)
  const mapName = cur.name
  const gj = await geo.load(cur.adcode)
  if (!gj) return // 加载失败：保留当前层级，loadError 已置位
  loadError.value = false
  echarts.registerMap(mapName, gj)
  nameToAdcode = {}
  for (const f of gj.features || []) {
    const p = f.properties || {}
    if (p.name && p.adcode != null) nameToAdcode[p.name] = String(p.adcode)
  }
  const pts = toScatterPoints(filterByRegion(props.villages, cur))
  chart.setOption({
    backgroundColor: T.bg,
    geo3D: {
      map: mapName,
      roam: true,
      itemStyle: { color: T.regionBottom, borderColor: T.border, borderWidth: 1 },
      emphasis: { itemStyle: { color: T.regionTop } },
      regionHeight: 3,
      light: { main: { intensity: 1.2 }, ambient: { intensity: 0.3 } },
      viewControl: { distance: 120, alpha: 55 },
    },
    series: [
      {
        type: 'scatter3D',
        coordinateSystem: 'geo3D',
        data: pts,
        symbolSize: 10,
        itemStyle: { color: T.scatter, opacity: 1 },
        emphasis: { itemStyle: { color: T.scatterGlow } },
        label: { show: false, formatter: (p) => p.name },
      },
    ],
  }, true)
}

// 进入某区域（点击地图块或程序调用）
async function enterRegion(target) {
  if (!canDrill(drill)) return
  drill = drillDown(drill, target)
  syncCrumbs()
  await renderMap()
}

async function goToDepth(depth) {
  drill = _goToDepth(drill, depth)
  syncCrumbs()
  await renderMap()
}

function handleRegionClick(params) {
  const adcode = nameToAdcode[params.name]
  if (adcode) enterRegion({ adcode, name: params.name })
}

function handleVillageClick(params) {
  const id = params?.data?.id
  if (id) emit('select-village', id)
}

onMounted(async () => {
  chart = echarts.init(chartEl.value)
  chart.on('click', (params) => {
    if (params.seriesType === 'scatter3D') handleVillageClick(params)
    else if (params.componentType === 'geo3D') handleRegionClick(params)
  })
  syncCrumbs()
  await renderMap()
})

onBeforeUnmount(() => { if (chart) chart.dispose() })
watch(() => props.villages, renderMap)

// 暴露给测试
defineExpose({ enterRegion, goToDepth, handleVillageClick })
</script>

<style scoped>
.map3d { position: relative; }
.chart { width: 100%; height: 62vh; min-height: 380px; }
.breadcrumb { padding: 0.6rem 1rem; font-size: 0.95rem; }
.crumb { cursor: pointer; color: var(--sx-text-dim); }
.crumb.active { color: var(--sx-gold-soft); cursor: default; }
.crumb em { color: var(--sx-text-dim); font-style: normal; }
.map-error {
  position: absolute; top: 3rem; left: 50%; transform: translateX(-50%);
  padding: 0.5rem 1rem; background: var(--sx-bg-soft);
  border: 1px solid var(--sx-gold); border-radius: 6px; z-index: 2;
}
</style>
```

- [ ] **Step 5: 运行确认通过**

Run: `npm test -- ChinaMap3D`
Expected: PASS（3 个用例）。

- [ ] **Step 6: Commit**

```bash
git add src/components/ChinaMap3D.vue src/__tests__/ChinaMap3D.test.js
git commit -m "feat: ChinaMap3D 3D 下钻地图核心组件（面包屑/散点/下钻 + mock 测试）"
```

## Task 10: 首页中枢 HomeView + ModuleCard

**Files:**
- Create: `src/components/ModuleCard.vue`
- Modify: `src/views/HomeView.vue`
- Test: `src/__tests__/HomeView.test.js`

> 首页 = 3D 地图（上半屏）+ 模块入口卡（下半屏，从 modules.config 自动生成，只渲染 enabled=true）。点村庄散点 → 跳村庄主页。

- [ ] **Step 1: 创建 src/components/ModuleCard.vue**

```vue
<template>
  <router-link class="mod-card" :to="module.path">
    <div class="icon">{{ module.icon }}</div>
    <div class="name">{{ module.name }}</div>
    <div class="desc">{{ module.desc }}</div>
  </router-link>
</template>

<script setup>
defineProps({ module: { type: Object, required: true } })
</script>

<style scoped>
.mod-card {
  display: block; padding: 1.1rem; border: 1px solid var(--sx-border);
  border-radius: 10px; background: var(--sx-bg-soft); color: var(--sx-text);
  transition: transform .15s, border-color .15s; text-decoration: none;
}
.mod-card:hover { transform: translateY(-3px); border-color: var(--sx-gold); }
.icon { font-size: 1.8rem; }
.name { margin-top: .5rem; font-weight: 600; color: var(--sx-gold-soft); }
.desc { margin-top: .25rem; font-size: .82rem; color: var(--sx-text-dim); }
</style>
```

- [ ] **Step 2: 替换 src/views/HomeView.vue**

```vue
<template>
  <section class="home">
    <div class="hero">
      <h1>数乡计划 · 乡村数字资源库</h1>
      <p class="sub">点击地图逐级下钻，探索各地村庄</p>
    </div>
    <ChinaMap3D :villages="villages" @select-village="goVillage" />
    <div class="modules">
      <p class="label">功能模块</p>
      <div class="grid">
        <ModuleCard v-for="m in enabledModules" :key="m.id" :module="m" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import ChinaMap3D from '@/components/ChinaMap3D.vue'
import ModuleCard from '@/components/ModuleCard.vue'
import { modules } from '@/modules.config.js'
import villages from '@/data/villages.json'

const router = useRouter()
const enabledModules = computed(() => modules.filter((m) => m.enabled))
function goVillage(id) { router.push(`/villages/${id}`) }
</script>

<style scoped>
.home { max-width: 1100px; margin: 0 auto; padding: 1rem; }
.hero { text-align: center; padding: 1.2rem 0 .4rem; }
.hero h1 { color: var(--sx-gold); margin: 0; }
.hero .sub { color: var(--sx-text-dim); }
.modules { margin-top: 1.4rem; }
.modules .label { color: var(--sx-text-dim); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: .8rem; }
</style>
```

- [ ] **Step 3: 写测试 src/__tests__/HomeView.test.js**

```js
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// stub 掉重型地图组件，聚焦首页逻辑
vi.mock('@/components/ChinaMap3D.vue', () => ({
  default: { name: 'ChinaMap3D', template: '<div class="map-stub" />' },
}))
vi.mock('@/modules.config.js', () => ({
  modules: [
    { id: 'villages', name: '村庄主页', icon: '🏘️', path: '/villages', enabled: true, desc: 'x' },
    { id: 'ranking', name: '资源榜单', icon: '🏆', path: '/ranking', enabled: false, desc: 'y' },
  ],
}))
vi.mock('@/data/villages.json', () => ({ default: [] }))

import HomeView from '@/views/HomeView.vue'

const stubs = { 'router-link': { template: '<a><slot /></a>' } }

describe('HomeView 首页中枢', () => {
  it('只渲染 enabled=true 的模块卡', () => {
    const w = mount(HomeView, { global: { stubs } })
    expect(w.text()).toContain('村庄主页')
    expect(w.text()).not.toContain('资源榜单')
  })
})
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- HomeView`
Expected: PASS（1 个用例）。

- [ ] **Step 5: 启动验证**

Run: `npm run dev`
Expected: 首页显示 3D 地图 + 仅「村庄主页」一张模块卡（其余 enabled=false）。Ctrl+C 停止。

- [ ] **Step 6: Commit**

```bash
git add src/components/ModuleCard.vue src/views/HomeView.vue src/__tests__/HomeView.test.js
git commit -m "feat: 首页中枢 HomeView + 模块入口卡自动生成"
```

## Task 11: 村庄列表 + 村庄主页模板

**Files:**
- Modify: `src/modules/villages/VillageListView.vue`
- Modify: `src/modules/villages/VillageDetailView.vue`
- Create: `src/components/VillageCard.vue`
- Test: `src/__tests__/VillageDetailView.test.js`

> 详情页读 `:id` 渲染核心字段 + `extra` 各栏目；extra 为空时显示「待实地采集补充」占位（对应设计文档 7）。列表页用 VillageCard 展示全部村庄并可跳详情。

- [ ] **Step 1: 创建 src/components/VillageCard.vue**

```vue
<template>
  <router-link class="v-card" :to="`/villages/${village.id}`">
    <div class="cover" :style="coverStyle">
      <span v-if="!village.cover" class="ph">{{ village.name.slice(0, 1) }}</span>
    </div>
    <div class="body">
      <div class="name">{{ village.name }}</div>
      <div class="meta">{{ village.fullName }}</div>
      <div class="tags"><span class="tag">{{ village.type }}</span><span class="tag">{{ village.status }}</span></div>
      <p class="summary">{{ village.summary }}</p>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ village: { type: Object, required: true } })
const coverStyle = computed(() =>
  props.village.cover ? { backgroundImage: `url(${props.village.cover})` } : {}
)
</script>

<style scoped>
.v-card { display: block; border: 1px solid var(--sx-border); border-radius: 10px; overflow: hidden; background: var(--sx-bg-soft); color: var(--sx-text); }
.v-card:hover { border-color: var(--sx-gold); }
.cover { height: 130px; background: linear-gradient(135deg, #2a1f14, #120c06); background-size: cover; display: flex; align-items: center; justify-content: center; }
.cover .ph { font-size: 2.4rem; color: var(--sx-gold); opacity: .5; }
.body { padding: .8rem; }
.name { font-weight: 600; color: var(--sx-gold-soft); }
.meta { font-size: .8rem; color: var(--sx-text-dim); }
.tags { margin: .4rem 0; }
.tag { font-size: .72rem; border: 1px solid var(--sx-border); border-radius: 4px; padding: .1rem .4rem; margin-right: .3rem; color: var(--sx-text-dim); }
.summary { font-size: .85rem; margin: 0; }
</style>
```

- [ ] **Step 2: 替换 src/modules/villages/VillageListView.vue**

```vue
<template>
  <section class="list">
    <h2>村庄列表</h2>
    <div class="grid">
      <VillageCard v-for="v in villages" :key="v.id" :village="v" />
    </div>
  </section>
</template>

<script setup>
import VillageCard from '@/components/VillageCard.vue'
import villages from '@/data/villages.json'
</script>

<style scoped>
.list { max-width: 1100px; margin: 0 auto; padding: 1.5rem 1rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
</style>
```

- [ ] **Step 3: 替换 src/modules/villages/VillageDetailView.vue**

```vue
<template>
  <section v-if="village" class="detail">
    <router-link to="/villages" class="back">← 返回列表</router-link>
    <h1>{{ village.name }}</h1>
    <p class="full">{{ village.fullName }}</p>
    <div class="tags"><span class="tag">{{ village.type }}</span><span class="tag">{{ village.status }}</span></div>
    <p class="summary">{{ village.summary }}</p>

    <div v-for="sec in sections" :key="sec.key" class="section">
      <h3>{{ sec.title }}</h3>
      <p v-if="!village.extra || !(village.extra[sec.key] || []).length" class="empty">待实地采集补充</p>
      <ul v-else><li v-for="(item, i) in village.extra[sec.key]" :key="i">{{ typeof item === 'string' ? item : item.title || JSON.stringify(item) }}</li></ul>
    </div>
  </section>
  <section v-else class="detail">
    <p>未找到该村庄。<router-link to="/villages">返回列表</router-link></p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import villages from '@/data/villages.json'

const route = useRoute()
const village = computed(() => villages.find((v) => v.id === route.params.id) || null)
const sections = [
  { key: 'history', title: '村史时间线' },
  { key: 'people', title: '人物故事' },
  { key: 'resources', title: '特色资源' },
  { key: 'media', title: '影像库' },
  { key: 'route', title: '导览路线' },
  { key: 'outcomes', title: '实践成果' },
]
</script>

<style scoped>
.detail { max-width: 820px; margin: 0 auto; padding: 1.5rem 1rem; }
.back { display: inline-block; margin-bottom: 1rem; }
.full { color: var(--sx-text-dim); }
.tags { margin: .5rem 0; }
.tag { font-size: .78rem; border: 1px solid var(--sx-border); border-radius: 4px; padding: .1rem .5rem; margin-right: .4rem; color: var(--sx-text-dim); }
.section { margin-top: 1.6rem; border-top: 1px solid var(--sx-border); padding-top: .8rem; }
.section h3 { color: var(--sx-gold-soft); }
.empty { color: var(--sx-text-dim); font-style: italic; }
</style>
```

- [ ] **Step 4: 写测试 src/__tests__/VillageDetailView.test.js**

```js
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/data/villages.json', () => ({
  default: [
    { id: 'xiaozhuwan', name: '小朱湾村', fullName: '武汉市江夏区小朱湾村', type: '文旅基础', status: '样板试点', summary: '样板', extra: { history: [], people: ['张三'], resources: [], media: [], route: [], outcomes: [] } },
  ],
}))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: 'xiaozhuwan' } }) }))

import VillageDetailView from '@/modules/villages/VillageDetailView.vue'
const stubs = { 'router-link': { template: '<a><slot /></a>' } }

describe('VillageDetailView 村庄主页', () => {
  it('渲染核心字段', () => {
    const w = mount(VillageDetailView, { global: { stubs } })
    expect(w.text()).toContain('小朱湾村')
    expect(w.text()).toContain('武汉市江夏区小朱湾村')
  })
  it('空 extra 栏目显示占位，非空显示内容', () => {
    const w = mount(VillageDetailView, { global: { stubs } })
    expect(w.text()).toContain('张三')          // people 非空
    expect(w.text()).toContain('待实地采集补充')  // 其它空栏目
  })
})
```

- [ ] **Step 5: 运行确认通过**

Run: `npm test -- VillageDetailView`
Expected: PASS（2 个用例）。

- [ ] **Step 6: Commit**

```bash
git add src/components/VillageCard.vue src/modules/villages/ src/__tests__/VillageDetailView.test.js
git commit -m "feat: 村庄列表 + 村庄主页模板（核心字段 + extra 栏目占位）"
```

## Task 12: 全量测试 + 手动验收 + 收尾

**Files:**
- Modify: `src/modules/_template/IndexView.vue`（补一句 README 式说明，可选）
- Create: `README.md`

- [ ] **Step 1: 跑全量单测**

Run: `npm test`
Expected: 全部 PASS（modules.config / router-modules / villages / mapDrill / geoLoader / ChinaMap3D / HomeView / VillageDetailView）。若失败，按报错定位对应 Task 修复后重跑。

- [ ] **Step 2: 构建验证**

Run: `npm run build`
Expected: 无 error，生成 `dist/`。

- [ ] **Step 3: 手动验收核心链路（需联网加载 geoJSON）**

Run: `npm run dev`，浏览器打开 `http://localhost:5173/#/`，逐项确认：
- [ ] 首页显示大地金 3D 地图 + 「村庄主页」模块卡
- [ ] 点击地图「湖北省」→ 下钻，面包屑变为「全国 / 湖北省」
- [ ] 继续下钻「武汉市」→「江夏区」，面包屑逐级增加
- [ ] 点击面包屑「全国」→ 回到全国层
- [ ] 湖北层可见村庄发光散点；点击小朱湾散点 → 跳转 `/villages/xiaozhuwan` 村庄主页
- [ ] 村庄主页显示核心字段，空栏目显示「待实地采集补充」
- [ ] 顶部「村庄列表」→ 列表展示全部示例村，点卡片进详情
- [ ] 断网或改错一个 adcode 时，地图显示「加载失败」提示且不崩溃

确认后 Ctrl+C 停止。

- [ ] **Step 4: 创建 README.md**

```markdown
# 数乡计划 · 乡村数字资源库平台

Vue3 + Vite + ECharts-GL。首页为模块化导航中枢，含 3D 全国地图下钻（全国→省→市→区县），点击村庄散点进入村庄主页。

## 开发
- `npm install`
- `npm run dev` — 本地开发（地图 geoJSON 需联网，数据源：DataV.GeoAtlas）
- `npm test` — 单元测试（Vitest）
- `npm run build` — 生产构建

## 新增功能模块（3 步，老代码零改动）
1. 复制 `src/modules/_template/` 改名为 `src/modules/<你的模块id>/`
2. 在 `src/modules.config.js` 增加一条记录（id/name/icon/path/enabled）
3. 在该模块 `routes.js` 定义路由 —— 首页入口卡与路由自动生效

## 数据
- 村庄数据：`src/data/villages.json`（核心字段 + `extra` 扩展区）。实地采集后替换示例数据。
- 设计文档：`docs/superpowers/specs/2026-07-02-shuxiang-platform-design.md`
```

- [ ] **Step 5: Commit**

```bash
git add README.md src/modules/_template/
git commit -m "docs: README + 全量测试与手动验收通过"
```

---

## 完成标准回顾（对照设计文档成功标准）

- [x] 能运行的 Vue3 + Vite 工程，首页 3D 地图可下钻到区县级（Task 1/9/12）
- [x] 首页从模块清单自动生成入口卡（Task 2/10）
- [x] 新模块脚手架，新增模块零改动既有代码（Task 4，README 记录 3 步流程）
- [x] 村庄主页模板跑通「地图点位 → 村庄主页」完整链路（Task 9/10/11/12）
- [x] 大地金主题（Task 5/9）
- [x] geoJSON 容错、核心字段校验、下钻状态机均有单测（Task 6/7/8/9）
