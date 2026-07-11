# 数乡计划 · 数据模型设计文档

> 版本：v0.2.0 | 更新：2026-07-11 | 作者：gym

---

## 目录

1. [概述](#1-概述)
2. [ER 图](#2-er-图)
3. [核心业务表](#3-核心业务表)
4. [内容数据表](#4-内容数据表)
5. [JSON Payload 结构](#5-json-payload-结构)
6. [索引设计](#6-索引设计)
7. [迁移与升级策略](#7-迁移与升级策略)
8. [SQLite → PostgreSQL 对照](#8-sqlite--postgresql-对照)

---

## 1. 概述

### 1.1 数据库选型

| 项目 | 当前 | 未来 |
|------|------|------|
| 数据库 | SQLite (better-sqlite3) | PostgreSQL |
| 文件 | `server/app.db` | — |
| DDL | `server/db/schema.sql` | `server/db/schema.pg.sql` |
| ORM | 无（原生 SQL） | 无（原生 SQL） |

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| **存档整存 JSON** | dossier/works 的主体内容以 JSON payload 整存一列，避免频繁 DDL |
| **冗余列提效** | 列表/筛选所需的字段（title/stage/team_id）冗余到独立列 |
| **外键保一致** | SQLite 外键约束 + ON DELETE CASCADE 关键路径 |
| **幂等迁移** | 所有 DDL 用 `IF NOT EXISTS`，升级脚本检测旧结构 |
| **名称显式化** | SQL 保留字冲突用别名（如 `descr` 替代 `desc`） |

### 1.3 时间约定

所有时间列存 ISO 8601 字符串（`TEXT`），如 `2026-07-11T00:00:00.000Z`。不依赖数据库的时间函数生成。

---

## 2. ER 图

```
┌──────────┐       ┌──────────────┐       ┌──────────┐
│  users   │       │ memberships  │       │  teams   │
├──────────┤       ├──────────────┤       ├──────────┤
│ id (PK)  │──1:N──│ user_id (PK) │──N:1──│ id (PK)  │
│ username │       │ team_id (PK) │       │ name     │
│ password │       │ role         │       │ invite   │
│ display  │       │ joined_at    │       │ code     │
│ created  │       └──────────────┘       │ created  │
└──────────┘                              │ _by      │
     │ 1:N                                │ created  │
     │                                    │ _at      │
     │                                    └──────────┘
     │                                         │ 1:N
     │                                         │
     ▼                                         ▼
┌──────────┐    ┌───────────────────┐    ┌──────────┐
│ dossiers │    │ builder_documents │    │  works   │
├──────────┤    ├───────────────────┤    ├──────────┤
│ id (PK)  │    │ id (PK)           │    │ id (PK)  │
│ team_id ─┼─1:N│ dossier_id (FK)   │    │ team_id  │
│ created  │    │ created_by (FK)   │    │ created  │
│ _by (FK) │    │ type              │    │ _by (FK) │
│ title    │    │ name              │    │ title    │
│ stage    │    │ payload           │    │ source   │
│ payload  │    │ created_at        │    │ _dossier │
│ created  │    │ updated_at        │    │ payload  │
│ _at      │    └───────────────────┘    │ created  │
│ updated  │                             │ _at      │
│ _at      │                             │ updated  │
└──────────┘                             │ _at      │
                                          └──────────┘

┌──────────┐    ┌──────────┐
│ villages │    │ demands  │    ┌──────┐
├──────────┤    ├──────────┤    │  qa  │
│ id (PK)  │    │ id (PK)  │    ├──────┤
│ name     │    │ title    │    │ id   │
│ ...标量  │    │ ...标量   │    │ ...  │
│ ...JSON  │    │ ...JSON  │    │ ...  │
│ created  │    │ created  │    │      │
│ _at      │    │ _at      │    └──────┘
│ updated  │    │ updated  │
│ _at      │    │ _at      │
└──────────┘    └──────────┘
```

---

## 3. 核心业务表

### 3.1 users — 用户

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 用户唯一 ID |
| username | TEXT | NOT NULL UNIQUE | 登录名，3~32 字符 |
| password | TEXT | NOT NULL | bcrypt 哈希 |
| display_name | TEXT | NOT NULL DEFAULT '' | 显示昵称，最长 32 字符 |
| created_at | TEXT | NOT NULL | 注册时间 ISO 8601 |

**注意**：用户不再持有单一 `team_id`。队员关系迁移到 `memberships` 多对多。旧 `users.team_id` 列由 `migrate.js` 检测并升级删除。

**DDL：**
```sql
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT NOT NULL UNIQUE,
  password     TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL
);
```

### 3.2 teams — 队伍

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK AUTOINCREMENT | 队伍唯一 ID |
| name | TEXT | NOT NULL | 队名，1~32 字符 |
| invite_code | TEXT | NOT NULL UNIQUE | 邀请码，随机生成 |
| created_by | INTEGER | REFERENCES users(id) | 建队人（可空，seed 队伍为空） |
| created_at | TEXT | NOT NULL | 创建时间 |

**DDL：**
```sql
CREATE TABLE IF NOT EXISTS teams (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  invite_code  TEXT NOT NULL UNIQUE,
  created_by   INTEGER REFERENCES users(id),
  created_at   TEXT NOT NULL
);
```

**Seed 数据：**
```json
[
  { "name": "第一队", "invite_code": "TEAM-01" },
  { "name": "第二队", "invite_code": "TEAM-02" },
  { "name": "第三队", "invite_code": "TEAM-03" },
  { "name": "第四队", "invite_code": "TEAM-04" },
  { "name": "第五队", "invite_code": "TEAM-05" }
]
```

### 3.3 memberships — 成员关系（多对多）

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| user_id | INTEGER | PK, FK→users(id) | 用户 ID |
| team_id | INTEGER | PK, FK→teams(id) | 队伍 ID |
| role | TEXT | NOT NULL DEFAULT 'member' | 'owner' \| 'member' |
| joined_at | TEXT | NOT NULL | 加入时间 |

**复合主键**：`(user_id, team_id)`，同一用户不能重复加入同一队伍。

**DDL：**
```sql
CREATE TABLE IF NOT EXISTS memberships (
  user_id    INTEGER NOT NULL REFERENCES users(id),
  team_id    INTEGER NOT NULL REFERENCES teams(id),
  role       TEXT NOT NULL DEFAULT 'member',
  joined_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, team_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_team ON memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
```

**角色语义：**
| role | 说明 | 权限差异 |
|------|------|---------|
| owner | 建队人 | 不能退队；与 member 同等读写权限 |
| member | 普通队员 | 可退队；读写本队档案/作品 |

> 当前 owner 和 member 对档案/作品的读写权限相同。删除操作额外校验 `created_by`。

---

## 3.4 dossiers — 实践档案

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | 前端 genId 生成的字符串 id |
| team_id | INTEGER | NOT NULL, FK→teams(id) | 归属队伍 |
| created_by | INTEGER | NOT NULL, FK→users(id) | 建档人 |
| title | TEXT | NOT NULL DEFAULT '' | **冗余列**：从 payload 提取，供列表展示 |
| stage | TEXT | NOT NULL DEFAULT 'plan' | **冗余列**：'plan' \| 'track' \| 'result' |
| payload | TEXT | NOT NULL | 完整档案 JSON（详见 §5.1） |
| created_at | TEXT | NOT NULL | 建档时间 |
| updated_at | TEXT | NOT NULL | 最后修改时间 |

**DDL：**
```sql
CREATE TABLE IF NOT EXISTS dossiers (
  id          TEXT PRIMARY KEY,
  team_id     INTEGER NOT NULL REFERENCES teams(id),
  created_by  INTEGER NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL DEFAULT '',
  stage       TEXT NOT NULL DEFAULT 'plan',
  payload     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dossiers_team_updated ON dossiers(team_id, updated_at);
```

**stage 状态机：**
```
plan ──────→ track ──────→ result
(策划阶段)    (执行阶段)    (总结阶段)
```

> stage 的前进由前端控制，后端不做状态机校验。payload 内 phases 数组恒含三段（每段 tasks 可为空数组）。

### 3.5 builder_documents — 搭建台文档

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | 文档唯一 ID |
| dossier_id | TEXT | NOT NULL, FK→dossiers(id) ON DELETE CASCADE | 关联档案 |
| created_by | INTEGER | NOT NULL, FK→users(id) | 创建人 |
| type | TEXT | NOT NULL CHECK | 'editor' \| 'display' \| 'big-component' |
| name | TEXT | — | 大组件名称（仅 big-component 使用） |
| payload | TEXT | NOT NULL | JSON 字符串 |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 修改时间 |

**DDL：**
```sql
CREATE TABLE IF NOT EXISTS builder_documents (
  id          TEXT PRIMARY KEY,
  dossier_id  TEXT NOT NULL,
  created_by  INTEGER NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('editor', 'display', 'big-component')),
  name        TEXT,
  payload     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_builder_documents_dossier_type
  ON builder_documents(dossier_id, type);
```

**type 语义：**
| type | 数量约束 | 说明 |
|------|---------|------|
| editor | 每 dossier 最多 1 条 | 编辑台画布（大组件编辑布局） |
| display | 每 dossier 最多 1 条 | 展示工作台画布（大屏展示布局） |
| big-component | 每 dossier 多条 | 大组件模板（可复用组件组合） |

### 3.6 works — 成果作品

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | 前端 genId 生成的字符串 ID |
| team_id | INTEGER | NOT NULL, FK→teams(id) | 归属队伍 |
| created_by | INTEGER | NOT NULL, FK→users(id) | 建档人 |
| title | TEXT | NOT NULL DEFAULT '' | **冗余列**：从 payload 提取 |
| source_dossier | TEXT | NOT NULL DEFAULT '' | 关联数据源档案 ID（可空） |
| payload | TEXT | NOT NULL | 完整作品 JSON（布局 + 组件 + 数据绑定） |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 修改时间 |

**DDL：**
```sql
CREATE TABLE IF NOT EXISTS works (
  id             TEXT PRIMARY KEY,
  team_id        INTEGER NOT NULL REFERENCES teams(id),
  created_by     INTEGER NOT NULL REFERENCES users(id),
  title          TEXT NOT NULL DEFAULT '',
  source_dossier TEXT NOT NULL DEFAULT '',
  payload        TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_works_team_updated ON works(team_id, updated_at);
```

---

## 4. 内容数据表

### 4.1 villages — 村庄百科

**标量列（可查询/排序）：**

| 列名 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| id | TEXT | PK | 如 'chenjiapu' |
| name | TEXT | NOT NULL | 村名 |
| full_name | TEXT | '' | 完整路径：省/市/区/乡/村 |
| province | TEXT | '' | 省 |
| city | TEXT | '' | 市 |
| district | TEXT | '' | 区/县 |
| town | TEXT | '' | 乡/镇 |
| summary | TEXT | '' | 一句话摘要 |
| intro | TEXT | '' | 兜底长文介绍 |
| cover | TEXT | '' | 封面图 URL |
| cert_level | TEXT | 'township' | 认证等级：'township' \| 'county' \| 'province' |
| cert_label | TEXT | '' | 认证标签文案 |
| coord_lat | REAL | 0 | 纬度 |
| coord_lng | REAL | 0 | 经度 |
| views | INTEGER | 0 | 浏览量 |
| favorites | INTEGER | 0 | 收藏量 |
| practices | INTEGER | 0 | 实践队到访数 |

**JSON 文本列（内容可变，不需单独建索引）：**

| 列名 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| honors | TEXT | '[]' | 荣誉列表，JSON 数组 |
| tags | TEXT | '{}' | 标签分组，如 `{"文化类":["非遗文化","传统技艺"]}` |
| gallery | TEXT | '[]' | 影像列表，URL 数组 |
| guide | TEXT | '[]' | 出行指南，`[{name,note}]` |
| socials | TEXT | '{}' | 社交链接，`{wechat:true}` |
| manager | TEXT | '{}' | 村干部，`{name,role}` |
| facts | TEXT | '{}' | 结构化事实数据 |
| timeline | TEXT | '[]' | 村庄发展时间线 |
| specialties | TEXT | '[]' | 特色资源 |
| festivals | TEXT | '[]' | 节庆活动 |
| sections | TEXT | '{}' | 详情页自定义模块 |

**时间列：**

| 列名 | 类型 | 说明 |
|------|------|------|
| created_at | TEXT | NOT NULL |
| updated_at | TEXT | NOT NULL |

**索引：**
```sql
CREATE INDEX IF NOT EXISTS idx_villages_province ON villages(province);
CREATE INDEX IF NOT EXISTS idx_villages_name ON villages(name);
```

### 4.2 demands — 乡村之声需求

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | 如 'v1' |
| title | TEXT | NOT NULL | 需求标题 |
| town | TEXT | '' | 所在乡镇 |
| village | TEXT | '' | 所在村 |
| type | TEXT | '' | 分类（'文化挖掘' \| '产业帮扶' \| ...） |
| cert_by | TEXT | '' | 审核发布方 |
| publish_time | TEXT | '' | 发布时间 |
| status | TEXT | '待响应' | '待响应' \| '响应中' \| '已完成' |
| deadline | TEXT | '' | 截止日期 |
| views | INTEGER | 0 | 浏览计数 |
| favorites | INTEGER | 0 | 收藏计数 |
| majors | TEXT | '[]' | 相关专业 JSON 数组 `["设计类","传媒类"]` |
| descr | TEXT | '' | 需求详情长文（descr = desc，避开 SQL 保留字） |
| expected | TEXT | '' | 预期成果 |
| contact | TEXT | '' | 联系人 |
| phone | TEXT | '' | 联系电话 |
| created_at | TEXT | NOT NULL | |
| updated_at | TEXT | NOT NULL | |

**索引：**
```sql
CREATE INDEX IF NOT EXISTS idx_demands_status ON demands(status);
CREATE INDEX IF NOT EXISTS idx_demands_type   ON demands(type);
```

### 4.3 qa — 问答

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | 如 'q1' |
| question | TEXT | NOT NULL | 问题标题 |
| asker | TEXT | '' | 提问者 |
| ask_time | TEXT | '' | 提问时间 |
| answers | TEXT | '[]' | JSON 数组 `[{id, author, content, likes}]` |
| created_at | TEXT | NOT NULL | |
| updated_at | TEXT | NOT NULL | |

---

## 5. JSON Payload 结构

### 5.1 Dossier Payload

```jsonc
{
  // === 基础标识 ===
  "id": "dmrfs7e11f23z",           // 前端 genId，与表主键一致
  "title": "陈家铺村非遗文化调研",   // 冗余到表列
  "stage": "plan",                  // 冗余到表列：'plan'|'track'|'result'
  "teamId": 1,
  "createdBy": 1,

  // === 方案字段（plan 阶段填充） ===
  "goal": "一句话目标",
  "topic": "非遗文化挖掘与活化",
  "targetVillage": "陈家铺村",
  "expected": "一套口述史记录 + 文化传播物料 + 非遗活化建议",
  "metrics": [
    { "name": "受访手艺人数", "unit": "人" },
    { "name": "整理口述史", "unit": "篇" }
  ],
  "background": "乡村之声需求 + 村庄概况",
  "methods": ["半结构化访谈", "影像记录", "口述史整理"],
  "risks": ["手艺人档期难约，需提前预约并留缓冲"],

  // === 方案来源 ===
  "source": "ai",                   // 'ai' | 'template'
  "generatedAt": "2026-07-11T00:00:00.000Z",

  // === 三阶段（恒定三段） ===
  "phases": [
    {
      "stage": "plan",
      "title": "实践前准备",
      "tasks": [
        {
          "text": "联系村委确认手艺人名单与拜访时间",
          "output": "受访名单与档期表",
          "done": false
        }
      ]
    },
    {
      "stage": "track",
      "title": "实践中执行",
      "tasks": [ ... ]
    },
    {
      "stage": "result",
      "title": "实践后总结",
      "tasks": [ ... ]
    }
  ],

  // === 检索采纳的资源（plan 阶段） ===
  "adoptedRefs": [
    { "source": "village", "id": "chenjiapu", "title": "陈家铺村", "sub": "..." },
    { "source": "demand", "id": "v5", "title": "电商直播培训需求" }
  ],

  // === 材料清单（track 阶段） ===
  "materials": [
    {
      "id": "mat_xxx",
      "url": "/uploads/practice/dmrfs7e11f23y/xxx.docx",
      "name": "访谈记录.docx",
      "size": 152340,
      "ext": "docx",
      "kind": "doc",
      "uploadedAt": "2026-07-11T00:00:00.000Z"
    }
  ],

  // === AI 提取的结构化数据（track 阶段） ===
  "extracted": {
    "people": [
      {
        "name": "陈大爷",
        "role": "竹编手艺人",
        "quote": "这门手艺传了三代了",
        "story": "...",
        "highlight": "村中唯一仍在编竹的匠人",
        "confidence": 0.85,
        "source": "auto",
        "reviewed": false              // 是否已人工审校
      }
    ],
    "metrics": [
      {
        "name": "年竹编产量",
        "value": "300",
        "unit": "件",
        "insight": "比去年下降 20%",
        "isHighlight": true,
        "confidence": 0.72,
        "source": "auto",
        "reviewed": false
      }
    ],
    "materialHints": [
      {
        "name": "竹编工艺流程照片",
        "note": "建议拍摄去竹节/破篾/编织三个关键工序",
        "summary": "补充 10-15 张工序特写",
        "theme": "工艺记录",
        "confidence": 0.68,
        "source": "auto"
      }
    ],
    "source": "ai"                    // 'ai' | 'fallback'
  },

  // === 成果综述（result 阶段） ===
  "summary": {
    "text": "本次实践围绕陈家铺村开展非遗文化挖掘...",
    "highlights": ["完成 3 位手艺人深度访谈", "产出竹编工艺影像 45 条"],
    "source": "ai"                    // 'ai' | 'fallback'
  },

  // === 任务完成度 ===
  "taskProgress": {
    "total": 9,
    "done": 5
  },

  // === 时间戳 ===
  "createdAt": "2026-07-11T00:00:00.000Z",
  "updatedAt": "2026-07-11T00:00:00.000Z"
}
```

**payload 设计要点：**
- 前端自由演化 payload 结构，后端不做字段校验（只校验 `id`/`title`/`stage` 冗余列）
- 恒含 `phases` 三段（每段 tasks 可为空），保证三阶段工作台始终有结构
- AI 生成内容含 `source` + `confidence`，人工审校后标记 `reviewed: true`
- `materials` 只存元数据（url/name/size/kind），实际文件在磁盘 `uploads/practice/<dossierId>/`

### 5.2 Builder Document Payload

**editor 类型 — 编辑台画布：**
```jsonc
{
  "components": [
    {
      "id": "comp_1",
      "type": "chart",               // 'chart' | 'datatable' | 'timeline' | 'sensor' | 'big-component'
      "config": { ... },             // 组件配置（图表类型、数据映射、样式）
      "layout": { "x": 0, "y": 0, "w": 6, "h": 4 },
      "dataBinding": { ... }         // 数据绑定（从 dossier extracted 取数）
    }
  ],
  "canvas": { "width": 1200, "height": 900 },
  "theme": "tech-blue"
}
```

**display 类型 — 展示工作台画布：**
```jsonc
{
  "sections": [
    {
      "id": "sec_1",
      "type": "big-component",
      "componentId": "bd_xxx",
      "layout": { "x": 0, "y": 0, "w": 12, "h": 6 }
    }
  ],
  "canvas": { "width": 1920, "height": 1080 },
  "theme": "tech-blue"
}
```

**big-component 类型 — 大组件模板：**
```jsonc
{
  "name": "人物故事卡片组",
  "components": [
    {
      "id": "inner_1",
      "type": "chart",
      "config": { ... },
      "layout": { "x": 0, "y": 0, "w": 4, "h": 3 }
    }
  ],
  "canvas": { "width": 800, "height": 600 }
}
```

### 5.3 Work Payload

与 editor display 画布同构，额外包含数据源引用：
```jsonc
{
  "sourceDossier": "dmrfs7e11f23z",   // 冗余到表列
  "sections": [ ... ],
  "canvas": { "width": 1920, "height": 1080 },
  "theme": "tech-blue",
  "exportConfig": { ... }              // 导出设置（预留）
}
```

### 5.4 Village JSON 列结构

**honors：**
```json
["中国传统村落", "全国生态文化村", "省级历史文化名村"]
```

**tags：**
```json
{
  "文化类": ["非遗文化", "传统技艺", "历史建筑"],
  "产业类": ["特色农业", "乡村旅游"],
  "荣誉类": ["国家级传统村落"]
}
```

**gallery：**
```json
["/images/chenjiapu/01.jpg", "/images/chenjiapu/02.jpg"]
```

**guide：**
```json
[
  { "name": "最佳季节", "note": "3-5月、9-11月" },
  { "name": "交通方式", "note": "松阳县城乘中巴可达" }
]
```

**facts：**
```json
{
  "population": 523,
  "households": 187,
  "mainIndustries": ["竹编", "茶叶", "民宿"],
  "annualIncome": 18500,
  "_meta": {
    "source": "auto",
    "generator": "aiContentService.generateFacts",
    "confidence": 0.7,
    "generatedAt": "2026-07-11T00:00:00.000Z"
  }
}
```

---

## 6. 索引设计

### 6.1 当前索引（SQLite）

| 表 | 索引 | 用途 |
|----|------|------|
| memberships | `idx_memberships_team(team_id)` | 查某队所有成员 |
| memberships | `idx_memberships_user(user_id)` | 查某用户所在队伍 |
| dossiers | `idx_dossiers_team_updated(team_id, updated_at)` | 按队列表 + 时间倒序 |
| works | `idx_works_team_updated(team_id, updated_at)` | 同上 |
| builder_documents | `idx_builder_documents_dossier_type(dossier_id, type)` | 查某档案的搭建文档 |
| villages | `idx_villages_province(province)` | 省份筛选 |
| villages | `idx_villages_name(name)` | 村名搜索 |
| demands | `idx_demands_status(status)` | 状态筛选 |
| demands | `idx_demands_type(type)` | 类型筛选 |

### 6.2 未来索引（PostgreSQL）

除上述索引外，PG 版本增加：

| 索引 | 类型 | 用途 |
|------|------|------|
| `idx_villages_name_trgm` | GIN (pg_trgm) | 村名模糊搜索 LIKE/ILIKE |
| `idx_villages_fullname_trgm` | GIN (pg_trgm) | 全名模糊搜索 |
| `idx_villages_summary_trgm` | GIN (pg_trgm) | 摘要模糊搜索 |
| `idx_villages_search` | GIN (tsvector) | 全文搜索（name + full_name + summary + intro） |
| `idx_villages_honors` | GIN (JSONB) | 荣誉数组包含查询 |
| `idx_villages_city` | BTREE | 市级筛选 |
| `idx_villages_district` | BTREE | 区县级筛选 |
| `idx_villages_cert_level` | BTREE | 认证等级筛选 |

---

## 7. 迁移与升级策略

### 7.1 迁移入口

`server/db/migrate.js` — 启动时由 `server/index.js` 调用，每次启动都执行（幂等）：

```
migrate(db)
  ├── 1. 执行 schema.sql（CREATE IF NOT EXISTS — 幂等建表）
  ├── 2. Seed 队伍（INSERT OR IGNORE — 幂等）
  └── 3. upgradeToMemberships(db) — 旧结构升级（检测 users.team_id 列是否存在）
        ├── 检测 → 已无 team_id 列 → 跳过
        └── 检测 → 有 team_id 列 → 事务：
              ├── 搬数据：users.team_id → memberships
              ├── 回填每队 owner（最小 user_id 成员）
              └── 删列：users DROP team_id（SQLite 重建表法）
```

### 7.2 幂等保证

| 操作 | 幂等手段 |
|------|---------|
| 建表 | `CREATE TABLE IF NOT EXISTS` |
| Seed 队伍 | `INSERT OR IGNORE` |
| 旧结构升级 | 检测 `users.team_id` 列是否存在，跑过一次不再跑 |
| 补列 | `PRAGMA table_info` 检测后再 `ALTER TABLE ADD COLUMN` |

### 7.3 未来迁移到 PostgreSQL

1. 导出 SQLite 数据为 JSON
2. 执行 `schema.pg.sql` 建表
3. 编写数据迁移脚本（类型转换：INTEGER → SERIAL, JSON TEXT → JSONB）
4. 触发器自动维护 `search_vector`
5. 性能验证（GIN 索引效果）

---

## 8. SQLite → PostgreSQL 对照

| 项目 | SQLite | PostgreSQL |
|------|--------|------------|
| 主键自增 | `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` |
| JSON | `TEXT`（字符串） | `JSONB`（二进制 JSON） |
| 全文搜索 | 不支持 | `tsvector` + GIN 索引 + 触发器 |
| 模糊搜索 | LIKE（全表扫描） | `pg_trgm` GIN 索引 |
| 数组查询 | `TEXT` 存 JSON 数组，无法索引 | `JSONB` GIN 索引 |
| 外键 | 支持，需手动启用 | 原生支持 |
| 布尔 | `INTEGER` 0/1 | `BOOLEAN` |
| 浮点 | `REAL` | `DOUBLE PRECISION` |
| 额外列 | — | `villages.field_sources JSONB`（字段来源追踪） |
| 额外列 | — | `villages.search_vector tsvector`（自动触发器维护） |

**PG 新增列说明：**
- `field_sources` — 追踪每个字段的来源（manual/practice/auto），支持 AI 增强跳过已人工编辑字段
- `search_vector` — 全文搜索向量，由 `trg_villages_search` 触发器自动维护，搜索时用 `@@` 操作符

---

> 本文档随数据库变更持续更新。DDL 变更请同步更新 `schema.sql` 和 `schema.pg.sql`。
