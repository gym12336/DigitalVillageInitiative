# 数乡计划 · 架构设计文档

> 版本：v0.2.0 | 更新：2026-07-11 | 作者：gym

---

## 目录

1. [系统概述](#1-系统概述)
2. [技术选型](#2-技术选型)
3. [系统架构全景](#3-系统架构全景)
4. [前端架构](#4-前端架构)
5. [后端架构](#5-后端架构)
6. [AI 智能体架构](#6-ai-智能体架构)
7. [安全架构](#7-安全架构)
8. [部署架构](#8-部署架构)
9. [工程结构](#9-工程结构)

---

## 1. 系统概述

### 1.1 项目定位

**数乡计划**是一个服务大学生"三下乡"社会实践的配套平台，核心目标是沉淀出一个可长期运营的**乡村数字资源库**——不是一次性的活动网站，而是一个会持续生长的乡村数据平台。

### 1.2 核心设计原则

| 原则 | 说明 |
|------|------|
| **单一数据源** | 前端 dossier/works 以 JSON payload 整存，服务端不拆解字段，避免前后端 schema 漂移 |
| **静默降级** | AI 功能（方案生成/内容提取/联网搜索）失败时静默回落规则版或空结果，不阻断主流程 |
| **模块化即插即用** | 前端模块只需复制 `_template/` + 注册 `modules.config.js`，零改动老代码 |
| **服务端纯函数可测** | lib 层纯函数（无 DB 依赖），service 层注入 db，route 层只做 HTTP 胶水 |
| **授权在 service 层** | 中间件只放 `req.user`（身份），权限判定（`assertMember`）由 service 按需执行 |

### 1.3 用户角色

| 角色 | 核心诉求 | 权限边界 |
|------|---------|---------|
| **实践队员（核心用户）** | 策划有方向、执行不遗漏、成果拿得出手 | 登录后操作本队档案/作品/材料 |
| **村庄 / 村干部** | 让实践带来的改变被看见、留得下 | 当前只读；后续认证后可发布需求 |
| **后续队 / 评审老师 / 资助方** | 承接经验、对比成效、验证价值 | 当前只读公开内容；后续可评论/打分 |

---

## 2. 技术选型

### 2.1 前端

| 技术 | 版本 | 选型理由 |
|------|------|---------|
| **Vue 3** | ^3.5.13 | Composition API，组合式模块架构 |
| **Vite** | ^6.0.7 | 极速 HMR，原生 ESM |
| **Vue Router** | ^4.5.0 | Hash 模式（兼容静态部署，无服务端路由配置） |
| **ECharts** | ^5.5.1 | 3D 地图下钻 + 可视化图表渲染 |
| **ECharts-GL** | ^2.0.9 | 3D 地图组件（全国→省→市→区县） |

### 2.2 后端

| 技术 | 版本 | 选型理由 |
|------|------|---------|
| **Node.js** | 20.6+ | 内置 `.env` 加载、原生 `fetch`、ESM 全支持 |
| **Express** | ^5.2.1 | 轻量 HTTP 框架，命名通配符路由 |
| **better-sqlite3** | ^12.11.1 | 同步 API、零配置、单文件部署；实训期够用 |
| **jsonwebtoken** | ^9.0.3 | JWT 无状态认证 |
| **bcryptjs** | ^3.0.3 | 密码哈希，纯 JS 无编译依赖 |
| **multer** | ^2.2.0 | 多文件上传，内存缓冲后按 dossier 分目录落盘 |

### 2.3 AI / 外部服务

| 服务 | 用途 | 降级策略 |
|------|------|---------|
| **DeepSeek API** | 方案生成、内容提取、材料综述、图片描述 | 无 key → 静默跳过；调用失败 → 回落规则版 |
| **博查 AI Search** | 联网搜索目标村概况/痛点/资源 | 无 key → 静默跳过；失败 → 返回空 |
| **高德地图 API** | 坐标→海拔查询（优先） | 失败 → 尝试备选 |
| **腾讯地图 API** | 坐标→海拔查询（备选） | 失败 → 无海拔数据 |
| **DataV.GeoAtlas** | 地图 geoJSON 按需加载 | 联网获取，客户端缓存 |

### 2.4 数据库

| 方案 | 用途 | 说明 |
|------|------|------|
| **SQLite** (better-sqlite3) | 当前生产库 | 单文件、零运维、适合实训期 |
| **PostgreSQL** | 未来迁移目标 | 已有完整 DDL（`schema.pg.sql`），含全文搜索/trgm 索引/JSONB |

---

## 3. 系统架构全景

```
┌──────────────────────────────────────────────────────────────────┐
│                        浏览器 (SPA)                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────────┐ │
│  │ HomeView │ │ villages │ │ practice │ │ builder / voice / …  │ │
│  │ (3D 地图) │ │  (百科)   │ │  (实践)  │ │  (其余 5 个模块)     │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────────┬──────────┘ │
│       └─────────────┴────────────┴─────────────────┘             │
│                          │ Vue Router (Hash)                      │
│                          │ Vite dev proxy → /api, /uploads        │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                    Express 5 Server (:3001)                       │
│                          │                                        │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                    Route Layer (routes/)                    │   │
│  │  auth │ teams │ dossiers │ works │ plan │ search │ builder │   │
│  │  media │ villages │ voice                                  │   │
│  └──────────────────────────┬────────────────────────────────┘   │
│                             │                                     │
│  ┌──────────────────────────┴────────────────────────────────┐   │
│  │                  Middleware Layer                           │   │
│  │  auth (JWT → req.user) │ errorHandler │ express.json       │   │
│  └──────────────────────────┬────────────────────────────────┘   │
│                             │                                     │
│  ┌──────────────────────────┴────────────────────────────────┐   │
│  │                  Service Layer (services/)                  │   │
│  │  dossier/user/team/works/village/voice                      │   │
│  │  planService (AI 编排) │ aiContentService (AI 生成)         │   │
│  │  searchService (联网搜索) │ mediaService (文件存储)          │   │
│  │  practiceExtractService │ practiceSummaryService            │   │
│  │  imageDescribeService │ zipImportService                    │   │
│  └──────────────────────────┬────────────────────────────────┘   │
│                             │                                     │
│  ┌──────────────────────────┴────────────────────────────────┐   │
│  │                  Lib Layer (lib/)                           │   │
│  │  deepseek (AI 调用) │ planSchema (校验) │ planTemplate      │   │
│  │  token (JWT) │ validate (请求校验) │ webSearch (博查)       │   │
│  │  rateLimiter │ genId │ inviteCode │ fileText │ elevation    │   │
│  └──────────────────────────┬────────────────────────────────┘   │
│                             │                                     │
│  ┌──────────────────────────┴────────────────────────────────┐   │
│  │                   Data Layer (db/)                          │   │
│  │  better-sqlite3 │ migrate.js │ schema.sql │ seed-*.js       │   │
│  └────────────────────────────────────────────────────────────┘   │
│                             │                                     │
│                    ┌────────┴────────┐                            │
│                    │  SQLite (app.db) │                            │
│                    └─────────────────┘                            │
└──────────────────────────────────────────────────────────────────┘
```

### 3.1 关键架构决策

**决策 1：Dossier/Works 整存 JSON payload，不拆字段**

- **理由**：实践档案内容结构随业务迭代频繁变化（plan/track/result 三阶段字段不同），拆列会导致频繁 DDL。整存 JSON 让前端自由演化，服务端只做 CRUD 透传。
- **代价**：无法按 payload 内字段做 SQL 查询。当前用 `title`/`stage`/`team_id` 冗余列满足列表和筛选需求。
- **迁移路径**：PostgreSQL 的 JSONB 可建 GIN 索引 + 计算列，未来需要时可在 PG 侧按需拆查询字段。

**决策 2：AI 调用全静默降级**

- 方案生成：LLM 失败 → 回落规则版 `planTemplate.js`（4 选题 × 3 阶段任务模板，关键词匹配）
- 内容提取/综述：LLM 失败 → 返回空结果，`source` 标为 `'fallback'`
- 联网搜索：博查 API 失败 → 该维度结果为空数组，不影响其他维度
- 图片描述：模型不支持视觉 → 返回 `{ available: false }`

**决策 3：多队 memberships 多对多**

- 从旧`一人一队`（users.team_id）升级为`memberships`中间表，支持用户同时属于多队
- 迁移幂等：检测 `users.team_id` 列是否存在 → 搬数据 → 删列；重复启动安全

---

## 4. 前端架构

### 4.1 模块化架构

```
src/
├── main.js                     # 入口：createApp + router + 全局组件
├── App.vue                     # 根组件（SiteHeader + router-view + SiteFooter + AppToast）
├── modules.config.js           # 一级栏目注册表（导航栏/首页卡片据此渲染）
├── router/index.js             # 自动收集 modules/*/routes.js，Hash 模式
│
├── views/                      # 顶级页面
│   ├── HomeView.vue            # 首页中枢（3D 地图 + 模块入口卡）
│   └── NotFoundView.vue        # 404
│
├── components/                 # 全局共享组件
│   ├── ChinaMap3D.vue          # 3D 下钻地图核心组件（ECharts-GL）
│   ├── ChinaMap2D.vue          # 2D 兜底地图
│   ├── SiteHeader.vue          # 全局顶栏（品牌logo + 导航 + 用户区）
│   ├── SiteFooter.vue          # 全局底栏
│   ├── PageScaffold.vue        # 页面脚手架（标题 + 内容区）
│   ├── ModuleCard.vue          # 首页入口卡片
│   ├── VillageCard.vue         # 村庄卡片
│   ├── VillageInfoCard.vue     # 村庄信息卡
│   ├── MapDashboardStats.vue   # 地图仪表盘统计
│   ├── CountUp.vue             # 数字滚动动画
│   └── AppToast.vue            # 全局 Toast
│
├── modules/                    # 功能模块（每模块一个子目录）
│   ├── _template/              # 新模块模板（复制即用）
│   ├── villages/               # 乡村百科（列表/详情/荣誉/影像/标签）
│   ├── practice/               # 乡村实践（成果长廊 + 我的实践三阶段工作台）
│   ├── voice/                  # 乡村之声（需求列表/详情/问答）
│   ├── guide/                  # 实践攻略
│   ├── goods/                  # 乡村好物
│   ├── about/                  # 关于我们
│   ├── builder/                # 成果搭建台（低代码可视化编辑器）
│   ├── ranking/                # （降级为 villages 子功能）
│   ├── people/                 # （降级为 villages 子功能）
│   └── media/                  # （降级为 villages 子功能）
│
├── lib/                        # 前端纯函数库
│   ├── villages.js             # 村庄数据校验/散点映射/区域过滤
│   ├── mapDrill.js             # 递归分级下钻状态机（纯函数）
│   ├── geoLoader.js            # geoJSON 按需加载 + 缓存 + 容错
│   ├── encyclopedia.js         # 百科数据工具
│   └── villageResources.js     # 村庄资源聚合
│
├── api/                        # API 调用封装
│   └── villages.js             # 村庄 API
│
├── data/                       # 静态数据（JSON）
│   ├── villages.json           # 村庄数据（核心字段 + extra 扩展区）
│   ├── headlines.json          # 首页头条
│   └── encyclopedia-villages.json
│
└── assets/theme/               # 主题
    ├── tech-blue.js            # ECharts 主题变量（JS）
    └── theme.css               # 页面主题（CSS 变量）
```

### 4.2 模块注册机制

每个模块只需提供一个 `routes.js`（默认导出路由数组），在 `modules.config.js` 中注册后：

- **导航栏**：自动根据 `modules.config.js` 渲染一级栏目 + children 子菜单
- **首页入口卡**：自动为每个 enabled 模块生成一个功能卡片
- **路由**：`router/index.js` 通过 `import.meta.glob('../modules/*/routes.js', { eager: true })` 自动收集

新增模块三步（老代码零改动）：
1. 复制 `src/modules/_template/` → 改名为 `src/modules/<id>/`
2. 在 `modules.config.js` 增加一条记录
3. 在模块 `routes.js` 定义路由

### 4.3 核心组件：ChinaMap3D 下钻地图

```
用户点击省份
    │
    ▼
mapDrill.js 下钻状态机
    ├── drillDown(provinceName) → 加载市级 geoJSON → 飞入动画
    ├── drillDown(cityName)     → 加载区县 geoJSON → 飞入动画
    └── drillUp()               → 回到上一级
    │
    ▼
geoLoader.js 按需加载 + 缓存
    ├── fetch GeoAtlas API
    ├── 缓存到 Map<key, geoJSON>
    └── 失败 → 容错（跳过该区域，不崩地图）
```

### 4.4 我的实践（practice/mine）三阶段架构

```
┌──────────────────────────────────────────────────────────────┐
│                    TeamWorkbench.vue                          │
│  顶部：队伍选择器 + 档案列表（按 teamId 过滤）                   │
├──────────────────────────────────────────────────────────────┤
│  StagePlan.vue     │  StageTrack.vue    │  StageResult.vue   │
│  ① idea 输入       │  ① 任务勾进度      │  ① 成果综述生成     │
│  ② 平台资源检索     │  ② 材料上传         │  ② 可视化成果展示   │
│  ③ AI 方案生成     │  ③ AI 结构化提取    │  ③ 成果导出        │
│  ④ 联网搜索        │  ④ ZIP 整包导入     │                    │
├──────────────────────────────────────────────────────────────┤
│                    共享子组件                                  │
│  UploadPanel / TrackMedia / TrackExtract / WebSearchModal     │
│  MaterialGroups / MediaPreview / DraftReview / ResultCards    │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. 后端架构

### 5.1 分层职责

| 层 | 目录 | 职责 | 约束 |
|---|------|------|------|
| **Route** | `server/routes/` | HTTP 胶水：解析参数 → 调 service → 序列化响应 | 不含业务逻辑，不含 SQL |
| **Service** | `server/services/` | 业务逻辑 + 授权判定（`assertMember`）+ 编排 AI 调用 | 注入 `db`，不含 HTTP 概念 |
| **Lib** | `server/lib/` | 纯函数/薄封装：JWT、校验、AI 客户端、模板 | 不依赖 DB，可单测；不抛 HTTP 错误 |
| **DB** | `server/db/` | 建表 DDL、迁移、seed | 纯 SQL + 迁移脚本 |
| **Middleware** | `server/middleware/` | JWT 解析（→ `req.user`）、统一错误出口 | 不含业务授权 |

### 5.2 路由注册

```
/api/health              GET    → 健康检查（无需登录）
/api/auth/register       POST   → 注册（返回 token）
/api/auth/login          POST   → 登录（返回 token）
/api/auth/me             GET    → 当前用户信息（需登录）

/api/teams               GET    → 我的队伍列表
/api/teams               POST   → 建队
/api/teams/join          POST   → 加入队伍（邀请码）
/api/teams/:id           GET    → 队详情
/api/teams/:id/members   GET    → 队员列表
/api/teams/:id/leave     DELETE → 退队

/api/dossiers            GET    → 列出某队档案（?teamId=）
/api/dossiers            POST   → 建档
/api/dossiers/import     POST   → 批量导入
/api/dossiers/:id        GET    → 取档案
/api/dossiers/:id        PUT    → 更新档案
/api/dossiers/:id        DELETE → 删档案

/api/works               GET    → 列出某队作品（?teamId=）
/api/works               POST   → 保存作品（upsert）
/api/works/:id           GET    → 取作品
/api/works/:id           DELETE → 删作品

/api/plan/generate       POST   → AI 方案生成（需登录）

/api/search/web          POST   → 联网搜索目标村（需登录）

/api/builder/:dId/documents   GET    → 列出搭建文档（?type=）
/api/builder/:dId/documents   POST   → 创建/覆盖搭建文档
/api/builder/documents/:id    DELETE → 删除搭建文档

/api/practice/media             POST   → 上传材料
/api/practice/media/extract-text     POST → 上传并抽文本
/api/practice/media/extract-and-store POST → 上传+存盘+抽文本
/api/practice/media/extract          POST → AI 结构化提取
/api/practice/media/summarize        POST → AI 成果综述
/api/practice/media/describe-image   POST → 图片描述
/api/practice/media/import-zip       POST → ZIP 整包导入

/api/villages             GET    → 列表（分页+搜索+筛选）
/api/villages/meta        GET    → 省份列表+热门标签
/api/villages/:id         GET    → 村庄详情
/api/villages             POST   → 创建村庄
/api/villages/batch       POST   → 批量导入
/api/villages/:id         PUT    → 更新村庄
/api/villages/:id         DELETE → 删除村庄
/api/villages/:id/enrich  POST   → AI 内容增强
/api/villages/:id/enrich/status GET → AI 生成状态

/api/voice                GET    → 需求列表
/api/voice/qa             GET    → 问答列表
/api/voice/:id            GET    → 需求详情
/api/voice/:id/view       POST   → 浏览数+1
/api/voice/:id/favorite   POST   → 收藏计数增减
```

### 5.3 授权模型

```
                    无需登录              需登录（JWT）
                        │                     │
     ┌──────────────────┼─────────────────────┼──────────────┐
     │                  │                     │              │
  villages 列表/详情   voice 列表/详情      auth/me        teams/*
  villages/meta       voice/qa             dossiers/*     works/*
  health              浏览/收藏计数         plan/generate  builder/*
                                           search/web     media/*
```

授权判定在 **service 层**：

```
service 函数:
  1. 从 DB 查资源 → 不存在则 404
  2. assertMember(db, userId, resource.team_id) → 不是队员则 403
  3. 资源 owner 检查（删除限本人）→ 否则 403
  4. 执行业务逻辑
```

### 5.4 错误处理

统一出口 `middleware/errorHandler.js`：

```
Route 层:
  try { ... } catch (e) { next(e) }

errorHandler:
  if (e.status) → res.status(e.status).json({ error: e.message })
  else          → res.status(500).json({ error: '服务器内部错误' })
                  + console.error 打印详情（不泄露给客户端）
```

Lib 层用 `httpError(status, message)` 抛带状态码的错误，Service 层直接 throw，Route 层只做 try/catch + next。

---

## 6. AI 智能体架构

### 6.1 AI 调用全景

```
┌──────────────────────────────────────────────────────────────┐
│                     DeepSeek API                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ 方案生成      │  │ 结构化提取    │  │ AI 内容增强        │  │
│  │ planService  │  │ practiceExtract│  │ aiContentService  │  │
│  │              │  │ Service       │  │ (intro/facts/tags)│  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                    │              │
│         └─────────────────┼────────────────────┘              │
│                           │                                   │
│                    ┌──────┴──────┐                            │
│                    │  chatJSON() │  ← lib/deepseek.js         │
│                    │  20s 超时    │     OpenAI 兼容接口        │
│                    │  1 次重试    │     response_format: json │
│                    └──────┬──────┘                            │
│                           │                                   │
│                    ┌──────┴──────┐                            │
│                    │ 令牌桶限流    │  ← lib/rateLimiter.js     │
│                    │  5 req/s    │                             │
│                    └─────────────┘                            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    博查 AI Search                             │
│  ┌──────────────────────┐  ┌──────────────────────────────┐  │
│  │ searchBocha (Web搜索) │  │ searchBochaAI (AI 总结)       │  │
│  │ 4 维度并发：          │  │ 村落概况一句话 + 参考来源     │  │
│  │ overview/painPoints/  │  │                              │  │
│  │ practices/resources   │  │                              │  │
│  └──────────────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 方案生成流水线

```
POST /api/plan/generate { idea, refs, village, topic, startDate, endDate }
    │
    ▼
validatePlanRequest()   ← 校验字段、截断 idea ≤500 字
    │
    ▼
generatePlan()
    ├── 1. buildUserPrompt()  ← 拼接 idea + refs 摘要 + 时段
    ├── 2. chatJSON()         ← 调 DeepSeek，20s 超时
    │       ├── 成功 → 3
    │       └── 失败 → 返回 template 版（source: 'template'）
    ├── 3. validatePlanShape() ← 校验 LLM 输出结构
    │       ├── ok → 返回 AI 版（source: 'ai'）
    │       └── not ok → 返回 template 版
    └── 恒返回合法 plan，source 字段标出来源
```

### 6.3 降级策略总结

| AI 功能 | 正常路径 | 降级路径 | 降级触发条件 |
|---------|---------|---------|------------|
| 方案生成 | DeepSeek → 校验 → AI 版 | 规则模板（4选题×3阶段任务） | 无 key / 超时 / HTTP 错误 / JSON 不合法 |
| 结构化提取 | DeepSeek → 人物/指标/要点 | 空结果 `source:'fallback'` | 同上 |
| 成果综述 | DeepSeek → 综述文本 | 空结果 `source:'fallback'` | 同上 |
| 联网搜索(Web) | 博查 4 维度并发 | 该维度空数组 | 无 key / 超时 / HTTP 错误 |
| 联网搜索(AI) | 博查 AI 村落概况 | `overview: null` | 同上 |
| 图片描述 | DeepSeek Vision | `{ available: false }` | 无 key / 模型不支持视觉 |
| 村庄 AI 增强 | DeepSeek → intro/facts/tags | 跳过（保留现有数据） | 无 key / 超时 / 已是人工编辑 |

---

## 7. 安全架构

### 7.1 认证

- **JWT**：注册/登录后返回 token，客户端存 localStorage，每次请求带 `Authorization: Bearer <token>`
- **密码**：bcrypt 哈希存储，绝不存明文；bcrypt 上限 72 字节，前端限制 6~72 字符
- **密钥**：通过 `.env` 的 `JWT_SECRET` 注入，不入仓；生产务必更换为随机长串

### 7.2 授权

- 中间件层：只解析 JWT → `req.user = { id, username }`（身份），不判定权限
- Service 层：通过 `assertMember(db, userId, teamId)` 判定"是否队员"；删除操作额外校验 `created_by`
- 公开接口（villages/voice 读）不挂 auth 中间件

### 7.3 输入防护

| 防护点 | 措施 |
|--------|------|
| 请求体大小 | `express.json({ limit: '1mb' })` 全局限制 |
| payload 大小 | `PAYLOAD_MAX_BYTES = 256KB`，每份档案/作品上限 |
| 上传文件 | multer 硬顶（音视频 200MB，ZIP 100MB），service 按 kind 分档二次校验 |
| 文本提取 | 上限 20,000 字符，防 LLM token 爆炸 |
| SQL 注入 | better-sqlite3 参数化查询（`?` 占位符），全项目无字符串拼接 SQL |
| 错误信息 | 500 时只返回通用错误，详情只记服务端日志 |

---

## 8. 部署架构

### 8.1 开发环境

```
┌─────────────┐     proxy /api→:3001    ┌──────────────┐
│ Vite :5173  │ ─────────────────────→  │ Express :3001 │
│ (前端 HMR)   │     proxy /uploads→    │ (后端 API)    │
└─────────────┘                         └──────┬───────┘
                                               │
                                        ┌──────┴───────┐
                                        │  SQLite      │
                                        │  server/app.db│
                                        └──────────────┘
```

启动命令：
```bash
npm run dev      # Vite 前端 (端口 5173)
npm run server   # Express 后端 (端口 3001)
```

### 8.2 生产环境

```
┌─────────────────────────────────────────────┐
│              Express :3001                   │
│  ┌───────────────────────────────────────┐  │
│  │  express.static('dist/')              │  │
│  │  SPA 回退 /* → index.html             │  │
│  │  /api/* → API 路由                    │  │
│  │  /uploads/* → 静态材料                │  │
│  └───────────────────────────────────────┘  │
│                    │                         │
│             ┌──────┴──────┐                  │
│             │  SQLite     │                  │
│             └─────────────┘                  │
└─────────────────────────────────────────────┘
```

生产构建：
```bash
npm run build    # Vite 构建到 dist/
npm run server   # Express 同时托管前端 + API（同源，无需 CORS）
```

### 8.3 数据库迁移路径

```
当前：SQLite (better-sqlite3)
  │
  ├── schema.sql        ← 当前 DDL，SQLite 语法
  ├── migrate.js        ← 幂等迁移 + seed + 旧结构升级
  │
  └── 未来 → PostgreSQL
       │
       ├── schema.pg.sql  ← PG DDL（已就绪）
       │   ├── JSONB 替代 JSON 文本
       │   ├── pg_trgm 模糊搜索索引
       │   ├── 全文搜索 tsvector + 触发器
       │   └── GIN 索引（honors/name/full_name）
       │
       └── 迁移要点：
           - JSON.parse() → JSONB 直接使用
           - INTEGER PRIMARY KEY → SERIAL PRIMARY KEY
           - 需要数据迁移脚本（SQLite → PG）
```

---

## 9. 工程结构

```
DigitalVillageInitiative/
├── .env                        # 环境变量（不入仓）
├── .env.example                # 环境变量模板
├── package.json                # 前后端同仓，脚本：dev/server/build/test
├── vite.config.js              # Vite 配置（alias @/、proxy）
├── vitest.config.js            # Vitest 配置
├── index.html                  # SPA 入口 HTML
│
├── src/                        # 前端源码
│   ├── main.js                 # 入口
│   ├── App.vue                 # 根组件
│   ├── modules.config.js       # 模块注册表
│   ├── router/                 # 路由（自动收集模块路由）
│   ├── views/                  # 顶级页面
│   ├── components/             # 全局共享组件
│   ├── modules/                # 功能模块
│   ├── lib/                    # 前端纯函数
│   ├── api/                    # API 封装
│   ├── data/                   # 静态 JSON 数据
│   └── assets/                 # 主题/图片
│
├── server/                     # 后端源码
│   ├── index.js                # 入口（读 .env、建库、监听）
│   ├── app.js                  # Express 组装（不监听端口，可 supertest 直接测）
│   ├── routes/                 # 路由层（HTTP 胶水）
│   ├── services/               # 服务层（业务逻辑 + 授权）
│   ├── lib/                    # 纯函数库
│   ├── middleware/              # 中间件（auth、errorHandler）
│   ├── db/                     # 数据库（schema、迁移、seed、连接）
│   └── uploads/                # 上传文件存储（practice/<dossierId>/）
│
├── docs/                       # 文档
│   ├── architecture-design.md  # 架构设计文档（本文档）
│   ├── api-design.md           # 接口设计文档
│   ├── data-model-design.md    # 数据模型设计文档
│   └── superpowers/            # Superpowers 规格文档
│
├── public/                     # 静态资源（不经过 Vite 处理）
├── dist/                       # 前端构建产物
├── legacy-static/              # 旧静态站点（内容参考，不再运行）
└── node_modules/
```

---

> 本文档随项目持续更新。架构决策记录（ADR）可补充到 `docs/adr/` 目录。
