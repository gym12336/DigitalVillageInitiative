# 乡村之声:详情独立页 + 后端化(Phase 1)设计

> 日期:2026-07-09　·　状态:待实现
> 目标:把「乡村之声」从「单页 + 静态 JSON + 弹窗详情」重构为「主页 + 独立详情页 + 后端数据 + 计数落库」,对标已跑通的「乡村百科」模式。

## 1. 背景与目标

乡村之声当前是单个 `VoiceView.vue`:需求列表 + 筛选 + 问答区全堆一页,详情用弹窗,数据全部静态 `import voice-data.json`,发布/响应/点赞均为假操作(toast)。

乡村百科已经是「一村一页 + 独立详情路由 + 后端表 + `/api/villages` + 前端 fetch」的完整形态。本次让乡村之声对齐这套模式的核心部分。

**本期范围(经确认的三项决策):**
- 写操作范围 = **A 只读 + 计数落库**。需求/问答从后端读;浏览/点赞/收藏计数真实累加;不做「发布需求/发布回答」的写入表单(留到下一期 B)。
- 页面结构 = **A 主页 + 详情独立页**。`/voice` 保留列表+筛选,详情从弹窗改为独立页 `/voice/:id`;问答区仍留主页底部。
- 详情页增强 = **a 相关需求推荐 + b 面包屑/返回**。不做状态时间线(c,数据不足,留后)。

**非目标(明确不做):**
- 登录鉴权下的写入表单(发布需求、发布回答)——下一期。
- 团委审核流程——下一期。
- 问答独立成页 `/voice/qa`、响应榜、需求地图——后续可选。
- 后端防刷计数(需登录才能做,本期靠前端 localStorage 防重复)。

## 2. 后端设计

沿用 villages 已跑通的分层:`schema.sql` 建表 → `seed-voice.js` 迁移 JSON → `voiceService.js` 业务 → `voice.js` 路由 → `app.js` 挂载。

### 2.1 数据库表(加入 `server/db/schema.sql`,幂等 CREATE IF NOT EXISTS)

```sql
-- 乡村之声:需求表
CREATE TABLE IF NOT EXISTS demands (
  id           TEXT PRIMARY KEY,                 -- 沿用现有 'v1' 等字符串 id
  title        TEXT NOT NULL,
  town         TEXT NOT NULL DEFAULT '',
  village      TEXT NOT NULL DEFAULT '',
  type         TEXT NOT NULL DEFAULT '',         -- '文化挖掘'|'产业帮扶'|...
  cert_by      TEXT NOT NULL DEFAULT '',         -- 审核发布方(乡镇团委)
  publish_time TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT '待响应',    -- '待响应'|'响应中'|'已完成'
  deadline     TEXT NOT NULL DEFAULT '',
  views        INTEGER NOT NULL DEFAULT 0,
  favorites    INTEGER NOT NULL DEFAULT 0,
  majors       TEXT NOT NULL DEFAULT '[]',       -- JSON 数组 ["设计类","传媒类"]
  descr        TEXT NOT NULL DEFAULT '',         -- 需求详情长文(避开 SQL 关键字,列名用 descr)
  expected     TEXT NOT NULL DEFAULT '',         -- 预期成果
  contact      TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_demands_status ON demands(status);
CREATE INDEX IF NOT EXISTS idx_demands_type   ON demands(type);

-- 乡村之声:问答表(问题 + 回答整存一列 JSON,本期不拆 answer 表)
CREATE TABLE IF NOT EXISTS qa (
  id         TEXT PRIMARY KEY,                   -- 'q1' 等
  question   TEXT NOT NULL,
  asker      TEXT NOT NULL DEFAULT '',
  ask_time   TEXT NOT NULL DEFAULT '',
  answers    TEXT NOT NULL DEFAULT '[]',         -- JSON [{id,author,content,likes}]
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

说明:`majors`、`answers` 是数组/对象,存 JSON 文本(与 villages 的 tags/gallery 一致)。前端 `desc` 字段映射到列 `descr`(`desc` 是 SQL 保留字),service 层出入参统一转回 `desc`,前端无感知。

### 2.2 迁移脚本 `server/db/seed-voice.js`

仿 `seed-villages.js`:读 `src/modules/voice/voice-data.json`,把 8 条 demands + 4 条 qa 插入表。幂等——用 `INSERT OR IGNORE` 或先查 count,已存在则跳过,重复跑不重复插。由 `migrate.js` 或 server 启动时调用一次。

### 2.3 Service `server/services/voiceService.js`

- `list(db, query)` — 分页 + 筛选 + 排序。参数 `q`(标题/村/描述模糊)、`type`、`status`、`sort`(latest|views|favorites|deadline)、`page`、`pageSize`。返回 `{ items, total, page, pageSize }`。JSON 列反序列化,`descr`→`desc`。
- `getById(db, id)` — 单条,反序列化;不存在返回 null。
- `incrementViews(db, id)` — `UPDATE demands SET views = views + 1 WHERE id = ?`,返回新值或 404 信号。
- `adjustFavorites(db, id, delta)` — 收藏计数 +1/-1(delta 限 ±1),返回新值。
- `listQa(db)` — 全部问答,反序列化 answers。

### 2.4 路由 `server/routes/voice.js`(全部无需登录,对齐 villages)

- `GET  /api/voice`            — 需求列表(带 q/type/status/sort/page/pageSize)
- `GET  /api/voice/meta`       — 可选:类型/状态选项(也可前端写死,YAGNI 倾向前端写死,先不做)
- `GET  /api/voice/qa`         — 问答列表(放在 `/:id` 之前,避免被动态段吞掉)
- `GET  /api/voice/:id`        — 单条需求详情;不存在 404
- `POST /api/voice/:id/view`   — 浏览数 +1(进详情页调用)
- `POST /api/voice/:id/favorite` — body `{ delta: 1 | -1 }`,收藏计数增减

`app.js` 增加:`app.use('/api/voice', makeVoiceRouter(db))`。

### 2.5 计数的诚实约束

本期不做登录,故:
- **浏览数**:进详情页 `POST /view` 就 +1,不去重(可被刷,展示性质可接受)。
- **收藏(落库)**:点击调 `POST /favorite`,`favorites` 列纯累加/递减。前端用 localStorage 记「本机已收藏」控制 +1/-1 与按钮态;后端无法真正防刷(需账号,留 B 期)。
- **点赞(不落库)**:demand 详情页的点赞、问答区回答的点赞,本期均为纯前端本地态(不写后端)。因为点赞无独立计数列,且 answers 是整存 JSON、本期不做逐条持久化。
- **浏览数(落库)**:进详情页 `POST /view` 就 +1,不去重。

## 3. 前端设计

### 3.1 API 客户端 `src/modules/voice/api.js`(仿 `practice/mine/api.js`)

导出:`listDemands(params)`、`getDemand(id)`、`incrementView(id)`、`adjustFavorite(id, delta)`、`listQa()`。统一 base `/api/voice`,封装 fetch + 错误抛出。

### 3.2 路由 `src/modules/voice/routes.js`

```js
{ path: '/voice',     name: 'voice',        component: VoiceView }
{ path: '/voice/:id', name: 'voice-detail', component: VoiceDetailView }
```

### 3.3 组件改动

**`VoiceView.vue`(改造)**
- 数据源:删除 `import voiceData`,改为 `onMounted` 调 `listDemands` / `listQa`,存入 reactive。
- 删除弹窗:移除 `activeDemand`、`openDetail/closeDetail`、`<Teleport>` 模态框整块(约 60 行)及其 modal 样式。列表卡片点击改为 `router.push({ name: 'voice-detail', params: { id } })`。
- 筛选/排序:保留现有逻辑,但改为对后端返回的数据操作;若后端已支持筛选参数,则前端筛选状态变化时重新请求(先做前端本地筛选,数据量小,YAGNI)。
- 问答区:保留在主页底部,数据改从 `listQa` 读;「我来回答」「点赞」维持 toast/本地态。
- 加载/错误态:请求期显示占位;失败显示「加载失败,点击重试」。

**`VoiceDetailView.vue`(新建)** — 即第 4 节线框:
- 面包屑「🏠 乡村之声 / 需求详情」+「← 返回列表」。
- 标题区:状态徽章 + 团委审核徽章 + 标题 + 「📍乡镇·村 · 发布时间 · 👁浏览 ⭐收藏」。
- 两栏:左(需求详情/所需专业标签/预期成果),右(联系人卡片 + 我要响应 + 点赞/收藏)。
- 底部相关推荐:调纯函数取前 3 条。
- `onMounted`:`getDemand(id)` 拉数据 + `incrementView(id)`;id 不存在 → 404 提示 + 返回列表链接。
- 点赞/收藏:localStorage 防重;收藏点击调 `adjustFavorite`。

### 3.4 相关推荐纯函数 `src/modules/voice/related.js`

`relatedDemands(current, all, n = 3)`:对 `all` 中除自己外的每条打分(同乡镇 +3、同类型 +2、每个共同专业 +1),降序取前 n。纯函数,便于单测。

### 3.5 错误与边界

- 列表请求失败:整页错误态 + 重试。
- 详情 404:友好提示 + 返回列表,不抛白屏。
- 深链直达 `/voice/:id`:正常工作(独立路由 + onMounted 拉数据)。

## 4. 详情页布局(已确认线框)

```
🏠 乡村之声 / 需求详情                                    ← 返回列表
┃ [待响应] [✓ 四都乡团委审核发布]
┃ 陈家铺村非遗竹编品牌设计需求
┃ 📍 四都乡 · 陈家铺村 · 2026-06-28 发布 · 👁 1286 ⭐ 214
┌─────────────────────────┬──────────────┐
│ 需求详情(长文)          │ 联系人卡片    │
│ 所需专业 [设计类][传媒类] │ 陈书记 138... │
│ 预期成果                 │ [我要响应]    │
│                          │ [点赞][收藏]  │
└─────────────────────────┴──────────────┘
相关需求(同乡镇/类型/专业):[卡1] [卡2] [卡3]
```

## 5. 测试

仿现有 `src/__tests__/server-routes.test.js`(supertest + vitest)。

**后端:**
- `GET /api/voice` 返回列表,分页 total 正确;`type`/`status`/`q` 筛选生效;`sort` 排序正确。
- `GET /api/voice/:id` 命中返回详情;不存在返回 404。
- `POST /api/voice/:id/view` 使 views +1。
- `POST /api/voice/:id/favorite {delta:1}` 使 favorites +1;`{delta:-1}` -1。
- `GET /api/voice/qa` 返回问答,answers 已反序列化为数组。
- seed 幂等:连跑两次 `seed-voice`,行数不变。

**前端纯函数:**
- `relatedDemands`:打分排序正确(同乡镇优先于同类型优先于同专业),排除自身,返回不超过 n 条。

**不做:** Vue 组件重交互测试(与现有仓库做法一致——见 memory「不做代码审查」偏好,验证以跑测试/build 为准)。

## 6. 交付顺序(供实现计划参考)

1. 后端:schema 加表 → seed-voice → voiceService → voice 路由 → app 挂载 → 后端测试。
2. 前端:api.js → related.js(+ 单测) → routes → VoiceDetailView 新建 → VoiceView 改造(拉数据 + 删弹窗) → 加载/错误态。
3. 验证:`npm run test` 全绿 + `npm run build` 通过 + 手动跑一遍主页→详情→返回。
