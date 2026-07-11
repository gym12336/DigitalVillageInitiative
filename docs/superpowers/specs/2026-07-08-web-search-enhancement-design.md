# 联网搜索增强方案生成设计文档

- 日期：2026-07-08
- 落地：当平台检索资源不足 10 条时，自动通过 Bing Search API 多维度搜索目标村信息，结果以卡片形式展示供用户审核采纳，纳入方案生成上下文
- 关联：[方案生成升级设计（LLM + 规则兜底）](./2026-07-08-plan-generation-llm-design.md)、[「我的实践」后端与数据库设计](./2026-07-07-my-practice-backend-design.md)

---

## 0. 目标与动机

### 问题

当前方案生成时，LLM 拿到的上下文仅来自平台 4 个静态数据源（乡村百科、实践成果、乡村之声、攻略）。当目标村不在这些数据中时——这是常态——LLM 只能依靠 idea 文本 + 选题关键词凭空生成，导致方案"泛、不够因地制宜"。

### 目标

在平台检索结果不足时，自动通过联网搜索补全目标村的真实信息（概况、痛点、已有实践、特色资源），让用户审核后纳入方案生成，使方案更贴合村庄实际。

### 成功标准

- 平台检索结果不足 10 条且有目标村名时，自动触发联网搜索，结果以卡片形式展示（标注"🌐 网络"）
- 用户可点击网络卡片查看摘要弹窗（含标题、来源 URL、内容片段、打开原网页入口）
- 用户可采纳/移除网络卡片，采纳后纳入方案生成
- 无 Bing key / 搜索失败 / 无目标村名时，静默跳过，不影响现有流程
- 同一搜索词 24h 内命中缓存，不重复调用 Bing API
- 全量 `vitest run` + `vite build` 不回归

---

## 1. 整体流程

```
用户进入实践前（StagePlan）
  → 平台检索（retrieval.js，搜 4 个本地数据源）
  → 本地结果卡片数 < 10 条 且 有目标村名
    → 自动触发联网搜索（后台静默，不打断用户）
      → POST /api/search/web { village, idea }
      → 后端 4 维度并发搜索 Bing API
      → 按 URL 去重 → 按相关性排序 → 每维度 top 1-3
      → 返回 { results: [...] }
    → 前端渲染为"🌐 网络"卡片，混在平台卡片列表中
  → 本地结果 ≥ 10 条 或 无目标村名 → 不触发联网搜索
```

---

## 2. 后端搜索代理

### 2.1 接口

```
POST /api/search/web                  （需登录，挂 auth 中间件）
body:  { village, idea }             // village 必填，idea 可选
返回:  { results: [{ title, url, snippet, dimension, relevance }] }
错误:  400 缺 village；401 未登录
```

- `dimension`：`'overview' | 'painPoints' | 'existingPractices' | 'resources'`
- `relevance`：`'high' | 'medium' | 'low'`（标题含村名 = high）

### 2.2 组件

- **`server/lib/webSearch.js`（新）**：Bing API 薄封装 + 内存缓存。
  - `searchBing(query, apiKey, fetchImpl) → [{ title, url, snippet }]`
  - `GET https://api.bing.microsoft.com/v7.0/search?q=...&count=5&mkt=zh-CN`
  - 5s 超时（AbortController），失败返回空数组
  - 无 key（`process.env.BING_SEARCH_API_KEY` 未配）→ 返回空数组
  - 内存缓存：`Map<string, { data, ts }>`，key = 搜索词，TTL = 24h
  - 同一搜索词的并发请求共享一个 in-flight Promise（防重复调用）

- **`server/services/searchService.js`（新）**：多维度编排。
  - 四个维度并发搜索：

    | 维度 key | 搜索词模板 | 取 top N |
    |----------|-----------|---------|
    | `overview` | `{village} 乡村振兴 产业 人口 概况` | 3 |
    | `painPoints` | `{village} 发展困难 问题 需求` | 3 |
    | `existingPractices` | `{village} 社会实践 帮扶 大学生` | 3 |
    | `resources` | `{village} 特产 文化 旅游 非遗` | 3 |

  - 搜索词附带 idea 前 20 字增加相关性（如 `{village} {idea前20字} 特色资源`）
  - 按 URL 去重（同一条结果可能被多个维度命中）
  - 标注 `relevance`（标题含村名 → high，含 idea 关键词 → medium，其余 low）
  - 每维度截断 top 3

- **`server/routes/search.js`（新）**：HTTP 层，校验 body 有 village，调 searchService，返回 `{ results }`。`app.js` 挂 `/api/search`。

### 2.3 错误处理

| 场景 | 行为 |
|------|------|
| `BING_SEARCH_API_KEY` 未配 | searchService 返回空数组，前端无感 |
| Bing API 超时 / 限流 / 网络失败 | 返回空数组，console.warn 记日志 |
| 所有维度均无结果 | 返回 `{ results: [] }`，前端不渲染网络区 |
| 缓存命中 | 跳过 Bing 调用，直接返回缓存数据 |

---

## 3. 前端改造

### 3.1 数据层

- **`api.js`（改）**：加 `apiSearchWeb({ village, idea }) → results[]`，POST `/api/search/web`，失败返回空数组。
- **`retrieval.js`（改）**：加 `searchWeb(village, idea)` 薄封装，调 api 并将结果格式化为检索卡片结构 `{ source: 'web', id: url, title, sub: snippet, path: url, dimension, relevance }`。失败吞错返回空数组。

### 3.2 视图

- **`StagePlan.vue`（改）**：
  - `onSearch()` / `maybeAutoSearch()` 后检查：`cards.length < 10` 且有目标村名（`dossier.village` || idea 提取）
  - 触发 `searchWeb()`，结果 `push` 进 `cards`（按 URL 去重：不与已有平台卡片重叠）
  - 网络卡片 source 标签显示「🌐 网络」，使用独立颜色（如橙色系），与平台四类区分
  - 点击「查看」→ 不跳转路由，打开 `WebSearchModal` 弹窗
  - 点击「采纳」→ 与平台卡片逻辑一致（加入 refs），纳入方案生成

- **`WebSearchModal.vue`（新）**：网络结果详情弹窗。
  - 内容：标题、来源 URL（可点击）、内容摘要（snippet，3-5 行）
  - 底部按钮：「打开原网页 ↗」（`window.open(url, '_blank')`）、「采纳此信息」（关闭弹窗 + 自动 toggleAdopt 该卡片）
  - 关闭按钮（✕）在右上角

### 3.3 目标村名获取

优先级：`dossier.village` → idea 正则提取（复用 `planGen.js` 中 `pickTargetVillage` 逻辑）→ 都没有则不触发联网搜索。

---

## 4. 环境变量

- `.env` 加 `BING_SEARCH_API_KEY=`（空则联网搜索静默跳过，本地无需 key 也能跑）
- `.env.example` 补一行注释说明

---

## 5. 测试策略

### 后端

| 测试对象 | 测什么 |
|----------|--------|
| `webSearch.js` | 调 Bing API 成功 → 解析结果；无 key → 返回空数组；超时 → 返回空数组；缓存命中/过期；in-flight Promise 去重 |
| `searchService.js` | 四维度并发；URL 去重；相关性排序；每维度截断 top 3；某维度失败不影响其他维度 |
| `routes/search.js` | 未登录 401；正常返回 results 且结构合法；body 缺 village → 400 |

### 前端

| 测试对象 | 测什么 |
|----------|--------|
| `api.js` | `apiSearchWeb` 请求形状（路径 `/api/search/web`、method POST、body 含 village/idea） |
| `retrieval.js` | `searchWeb` 格式化卡片输出；api 失败返回空数组 |
| `StagePlan.vue` | 平台结果 < 10 触发搜索；网络卡片渲染与来源标签；弹窗打开/关闭；采纳网络卡片 → 纳入 refs |
| `WebSearchModal.vue` | 标题/URL/摘要渲染；打开原网页按钮；采纳按钮行为 |

---

## 6. 落地步骤

1. `.env` / `.env.example`：加 `BING_SEARCH_API_KEY`
2. `server/lib/webSearch.js`（新）：Bing API 封装 + 内存缓存 + 单测
3. `server/services/searchService.js`（新）：多维度并发编排 + 单测
4. `server/routes/search.js`（新）：`POST /api/search/web` + `app.js` 挂载
5. `api.js`：加 `apiSearchWeb`
6. `retrieval.js`：加 `searchWeb()` 格式化卡片
7. `WebSearchModal.vue`（新）：弹窗组件
8. `StagePlan.vue`：平台结果 < 10 触发联网搜索 + 网络卡片渲染 + 弹窗
9. 全量 `vitest run` + `vite build` 通过
