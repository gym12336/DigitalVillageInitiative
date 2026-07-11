# 系统架构

> 本文档描述数乡平台的整体架构，供 AI 理解项目全局结构。

---

## 架构总览

```
┌───────────── 前端（Vue 3 SPA）──────────────┐
│  src/                                        │
│  ├── views/         页面级组件               │
│  ├── modules/       功能模块（核心扩展单元）   │
│  ├── components/    共享组件                 │
│  ├── lib/           纯函数工具库             │
│  ├── router/        路由（自动收集模块路由）   │
│  ├── data/          静态数据（JSON）          │
│  └── assets/theme/  主题变量                 │
│                                              │
│  开发期：Vite dev server (port 5173)          │
│  → /api/* 代理到 Express (port 3001)          │
└──────────────────────────────────────────────┘
                      │
                      │ HTTP /api/*
                      ▼
┌───────────── 后端（Express 5）───────────────┐
│  server/                                     │
│  ├── routes/       路由层（参数提取+响应）     │
│  ├── services/     业务逻辑层                 │
│  ├── middleware/   中间件（auth/error）        │
│  ├── db/           数据库连接+迁移            │
│  └── lib/          工具（token/validate/…）   │
│                                              │
│  SQLite (better-sqlite3) — 单文件数据库       │
└──────────────────────────────────────────────┘
```

## 前端：模块化架构

每个功能模块是 `src/modules/<id>/` 下的一个独立目录，包含：

```
src/modules/<id>/
├── routes.js          # 路由定义（默认导出数组）
├── <id>Api.js         # API 调用封装（可选）
├── IndexView.vue      # 主页面
├── XXHub.vue          # 模块中枢页面
└── SubFeature.vue     # 子组件
```

**自动路由收集**：`src/router/index.js` 通过 `import.meta.glob` 自动扫描所有 `modules/*/routes.js`，模块只需导出路由数组即可生效——零手动注册。

**新增模块三步走**：
1. 复制 `src/modules/_template/` → `src/modules/<id>/`
2. 在 `src/modules.config.js` 增加一条记录
3. 定义模块路由 —— 首页入口卡与路由自动生效

## 后端：分层架构

```
路由层 (routes)  →  只做参数校验和 HTTP 响应
    │
    ▼
服务层 (services) →  业务逻辑、数据组装、事务
    │
    ▼
数据库 (db)      →  better-sqlite3 同步 API
```

**依赖注入模式**：所有路由工厂函数签名为 `(db, secret) => Router`，通过 `createApp({ db, secret })` 统一组装。

```js
// server/app.js — 组装示例
export function createApp({ db, secret }) {
  const app = express()
  app.use(express.json({ limit: '1mb' }))
  app.use('/api/auth', makeAuthRouter(db, secret))
  app.use('/api/dossiers', makeDossiersRouter(db, secret))
  app.use('/api', notFound)
  app.use(errorHandler)
  return app
}
```

## 数据流

```
用户操作 → Vue 组件 → API 调用 (xxxApi.js) → HTTP /api/* → Express 路由
                                                                    │
                                                                    ▼
                                                              Service 层
                                                                    │
                                                                    ▼
                                                              SQLite DB
```

## 关键设计决策

| 决策 | 理由 |
|------|------|
| Hash 路由 (`createWebHashHistory`) | SPA 部署简单，无需服务端路由回退 |
| better-sqlite3 同步 API | 单文件部署、零配置、适合轻量级场景 |
| 模块自动路由扫描 | 新增模块零侵入，不改动路由入口文件 |
| 依赖注入（无 DI 容器） | 手动传参，简单透明、无魔法 |
| `.env` 管理配置 | JWT_SECRET 等敏感信息不入库 |
| ECharts + ECharts-GL | 已满足 3D 地图 + 丰富图表需求 |

## 规范文档索引

所有需求和设计文档在 `docs/superpowers/` 下：
- `specs/` — 功能设计文档（含 UI/交互/数据结构）
- `plans/` — 实施计划（任务拆分 + 执行步骤）

AI 在开发前应先阅读对应的 design document 和 plan。
