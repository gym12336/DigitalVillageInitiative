# 数乡计划 · 接口设计文档

> 版本：v0.2.0 | 更新：2026-07-11 | 作者：gym

---

## 目录

1. [概述](#1-概述)
2. [认证接口](#2-认证接口)
3. [队伍接口](#3-队伍接口)
4. [实践档案接口](#4-实践档案接口)
5. [成果作品接口](#5-成果作品接口)
6. [方案生成接口](#6-方案生成接口)
7. [联网搜索接口](#7-联网搜索接口)
8. [搭建台接口](#8-搭建台接口)
9. [材料管理接口](#9-材料管理接口)
10. [村庄百科接口](#10-村庄百科接口)
11. [乡村之声接口](#11-乡村之声接口)
12. [通用规范](#12-通用规范)

---

## 1. 概述

### 1.1 基础信息

| 项目 | 值 |
|------|-----|
| 协议 | HTTP/1.1 |
| 数据格式 | JSON（请求 `Content-Type: application/json`，响应 `Content-Type: application/json`） |
| 字符编码 | UTF-8 |
| 认证方式 | Bearer Token（JWT），放在 `Authorization` 请求头 |
| 开发地址 | `http://localhost:3001`（生产同源，路径前缀 `/api`） |

### 1.2 响应格式

**成功响应：**

```json
{
  // 直接返回业务数据，包含在对应的 key 中
  "token": "eyJ...",
  "user": { ... }
}
```

**错误响应：**

```json
{
  "error": "人类可读的错误描述"
}
```

HTTP 状态码遵循语义：
- `200` — 成功
- `201` — 创建成功
- `400` — 请求参数错误
- `401` — 未登录或 token 失效
- `403` — 无权限（不是队伍成员）
- `404` — 资源不存在
- `413` — 请求体/文件过大
- `422` — 文件类型不支持
- `500` — 服务器内部错误

### 1.3 鉴权标记

接口列表中用 🔒 标记需要登录的接口。

---

## 2. 认证接口

### 2.1 注册

```
POST /api/auth/register
```

**请求体：**

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| username | string | 是 | 3~32 字符，去除首尾空格 |
| password | string | 是 | 6~72 字符（bcrypt 上限） |
| displayName | string | 否 | 最多 32 字符，默认空串 |

**请求示例：**
```json
{
  "username": "zhangsan",
  "password": "mypassword123",
  "displayName": "张三"
}
```

**成功响应** `201`：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "zhangsan",
    "displayName": "张三",
    "createdAt": "2026-07-11T00:00:00.000Z",
    "teams": []
  }
}
```

**错误：**
| 状态码 | 说明 |
|--------|------|
| 400 | 用户名字符数不在 3~32 或密码不在 6~72 或昵称超 32 |
| 400 | 用户名已存在（数据库 UNIQUE 冲突） |

### 2.2 登录

```
POST /api/auth/login
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 登录名 |
| password | string | 是 | 密码（明文传输，服务端 bcrypt 比对） |

**成功响应** `200`：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "zhangsan",
    "displayName": "张三",
    "createdAt": "2026-07-11T00:00:00.000Z",
    "teams": [
      { "id": 1, "name": "第一队", "role": "member" }
    ]
  }
}
```

**错误：**
| 状态码 | 说明 |
|--------|------|
| 400 | 用户名或密码为空 |
| 401 | 用户名或密码错误 |

### 2.3 获取当前用户 🔒

```
GET /api/auth/me
```

**成功响应** `200`：
```json
{
  "user": {
    "id": 1,
    "username": "zhangsan",
    "displayName": "张三",
    "createdAt": "2026-07-11T00:00:00.000Z",
    "teams": [
      { "id": 1, "name": "第一队", "role": "owner" }
    ]
  }
}
```

---

## 3. 队伍接口

全部需登录 🔒。

### 3.1 我的队伍列表

```
GET /api/teams
```

**成功响应** `200`：
```json
{
  "teams": [
    {
      "id": 1,
      "name": "第一队",
      "role": "owner",
      "memberCount": 5,
      "dossierCount": 3
    }
  ]
}
```

### 3.2 创建队伍

```
POST /api/teams
```

**请求体：**

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| name | string | 是 | 1~32 字符 |

**成功响应** `201`：
```json
{
  "team": {
    "id": 2,
    "name": "新队伍",
    "inviteCode": "TEAM-A3F9K2",
    "createdBy": 1,
    "createdAt": "2026-07-11T00:00:00.000Z"
  }
}
```

> 建队人自动成为该队 owner（memberships.role = 'owner'）。

### 3.3 加入队伍

```
POST /api/teams/join
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| inviteCode | string | 是 | 邀请码（大小写敏感） |

**成功响应** `200`：
```json
{
  "team": {
    "id": 1,
    "name": "第一队",
    "memberCount": 6
  }
}
```

> 幂等：已加入的队伍重复加入不报错。

**错误：**
| 状态码 | 说明 |
|--------|------|
| 400 | 邀请码为空 |
| 404 | 邀请码对应的队伍不存在 |

### 3.4 队伍详情

```
GET /api/teams/:id
```

**成功响应** `200`：
```json
{
  "team": {
    "id": 1,
    "name": "第一队",
    "inviteCode": "TEAM-01",
    "createdBy": 1,
    "createdAt": "2026-07-01T00:00:00.000Z",
    "memberCount": 5,
    "dossierCount": 3
  }
}
```

**错误：**
| 状态码 | 说明 |
|--------|------|
| 400 | teamId 不合法 |
| 403 | 不是该队成员 |
| 404 | 队伍不存在 |

### 3.5 队员列表

```
GET /api/teams/:id/members
```

**成功响应** `200`：
```json
{
  "members": [
    {
      "userId": 1,
      "username": "zhangsan",
      "displayName": "张三",
      "role": "owner",
      "joinedAt": "2026-07-01T00:00:00.000Z",
      "dossierCount": 3
    },
    {
      "userId": 2,
      "username": "lisi",
      "displayName": "李四",
      "role": "member",
      "joinedAt": "2026-07-02T00:00:00.000Z",
      "dossierCount": 1
    }
  ]
}
```

### 3.6 退出队伍

```
DELETE /api/teams/:id/leave
```

**成功响应** `200`：
```json
{ "ok": true }
```

**错误：**
| 状态码 | 说明 |
|--------|------|
| 403 | 建队人（owner）不能退队 |

---

## 4. 实践档案接口

全部需登录 🔒。档案归属队伍，操作需是该队成员。

### 4.1 列出队伍档案

```
GET /api/dossiers?teamId=<id>
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| teamId | number | 是 | 队伍 ID |

**成功响应** `200`：
```json
{
  "dossiers": [
    {
      "id": "dmrfs7e11f23y",
      "teamId": 1,
      "createdBy": 1,
      "title": "陈家铺村非遗文化调研",
      "stage": "plan",
      "createdAt": "2026-07-11T00:00:00.000Z",
      "updatedAt": "2026-07-11T00:00:00.000Z"
    }
  ]
}
```

> 列表只返回元数据（id/teamId/createdBy/title/stage/时间），不返回完整 payload。按 `updated_at DESC` 排序。

### 4.2 创建档案

```
POST /api/dossiers
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| teamId | number | 是 | 归属队伍 ID |
| id | string | 是 | 前端 genId 生成的字符串 id |
| title | string | 否 | 档案标题 |
| stage | string | 否 | 'plan' \| 'track' \| 'result'，默认 'plan' |
| ...其他 | any | 否 | 档案其余字段全部归入 payload JSON |

**请求示例：**
```json
{
  "teamId": 1,
  "id": "dmrfs7e11f23z",
  "title": "陈家铺村非遗文化调研",
  "stage": "plan",
  "goal": "围绕陈家铺村开展非遗文化挖掘",
  "topic": "非遗文化挖掘与活化",
  "targetVillage": "陈家铺村",
  "phases": [
    {
      "stage": "plan",
      "title": "实践前准备",
      "tasks": [
        { "text": "联系村委确认手艺人名单", "output": "受访名单", "done": false }
      ]
    }
  ]
}
```

**成功响应** `201`：
```json
{
  "dossier": {
    "id": "dmrfs7e11f23z",
    "teamId": 1,
    "createdBy": 1,
    "title": "陈家铺村非遗文化调研",
    "stage": "plan",
    "createdAt": "2026-07-11T00:00:00.000Z",
    "updatedAt": "2026-07-11T00:00:00.000Z"
  }
}
```

**约束：**
- `id` 必须是纯字母数字串
- 序列化后的 JSON 不超过 256KB
- teamId 必须是当前用户所在队伍

### 4.3 获取档案

```
GET /api/dossiers/:id
```

**成功响应** `200`：
```json
{
  "dossier": {
    "id": "dmrfs7e11f23z",
    "teamId": 1,
    "createdBy": 1,
    "title": "陈家铺村非遗文化调研",
    "stage": "plan",
    "goal": "...",
    "topic": "...",
    "targetVillage": "陈家铺村",
    "phases": [ ... ],
    "createdAt": "2026-07-11T00:00:00.000Z",
    "updatedAt": "2026-07-11T00:00:00.000Z"
  }
}
```

> 返回完整档案（payload JSON 平铺到对象中）。

### 4.4 更新档案

```
PUT /api/dossiers/:id
```

**请求体**：同创建的档案对象（全量替换）。

**成功响应** `200`：同获取档案。

**错误：**
| 状态码 | 说明 |
|--------|------|
| 403 | 不是档案所属队成员 |

### 4.5 删除档案

```
DELETE /api/dossiers/:id
```

**成功响应** `200`：
```json
{ "ok": true }
```

**错误：**
| 状态码 | 说明 |
|--------|------|
| 403 | 不是档案创建人（仅创建人可删） |

### 4.6 批量导入档案

```
POST /api/dossiers/import
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| teamId | number | 是 | 目标队伍 ID |
| dossiers | array | 是 | 档案数组，每条含 id/title/stage/... |

**成功响应** `201`：
```json
{
  "imported": 3,
  "total": 3
}
```

> 单事务全或无。每条档案的 id 会被重铸（用当前时间戳 + 序号偏移），避免冲突。

---

## 5. 成果作品接口

全部需登录 🔒。与档案同构：team_id 归属、payload 整存。

### 5.1 列出队伍作品

```
GET /api/works?teamId=<id>
```

**成功响应** `200`：
```json
{
  "works": [
    {
      "id": "wrk_abc123",
      "teamId": 1,
      "createdBy": 1,
      "title": "陈家铺村成果可视化",
      "sourceDossier": "dmrfs7e11f23z",
      "createdAt": "2026-07-11T00:00:00.000Z",
      "updatedAt": "2026-07-11T00:00:00.000Z"
    }
  ]
}
```

### 5.2 保存作品（upsert）

```
POST /api/works
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| teamId | number | 是 | 归属队伍 ID |
| id | string | 是 | 作品唯一 id |
| title | string | 否 | 作品标题 |
| source | string | 否 | 关联数据源档案 id（可空） |
| ... | any | 否 | 其余字段归入 payload |

> 同 id 重复 POST 为覆盖更新（upsert）。

**成功响应** `200`：
```json
{
  "work": { ... }
}
```

### 5.3 获取作品

```
GET /api/works/:id
```

返回完整作品对象。

### 5.4 删除作品

```
DELETE /api/works/:id
```

仅创建人可删。

---

## 6. 方案生成接口

### 6.1 AI 方案生成 🔒

```
POST /api/plan/generate
```

**请求体：**

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| idea | string | 是 | ≤500 字 |
| refs | array | 否 | 采纳的资源卡片数组 |
| village | string | 否 | 目标村名 |
| topic | string | 否 | 选题方向 |
| startDate | string | 否 | 实践开始日期 |
| endDate | string | 否 | 实践结束日期 |

**请求示例：**
```json
{
  "idea": "去陈家铺村帮村民把竹编卖出去",
  "refs": [
    { "source": "village", "id": "chenjiapu", "title": "陈家铺村", "sub": "竹编之乡" },
    { "source": "demand", "id": "v5", "title": "电商直播培训需求", "sub": "" }
  ],
  "village": "陈家铺村",
  "topic": "电商帮扶",
  "startDate": "2026-07-15",
  "endDate": "2026-07-30"
}
```

**refs 资源卡片结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| source | string | 来源：'village' \| 'result' \| 'demand' \| 'guide' \| 'web' |
| id | string | 资源 id |
| title | string | 资源标题 |
| sub | string | 副标题/摘要 |
| path | string | 前端路由路径（可选） |
| url | string | 外部链接（web 来源） |

**成功响应** `200`：

```json
{
  "plan": {
    "goal": "围绕「陈家铺村」开展特色产业帮扶与品牌推广，一套品牌视觉方案 + 电商上架建议 + 销量提升报告。",
    "topic": "特色产业帮扶与品牌推广",
    "targetVillage": "陈家铺村",
    "expected": "一套品牌视觉方案 + 电商上架建议 + 销量提升报告",
    "metrics": [
      { "name": "月销售额", "unit": "元" },
      { "name": "合作农户数", "unit": "户" },
      { "name": "上架商品数", "unit": "件" }
    ],
    "background": "乡村之声：电商直播培训需求；竹编之乡；实践时段：2026-07-15 至 2026-07-30",
    "methods": ["农户访谈", "产品拍摄", "电商平台对标分析", "品牌焦点访谈"],
    "risks": ["农产品季节性强，采购/拍摄要卡时间窗", "直播/电商需实名，提前备好资质"],
    "phases": [
      {
        "stage": "plan",
        "title": "实践前准备",
        "tasks": [
          { "text": "梳理目标村主打农产品与现价", "output": "产品与定价清单", "done": false },
          { "text": "对标 3 家同类电商店铺的定价与话术", "output": "对标分析简表", "done": false },
          { "text": "预约合作农户与走访路线", "output": "走访计划", "done": false }
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
    "source": "ai",
    "generatedAt": "2026-07-11T00:00:00.000Z"
  }
}
```

**source 字段说明：**

| 值 | 含义 |
|----|------|
| `"ai"` | DeepSeek 生成，校验通过 |
| `"template"` | 回落规则版（无 key / LLM 失败 / 输出不合规） |

> 接口恒返回 200 和合法 plan。前端可根据 `source` 字段提示用户方案来源。

---

## 7. 联网搜索接口

### 7.1 搜索目标村信息 🔒

```
POST /api/search/web
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| village | string | 是 | 目标村名 |
| idea | string | 否 | 实践 idea（用于优化搜索关键词） |

**成功响应** `200`：

```json
{
  "results": [
    {
      "title": "陈家铺村-百度百科",
      "url": "https://baike.baidu.com/item/...",
      "snippet": "陈家铺村位于浙江省...",
      "dimension": "overview",
      "relevance": "high"
    },
    {
      "title": "陈家铺村发展困境分析",
      "url": "https://...",
      "snippet": "...",
      "dimension": "painPoints",
      "relevance": "medium"
    }
  ],
  "overview": {
    "answer": "陈家铺村位于浙江省丽水市松阳县，是一个以竹编闻名的传统村落...",
    "references": [
      { "title": "陈家铺村-百度百科", "url": "https://..." }
    ]
  }
}
```

**results 维度说明：**

| dimension | 搜索意图 |
|-----------|---------|
| overview | 村落概况（产业/人口） |
| painPoints | 发展困难/问题/需求 |
| existingPractices | 已有的社会实践/帮扶 |
| resources | 特产/文化/旅游/非遗 |

**relevance 等级：**
- `high` — 标题含目标村名
- `medium` — 标题含 idea 关键词
- `low` — 其他

> 四个 Web Search 维度并发执行，某维度失败不影响其他维度。AI Search（overview）并发独立，失败返回 null。

---

## 8. 搭建台接口

全部需登录 🔒。

### 8.1 列出搭建文档

```
GET /api/builder/:dossierId/documents?type=<editor|display|big-component>
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 'editor' \| 'display' \| 'big-component' |

**成功响应** `200`：
```json
{
  "documents": [
    {
      "id": "bd_abc123",
      "dossierId": "dmrfs7e11f23z",
      "createdBy": 1,
      "type": "editor",
      "name": null,
      "payload": "{...}",
      "createdAt": "2026-07-11T00:00:00.000Z",
      "updatedAt": "2026-07-11T00:00:00.000Z"
    }
  ]
}
```

### 8.2 创建/覆盖搭建文档

```
POST /api/builder/:dossierId/documents
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 'editor' \| 'display' \| 'big-component' |
| payload | string | 是 | JSON 字符串 |
| name | string | 否 | 仅 big-component 类型使用 |
| id | string | 否 | 文档 id（不提供自动生成） |

**upsert 规则：**
- `editor` / `display`：同 dossier 同 type 已存在则覆盖（各最多一条）
- `big-component`：始终创建新记录

**成功响应** `201`：
```json
{
  "document": { ... }
}
```

### 8.3 删除搭建文档

```
DELETE /api/builder/documents/:id
```

> 只能删除 `big-component` 类型文档。

---

## 9. 材料管理接口

全部需登录 🔒。base path：`/api/practice/media`。

### 9.1 上传材料

```
POST /api/practice/media
Content-Type: multipart/form-data
```

**表单字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | 是 | 上传文件 |
| dossierId | string | 是 | 归属档案 id |

**文件大小限制（按类型分档）：**

| kind | 扩展名 | 上限 |
|------|--------|------|
| av | mp4/mov/mp3/wav/... | 200MB |
| image | jpg/png/gif/webp/svg | 20MB |
| doc | doc/docx/pdf/txt/md | 10MB |
| table | xls/xlsx/csv | 10MB |
| other | 其余 | 20MB |

**成功响应** `201`：
```json
{
  "media": {
    "url": "/uploads/practice/dmrfs7e11f23y/dmrfs8v621nu7.docx",
    "name": "访谈记录.docx",
    "size": 152340,
    "ext": "docx",
    "kind": "doc"
  }
}
```

> 文件存储路径：`server/uploads/practice/<dossierId>/<storageName>`

### 9.2 上传并解析文本

```
POST /api/practice/media/extract-text
Content-Type: multipart/form-data
```

**表单字段**：同上传，仅限 doc/table 类型（其余 422）。

**成功响应** `200`：
```json
{
  "text": "文档解析后的纯文本内容...",
  "truncated": false
}
```

> `truncated: true` 表示文本被截断到 20,000 字符上限。

### 9.3 上传 + 存盘 + 解析文本

```
POST /api/practice/media/extract-and-store
Content-Type: multipart/form-data
```

一趟往返完成：存盘（材料清单可查看）+ 文本提取（供 AI 分析）。仅限 doc/table 类型。

**成功响应** `201`：
```json
{
  "media": { "url": "...", "name": "...", ... },
  "text": "文档解析后的纯文本...",
  "truncated": false
}
```

### 9.4 AI 结构化提取

```
POST /api/practice/media/extract
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| text | string | 是 | 待提取文本（≤20,000 字符） |

**成功响应** `200`（恒 200，失败时返回空结果）：
```json
{
  "people": [
    {
      "name": "陈大爷",
      "role": "竹编手艺人",
      "quote": "这门手艺传了三代了",
      "story": "...",
      "highlight": "村中唯一仍在编竹的匠人",
      "confidence": 0.85,
      "source": "auto"
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
      "source": "auto"
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
  "source": "ai"
}
```

**source 值：**
- `"ai"` — DeepSeek 成功提取
- `"fallback"` — LLM 失败/无 key 时的空结果

### 9.5 成果综述生成

```
POST /api/practice/media/summarize
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| people | array | 否 | 人物列表 |
| metricValues | array | 否 | 指标值列表 |
| materials | array | 否 | 材料列表 |
| topic | string | 否 | 选题方向 |
| village | string | 否 | 目标村 |

**成功响应** `200`（恒 200）：
```json
{
  "summary": "本次实践围绕陈家铺村开展非遗文化挖掘...",
  "highlights": ["完成 3 位手艺人深度访谈", "产出竹编工艺影像 45 条"],
  "source": "ai"
}
```

### 9.6 图片描述

```
POST /api/practice/media/describe-image
Content-Type: multipart/form-data
```

**表单字段**：file（图片）+ dossierId。

**成功响应** `200`：
```json
{
  "available": true,
  "description": "三位老人在村落广场上编织竹篮，背景是古色古香的徽派建筑"
}
```

**不可用时**：
```json
{
  "available": false,
  "reason": "DeepSeek 当前模型不支持视觉输入"
}
```

### 9.7 ZIP 整包导入

```
POST /api/practice/media/import-zip
Content-Type: multipart/form-data
```

**表单字段**：file（ZIP，≤100MB）+ dossierId。

ZIP 内文件按类型自动归类：文档（抽文本）、图片、表格等。返回分类统计。

**成功响应** `201`：
```json
{
  "dossierId": "dmrfs7e11f23z",
  "total": 15,
  "media": [ ... ],
  "texts": [ ... ]
}
```

---

## 10. 村庄百科接口

村庄列表/详情/标签无需登录；创建/更新/删除暂不鉴权（后续加 admin 中间件）。

### 10.1 村庄列表

```
GET /api/villages?page=1&pageSize=20&q=搜索词&province=浙江省&tag=非遗文化
```

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| pageSize | number | 20 | 每页条数 |
| q | string | — | 村名/全称模糊搜索 |
| province | string | — | 省份筛选 |
| tag | string | — | 标签筛选（如"非遗文化"） |

**成功响应** `200`：
```json
{
  "villages": [
    {
      "id": "chenjiapu",
      "name": "陈家铺村",
      "fullName": "浙江省/丽水市/松阳县/四都乡/陈家铺村",
      "province": "浙江省",
      "city": "丽水市",
      "summary": "悬崖上的古村落，竹编之乡",
      "cover": "/images/chenjiapu.jpg",
      "certLevel": "province",
      "certLabel": "省级传统村落",
      "tags": { "文化类": ["非遗文化", "传统技艺"] },
      "views": 1523,
      "favorites": 87,
      "practices": 5,
      "coordLat": 28.4,
      "coordLng": 119.3
    }
  ],
  "total": 156,
  "page": 1,
  "pageSize": 20
}
```

### 10.2 村庄元数据

```
GET /api/villages/meta
```

**成功响应** `200`：
```json
{
  "provinces": ["浙江省", "安徽省", "福建省", ...],
  "topTags": ["非遗文化", "传统技艺", "特色产业", ...]
}
```

### 10.3 村庄详情

```
GET /api/villages/:id
```

返回村庄完整信息，包括：
- 基础字段（name/fullName/summary/intro/cover/坐标）
- 标量统计（views/favorites/practices）
- JSON 字段（honors/tags/gallery/guide/socials/manager/facts/timeline/specialties/festivals/sections）

### 10.4 创建村庄

```
POST /api/villages
```

请求体对标 villages 表结构。返回 201。

### 10.5 批量导入村庄

```
POST /api/villages/batch
```

**请求体：**
```json
{
  "villages": [ { ... }, { ... } ]
}
```

单次建议 ≤500 条。INSERT OR IGNORE（幂等）。

**成功响应** `201`：
```json
{
  "inserted": 12,
  "skipped": 3,
  "total": 15
}
```

### 10.6 更新村庄

```
PUT /api/villages/:id
```

部分更新：只传需要改的字段。

### 10.7 删除村庄

```
DELETE /api/villages/:id
```

### 10.8 AI 内容增强

```
POST /api/villages/:id/enrich
```

**请求体：**

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| fields | array | ["intro","facts","tags"] | 要生成的字段 |

DeepSeek 生成村庄介绍/事实/标签，自动写回数据库。

> 已有 `source:manual` 内容的字段自动跳过，不会被 AI 覆盖。

### 10.9 AI 生成状态查询

```
GET /api/villages/:id/enrich/status
```

返回各字段当前来源（auto/manual/empty）和 AI 可用性。

---

## 11. 乡村之声接口

全部无需登录（只读 + 计数）。

### 11.1 需求列表

```
GET /api/voice?page=1&pageSize=20&q=词&type=文化挖掘&status=待响应&sort=latest
```

**查询参数：**

| 参数 | 默认值 | 说明 |
|------|--------|------|
| page | 1 | 页码 |
| pageSize | 20 | 每页条数 |
| q | — | 标题搜索 |
| type | — | 类型筛选 |
| status | — | 状态筛选（'待响应' \| '响应中' \| '已完成'） |
| sort | latest | 排序：'latest' \| 'views' \| 'favorites' |

### 11.2 问答列表

```
GET /api/voice/qa
```

返回 QA 列表。

### 11.3 需求详情

```
GET /api/voice/:id
```

### 11.4 浏览数 +1

```
POST /api/voice/:id/view
```

### 11.5 收藏计数增减

```
POST /api/voice/:id/favorite
```

**请求体：**
```json
{ "delta": 1 }
```

delta 为 1（收藏）或 -1（取消收藏）。

---

## 12. 通用规范

### 12.1 分页约定

所有列表接口采用统一分页格式：

**请求参数：**
- `page` — 页码（从 1 开始，默认 1）
- `pageSize` — 每页条数（默认 20）

**响应格式：**
```json
{
  "items": [ ... ],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

> 具体 key 名按接口语义命名（如 `villages`/`dossiers`/`demands` 等）。

### 12.2 鉴权约定

- 登录接口返回 JWT token，客户端存 localStorage
- 后续请求在 `Authorization` 头带 `Bearer <token>`
- token 失效 → 401 → 前端跳转登录页
- 中间件只放 `req.user = { id, username }`，鉴权（队员判定）在 service 层

### 12.3 幂等性

下列操作为幂等：
- 加入队伍（已加入不报错）
- 保存作品（同 id 重复 POST 为覆盖）
- 批量导入村庄（INSERT OR IGNORE）
- 数据库迁移（`CREATE IF NOT EXISTS` + 条件升级）
- 搭建文档 editor/display 类型（同 dossier 同 type 覆盖）

### 12.4 时间格式

所有时间字段使用 ISO 8601 格式：`2026-07-11T00:00:00.000Z`

### 12.5 AI 接口约定

- 所有 AI 接口恒返回 200（不因 AI 失败而报错）
- `source` 字段标明数据来源：`ai` / `template` / `fallback` / `auto` / `manual`
- AI 生成内容附带 `_meta: { source, generator, confidence, generatedAt }`
- `source: manual` 的内容不会被 AI 自动覆盖

---

> 本文档随接口迭代持续更新。新增接口请同步更新本文档。
