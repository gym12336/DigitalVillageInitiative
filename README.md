# 数乡计划 · 乡村数字资源库平台

Vue3 + Vite + ECharts-GL。首页为模块化导航中枢，含 3D 全国地图下钻（全国→省→市→区县），点击村庄散点进入村庄主页。

## 开发

- `npm install`
- `npm run dev` — 本地开发（地图 geoJSON 需联网，数据源：DataV.GeoAtlas）
- `npm test` — 单元测试（Vitest）
- `npm run build` — 生产构建

## 新增功能模块（3 步，老代码零改动）

1. 复制 `src/modules/_template/` 改名为 `src/modules/<你的模块id>/`
2. 在 `src/modules.config.js` 增加一条记录（id/name/icon/path/enabled/desc）
3. 在该模块 `routes.js` 定义路由 —— 首页入口卡与路由自动生效

## 数据

- 村庄数据：`src/data/villages.json`（核心字段 + `extra` 扩展区）。实地采集后替换示例数据。
- 设计文档：仓库外层 `docs/superpowers/specs/2026-07-02-shuxiang-platform-design.md`

## 目录

- `src/views/HomeView.vue` — 首页中枢（3D 地图 + 模块入口卡）
- `src/components/ChinaMap3D.vue` — 3D 下钻地图核心组件
- `src/lib/mapDrill.js` — 递归分级下钻状态机（纯函数）
- `src/lib/geoLoader.js` — geoJSON 按需加载 + 缓存 + 容错
- `src/lib/villages.js` — 村庄数据校验 / 散点映射 / 按区域过滤
- `src/modules/villages/` — 村庄列表 + 村庄主页模板
- `src/assets/theme/` — 大地金主题（JS 变量喂 ECharts + CSS 变量喂页面）

## 旧静态站点

原静态框架保留在 `legacy-static/`（index.html / styles.css / script.js），作为内容与视觉参考，不再运行。
