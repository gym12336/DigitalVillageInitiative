# 地图大屏双索引 实施计划

> **For agentic workers:** 每个 Task 派 subagent 实现，不做 review（用户要求先做出来看效果）。工作目录 `d:/UserFolders/Desktop/shuxiang/DigitalVillageInitiative/`，git 分支 `feat/vue3-platform`。

**Goal:** 把首页地图区做成科技蓝大屏（左右侧栏 + 中央 3D 地图），点村庄散点在右侧栏展示该村资源简述并可跳到各模块（索引 A：地图→村→资源）；三个模块保留按资源类型看各村（索引 B）。两种索引共用 villages.json 一份数据。

**Architecture:** 数据驱动。villages.json 的 `extra` 承载资源/人物/影像明细；纯函数 `villageResources.js` 做汇总；HomeView 组合大屏布局；模块用 `?village=` query 做按村筛选。

**Tech Stack:** Vue3 + ECharts-GL（已有），无新依赖。

---

## Task 1: 数据 + 汇总纯函数

**Files:**
- Modify: `src/data/villages.json`（给小朱湾村填全 extra，其余村少量占位）
- Create: `src/lib/villageResources.js`
- Test: `src/__tests__/villageResources.test.js`

内容：
- 小朱湾村 extra 填示例：resources（如 `{name:'荷塘月色民宿', type:'文旅'}` 等 3-4 条）、people（`{name:'王大哥', role:'返乡青年'}` 1-2 条）、media（`{type:'photo', title:'湾村晨景'}`、`{type:'video', title:'湾村一日'}` 若干）、history（2-3 条时间线字符串）。大余湾村填少量，其余保持空。
- `villageResources.js` 导出 `summarize(village)` → `{ resources:n, people:n, photos:n, videos:n, history:n }`；导出 `resourceTypeStats(villages)` → 按 type 分组计数（供左侧栏）。
- 测试覆盖 summarize 计数、空 extra 返回全 0、resourceTypeStats 分组。

## Task 2: ChinaMap3D 交互增强

**Files:**
- Modify: `src/components/ChinaMap3D.vue`

内容：
- 散点 tooltip 显示村名（hover）。
- 点散点：保持 `emit('select-village', id)`（父组件用于右侧栏，不再由地图内部跳转）。
- 新增 prop `selectedId`，选中的村散点高亮放大。
- 测试沿用现有（handleVillageClick emit）。

## Task 3: 村庄信息卡组件（右侧栏内容）

**Files:**
- Create: `src/components/VillageInfoCard.vue`
- Test: `src/__tests__/VillageInfoCard.test.js`

内容：
- props：`village`（选中的村对象，可为 null）。
- 无选中：显示提示"点击地图上的村庄查看资源"。
- 有选中：村名 + 全称 + 类型标签；资源/人物/影像三行简述，每行显示数量 + `→` 跳转链接：
  - 资源 → `/ranking?village=<id>`
  - 人物 → `/people?village=<id>`
  - 影像 → `/media?village=<id>`
  - 底部"进入村庄主页 →" → `/villages/<id>`
- 科技蓝深色卡片样式（与地图面板一致）。
- 测试：空态提示、有村时显示村名与三类计数、跳转链接 href 正确。

## Task 4: HomeView 大屏布局

**Files:**
- Modify: `src/views/HomeView.vue`
- Create: `src/components/MapDashboardStats.vue`（左侧栏统计）
- Modify: `src/__tests__/HomeView.test.js`

内容：
- 地图区改为三栏 grid：左 `MapDashboardStats`（村庄总数、资源类型分布条、资源 Top3 村）、中 `ChinaMap3D`、右 `VillageInfoCard`。整块深色科技蓝面板。
- `selectedVillage` ref：接 ChinaMap3D 的 `select-village` → 查 villages.json → 传给 VillageInfoCard。
- 下方模块入口卡（纸感）+ hero 保持不变。
- 响应式：窄屏侧栏堆叠到地图下方。
- 测试：更新为验证大屏三栏渲染 + 模块卡仍在。

## Task 5: 模块按村筛选（索引 A 落地）

**Files:**
- Modify: `src/modules/ranking/RankingView.vue`
- Modify: `src/modules/people/PeopleView.vue`
- Modify: `src/modules/media/MediaView.vue`
- Test: `src/__tests__/module-village-filter.test.js`

内容：
- 各模块读 `route.query.village`：有值时只显示该村数据，顶部显示"只看 XX村 · 查看全部资源"（点"查看全部"清除 query）。
- 无 query 时行为不变（看各村）。
- 测试：mock route.query.village，验证过滤生效 + 无 query 显示全部。

## Task 6: 全量测试 + 构建 + 提交

- `npm test` 全绿、`npm run build` 通过。
- 手动验收：点地图小朱湾散点 → 右侧栏出现资源简述 → 点"资源 →"进入 `/ranking?village=xiaozhuwan` 只看该村；模块内点"查看全部"回到全部。
- 提交本批改动。
