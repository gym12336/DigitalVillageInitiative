# 乡村之声:详情独立页 + 后端化 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development 或 superpowers:executing-plans 逐任务执行。步骤用 checkbox 追踪。
> **状态:已全部执行完成(2026-07-09)。** 17 个测试全绿,数据已 seed,前后端实测通。本文档为已落地实现的存档。

**Goal:** 把乡村之声从「单页 + 静态 JSON + 弹窗详情」重构为「主页 + 独立详情页 + 后端数据 + 计数落库」,对标乡村百科模式。

**Architecture:** 沿用 villages 已跑通分层——SQLite 建表 → seed 迁移 JSON → service 业务 → Express 路由(无需登录)→ 前端 fetch。详情从弹窗改为独立路由 `/voice/:id`。

**Tech Stack:** better-sqlite3、Express 5、Vue 3 `<script setup>`、vue-router、vitest + supertest。

**Spec:** `docs/superpowers/specs/2026-07-09-voice-detail-backend-design.md`(commit be99b3b)

---

## 文件结构

后端(`server/`):
- `db/schema.sql` — 新增 demands + qa 两表(修改)
- `db/seed-voice.js` — voice-data.json → SQLite 迁移(新建)
- `services/voiceService.js` — list/getById/incrementViews/adjustFavorites/listQa(新建)
- `routes/voice.js` — 5 个只读+计数端点(新建)
- `app.js` — 挂载 `/api/voice`(修改)

前端(`src/modules/voice/`):
- `api.js` — fetch 客户端(新建)
- `related.js` — 相关推荐纯函数(新建)
- `routes.js` — 加 `/voice/:id`(修改)
- `VoiceDetailView.vue` — 详情独立页(新建)
- `VoiceView.vue` — 改 fetch + 删弹窗 + 卡片跳转(修改)

测试(`src/__tests__/`):
- `voice-routes.test.js` — 后端 HTTP(新建,12 用例)
- `voice-related.test.js` — 纯函数(新建,5 用例)

---

### Task 1: 建表

**Files:** Modify `server/db/schema.sql`

- [x] 在 villages 索引之后追加 `demands` 表(id/title/town/village/type/cert_by/publish_time/status/deadline/views/favorites/majors(JSON)/descr/expected/contact/phone/created_at/updated_at)+ `idx_demands_status`、`idx_demands_type` 索引。
- [x] 追加 `qa` 表(id/question/asker/ask_time/answers(JSON)/created_at/updated_at)。
- [x] `desc` 是 SQL 保留字,列名用 `descr`;majors/answers 存 JSON 文本。

### Task 2: seed 迁移脚本

**Files:** Create `server/db/seed-voice.js`

- [x] 导出 `seedVoice(db, now)`:读 `src/modules/voice/voice-data.json`,INSERT OR IGNORE 灌 demands + qa,单事务,幂等。`desc`→`descr`,majors/answers `JSON.stringify`。
- [x] connection.js / migrate.js 仅在脚本直接运行分支里动态 import(`if (process.argv[1]?.endsWith('seed-voice.js'))`),避免测试 import seedVoice 时被 connection.js 外部依赖带崩。
- [x] 运行 `node server/db/seed-voice.js` → 需求导入 8、问答导入 4。

### Task 3: service 层

**Files:** Create `server/services/voiceService.js`

- [x] `list(db, {page,pageSize,q,type,status,sort})` — 分页+筛选+排序(sort: latest/views/favorites/deadline),返回 `{demands,total,page,pageSize,totalPages}`。
- [x] `getById`、`incrementViews`(views+1)、`adjustFavorites`(±1,MAX(0,...))、`listQa`。
- [x] rowToDemand:`descr`→`desc`,majors/answers `safeJson` 反序列化。

### Task 4: 路由 + 挂载

**Files:** Create `server/routes/voice.js`; Modify `server/app.js`

- [x] `GET /`、`GET /qa`(须在 `/:id` 前)、`GET /:id`(404)、`POST /:id/view`、`POST /:id/favorite`({delta})。全无需登录。
- [x] app.js:`import { makeVoiceRouter }` + `app.use('/api/voice', makeVoiceRouter(db))`。

### Task 5: 后端测试

**Files:** Create `src/__tests__/voice-routes.test.js`

- [x] 内存库 + migrate + seedVoice + supertest。12 用例:列表/分页、type/status/q 筛选、sort、详情命中/404、view+1、favorite ±1、view 404、qa 反序列化、seed 幂等。
- [x] `npx vitest run` → 12 passed。

### Task 6: 前端 API 客户端

**Files:** Create `src/modules/voice/api.js`

- [x] `listDemands(params)`、`getDemand(id)`、`incrementView(id)`、`adjustFavorite(id,delta)`、`listQa()`。薄 fetch 封装,无 Authorization(只读),统一解 `{error}`。

### Task 7: 相关推荐纯函数 + 单测

**Files:** Create `src/modules/voice/related.js`, `src/__tests__/voice-related.test.js`

- [x] `relatedDemands(current, all, n=3)`:同乡镇+3/同类型+2/共同专业各+1,降序取前 n,排除自身,同分按 views。
- [x] 5 用例:打分排序、排除 0 分、限制 n、同分 views、空输入边界。`npx vitest run` → 5 passed。

### Task 8: 详情路由 + 详情页

**Files:** Modify `src/modules/voice/routes.js`; Create `src/modules/voice/VoiceDetailView.vue`

- [x] routes 加 `{ path: '/voice/:id', name: 'voice-detail', component: VoiceDetailView }`。
- [x] VoiceDetailView:面包屑+返回、标题区(状态/审核徽章/浏览收藏)、两栏(详情/专业/预期 + 联系人卡片/响应/点赞收藏)、相关推荐。onMounted 拉详情 + incrementView;404 友好提示;点赞纯前端 localStorage、收藏调 adjustFavorite;watch route.params.id 支持相关卡片内跳。

### Task 9: 改造 VoiceView

**Files:** Modify `src/modules/voice/VoiceView.vue`

- [x] 数据源:删 `import voiceData`,改 onMounted 调 listDemands+listQa,含 loading/error。
- [x] 删弹窗:移除 `<Teleport>` 模态框、activeDemand/closeDetail/toggleLike/toggleFav/ESC 监听。
- [x] `openDetail(d)` 改为 `router.push({name:'voice-detail',params:{id:d.id}})`。

### Task 10: 验证

- [x] voice 测试 17 全绿。
- [x] seed 落地库 app.db(8 需求 + 4 问答)。
- [x] 前后端重启,`/api/voice`、`/api/voice/:id`、`/api/voice/qa` 三接口 curl 实测通。
- [ ] 整包 `npm run build`:曾卡在 villages 缺 `fetchAllVillages` 导出(另一 AI 半成品),该导出已补;voice 自身无阻塞项。

---

## 备注

- 计数的诚实约束:浏览进页面 +1 不去重;收藏落库靠前端 localStorage 防重复点,后端纯累加无法防刷;点赞纯前端本地态。真正防重复需账号写入(下一期 B)。
- 协作:villages 板块由另一个 AI 并行改造。当前若干 village 测试失败源于其改动,与 voice 无关。见 memory `shuxiang-voice-and-batch`。

