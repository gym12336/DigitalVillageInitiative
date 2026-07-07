# 「我的实践」后端与数据库设计文档

- 日期：2026-07-07
- 落地：为现有「乡村实践 · 我的实践」子目录建后端，把实践档案从 localStorage 迁到服务器
- 定位：最小可用后端——只做**认证**与**档案持久化**两件事，为将来接真实 LLM / 文件上传预留接缝
- 关联：[数乡计划内容规划](../../../设计文档.md)、[我的实践设计](./2026-07-07-my-practice-design.md)、[新建实践表单设计](./2026-07-07-new-practice-form-design.md)、[成果可视化生成工具设计](../../../2026-07-06-practice-result-visualizer-design.md)

---

## 0. 目标、范围与技术选型

### 目标

「我的实践」目前是纯前端模块，实践档案存在浏览器 localStorage，无法跨设备、无法多人协作、无法追溯。本次为它建后端，让 50 名队员分 5 队各自的实践档案可登录、可跨设备、可队内共享。

### 本期范围（明确取舍）

**做：**

- 用户注册 / 登录（JWT 鉴权）。
- 自助注册 + 邀请码入队；档案**团队共享**（同队队员都能看、能改）。
- 实践档案的服务端持久化（SQLite），替换 localStorage。
- 旧 localStorage 档案的一次性迁移。

**不做（明确排除，留作后续）：**

- **AI 逻辑仍在前端**：`retrieval.js` / `planGen.js` / `gapAnalysis.js` 三个规则版纯函数与其静态 JSON 数据源保持在前端不动。它们无状态、无隐私、无需服务器，是日后升级为服务端 LLM 调用的接缝，但不在本期。
- **文件上传**：材料仍只存元数据（名称/类型/备注），不存文件实体。`server/uploads/` 不在本期。
- **成果可视化 Spec 编译/渲染**：属[独立可视化项目](../../../2026-07-06-practice-result-visualizer-design.md)，不在本期。

### 成功标准

- 队员能注册、登录、用邀请码入队。
- 登录后能新建/编辑/删除档案，数据存服务器，换设备/换浏览器登录后档案仍在。
- 同队队员能看到并编辑彼此的档案；跨队访问被拒（返回 403）。
- 首次登录检测到本机旧 localStorage 档案时，能一次性迁移到队伍。
- 后端 service 层与 lib 有 Vitest 单测；现有前端测试基线不回归。

### 技术选型

设计文档 §7 已定 **Node + Express + SQLite + JWT**，本设计照此执行，不引入新框架。具体：

- **SQLite 驱动**：`better-sqlite3`——同步 API、单文件、零配置。本次唯一新增的重量级依赖。
- **密码哈希**：`bcryptjs`——纯 JS，免原生编译，Windows 上安装干净。
- **JWT**：`jsonwebtoken`。
- **不引入 ORM**：表仅 3 张，手写参数化 SQL 更透明、更可讲解，符合项目「核心逻辑人工可讲解」规范。

**已考虑但不采用的替代方案：**

- `lowdb` / 纯 JSON 文件当库：省一个依赖，但并发写会丢数据，且失去 SQL 可讲解性。
- Prisma ORM：对 3 张表是杀鸡用牛刀，引入代码生成步骤，拖慢实训节奏。
- `sql.js`（纯 JS SQLite）：作为 `better-sqlite3` 在极少数无法编译原生二进制的环境下的兜底备选，本期默认不用。

---

## 1. 整体架构与目录结构

后端是独立 Express 进程，与前端 Vite 开发服务器并存。开发期前端通过 Vite proxy 把 `/api` 转发到后端（默认 `localhost:3001`）；生产期 Express 同时托管 `dist/` 静态资源 + `/api`，单进程部署。

后端只做**认证**与**档案持久化**。AI 三函数与检索用静态 JSON 保持在前端。

```
DigitalVillageInitiative/
├── server/
│   ├── index.js              # Express 入口：装中间件、挂路由、生产期托管 dist/
│   ├── db/
│   │   ├── connection.js     # 打开 SQLite 单例（better-sqlite3）
│   │   ├── schema.sql        # 建表 DDL（users / teams / dossiers）
│   │   └── migrate.js        # 启动时幂等建表 + 可选 seed 5 支队邀请码
│   ├── middleware/
│   │   ├── auth.js           # ★JWT 校验中间件：解 token → req.user
│   │   └── errorHandler.js   # 统一错误出口 → { error } + 状态码
│   ├── routes/
│   │   ├── auth.js           # 注册 / 登录 / 入队 / 取当前用户
│   │   └── dossiers.js       # 档案 CRUD（全部需登录 + 队伍鉴权）
│   ├── services/
│   │   ├── userService.js    # 用户/队伍读写 + 密码哈希校验（纯逻辑，可测）
│   │   └── dossierService.js # 档案读写 + 权限判定（纯逻辑，可测）
│   └── lib/
│       ├── token.js          # 签发/校验 JWT（可测）
│       └── validate.js       # 请求体字段校验（可测）
├── server/data/              # SQLite 文件落地（gitignore），不入仓
├── src/modules/practice/mine/
│   ├── api.js                # ★新增：前端 API 客户端，替换 dossier.js 的 localStorage
│   ├── auth.js               # ★新增：前端 token 存取 + 登录态
│   └── dossier.js            # 改：内部实现从 localStorage 切到调 api.js（对外契约不变）
└── .env                      # JWT_SECRET 等，不入仓
```

### 分层职责

- `routes`：只管 HTTP（解析请求、调 service、回响应）。
- `services`：可单测的纯业务逻辑，不碰 req/res。能脱离 Express 单测，符合项目「核心逻辑纯函数可讲解」规范。
- `middleware`：横切鉴权与错误。
- `lib`：无依赖工具。

### 关键设计决策：把冲击隔离在 `dossier.js` 内部

`dossier.js` 对视图层的导出签名**完全不变**（`loadDossiers` / `addDossier` / `updateDossier` / `removeDossier` / `getDossier` / `setStage`），只是内部从读写 localStorage 改成 `await` 调 `api.js`。三个 Stage 视图组件的**结构**几乎不用改。唯一变化：这些函数从同步变异步，调用处需加 `await` 并处理 loading/错误态。这是把 localStorage 换成后端时改动面最小的路径。

---

## 2. 数据模型（3 张表）

SQLite，3 张表。档案主体沿用现有 dossier 的 JSON 结构，**整体存一列 `payload`**——dossier 是深层嵌套对象（plan / refs / collected.metricValues…），前端已围绕这个结构写好全部逻辑；拆成关系表会逼前端重构，得不偿失。查询只按 team_id 过滤，不需要在 JSON 内部做 SQL 检索。

```sql
-- 用户
CREATE TABLE users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT NOT NULL UNIQUE,        -- 登录名
  password     TEXT NOT NULL,               -- bcrypt 哈希，绝不存明文
  display_name TEXT NOT NULL DEFAULT '',    -- 昵称（可选）
  team_id      INTEGER REFERENCES teams(id),-- 所属队，注册后经邀请码填入，可空
  created_at   TEXT NOT NULL
);

-- 队伍
CREATE TABLE teams (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,               -- 队名
  invite_code  TEXT NOT NULL UNIQUE,        -- 入队邀请码
  created_at   TEXT NOT NULL
);

-- 实践档案
CREATE TABLE dossiers (
  id          TEXT PRIMARY KEY,             -- 沿用前端 genId 生成的字符串 id
  team_id     INTEGER NOT NULL REFERENCES teams(id),  -- 归属队（团队共享）
  created_by  INTEGER NOT NULL REFERENCES users(id),  -- 建档人（审计）
  title       TEXT NOT NULL DEFAULT '',     -- 从 payload 冗余提升，供列表页展示/排序
  stage       TEXT NOT NULL DEFAULT 'plan', -- 同上，'plan'|'track'|'result'
  payload     TEXT NOT NULL,                -- 完整 dossier JSON（plan/refs/collected/…）
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX idx_dossiers_team ON dossiers(team_id);
```

### 说明

- `dossiers.id` 用 `TEXT` 而非自增——沿用前端 `dossier.js` 里 `genId()` 已生成的字符串 id。前端建档时把 id 一起 POST 上来，避免前后端 id 体系割裂，也让现有 localStorage 数据能平滑导入。
- `title` / `stage` 从 `payload` 冗余提升为独立列——列表页只需这两个字段，避免为渲染列表去解析每份档案的完整 JSON。写档案时两处同步更新。
- `team_id` 可空只在 `users` 上（注册后、入队前的过渡态）；`dossiers.team_id` 非空——没入队不能建档。
- 档案里的 `refs`（采纳的检索卡片）、`collected`（手填指标/材料/人物）全在 `payload` 里，后端不拆解、不理解，只做整存整取。材料仍只存元数据，不涉文件实体。

---

## 3. API 接口

统一 JSON，错误一律 `{ error: "信息" }` + 恰当 HTTP 状态码。除注册/登录外，全部需 `Authorization: Bearer <token>`。

### 认证域（`routes/auth.js`）

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| POST | `/api/auth/register` | 注册：`{ username, password, displayName? }` → 建用户，返回 token + user | 否 |
| POST | `/api/auth/login` | 登录：`{ username, password }` → 校验哈希，返回 token + user | 否 |
| POST | `/api/auth/join` | 入队：`{ inviteCode }` → 查队、写 user.team_id，返回更新后的 user | 是 |
| GET | `/api/auth/me` | 取当前登录用户（含 team 信息），供前端刷新后恢复登录态 | 是 |

### 档案域（`routes/dossiers.js`，全部需登录且限本队）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/dossiers` | 列出**本队**全部档案（轻量：id/title/stage/updated_at，不返回完整 payload） |
| GET | `/api/dossiers/:id` | 取单份档案完整数据（校验属本队） |
| POST | `/api/dossiers` | 新建：body 是完整 dossier 对象（含前端生成的 id）→ 落库，归属本队 |
| PUT | `/api/dossiers/:id` | 全量更新一份档案的 payload + title + stage（校验属本队） |
| DELETE | `/api/dossiers/:id` | 删除（校验属本队） |

### 鉴权规则

`auth.js` 中间件解出 `req.user`（含 team_id）；档案路由先查目标档案的 team_id 是否等于 `req.user.team_id`，不等返回 `403`。没入队（team_id 空）访问档案接口一律 `403` 并提示「请先加入队伍」。

### 认证响应体形状（前后端契约）

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "username": "...",
    "displayName": "...",
    "team": { "id": 2, "name": "..." }
  }
}
```

`user.team` 为 `null` 表示尚未入队，前端据此引导去输邀请码。响应体绝不含 password 字段。

---

## 4. 前端从 localStorage 切到后端

原则：把冲击隔离在 `dossier.js` 内部。

1. **新增 `mine/auth.js`**：管 token（存 localStorage，key `sx.mine.token`）、当前 user、登录/注册/入队/登出调用。提供响应式登录态供视图判断显示登录页还是工作台。
2. **新增 `mine/api.js`**：薄封装 `fetch`，自动带 `Authorization` 头，统一解 `{ error }`。所有档案接口调用集中在此。
3. **改 `dossier.js`**：导出函数名与语义不变，内部实现从「读写 localStorage」改成「调 `api.js`」。因涉及网络，函数由同步变 `async`（`loadDossiers()` → `await loadDossiers()`）。三个 Stage 视图与 `MyPracticeView` 里的调用处相应加 `await`，并处理 loading/错误态。
4. **登录门禁**：`MyPracticeView`（或路由守卫）检查登录态——未登录显示登录/注册表单，未入队显示邀请码表单，已入队才进工作台。
5. **一次性迁移**：首次登录后，若检测到旧 localStorage 里有 `sx.mine.dossiers`，提示用户「检测到本机旧档案，是否上传到你的队伍？」，逐条 POST 后清掉本地键。让现有 demo 数据不白丢。

**契约保持**：AI 三函数（retrieval/planGen/gapAnalysis）入出参完全不变，仍在前端本地跑。它们产出的 refs/plan 只是被塞进 dossier 对象，随 POST/PUT 整体存库。

**取舍**：把 `dossier.js` 从同步改异步会波及所有调用点，是不可避免的一次性成本；好处是视图组件的结构不变，只加 await 与错误处理，不用重写。

---

## 5. 错误处理与安全

- **统一错误出口**：`errorHandler.js` 兜所有抛出的错误，返回 `{ error }` + 状态码：400 参数错 / 401 未登录或 token 失效 / 403 越权 / 404 不存在 / 409 用户名已存在或邀请码无效 / 500 兜底。service 层用抛带 `status` 的错误对象表达业务失败。
- **密码**：`bcryptjs` 哈希（cost 10），库里绝不存明文，响应体绝不回传 password。
- **JWT**：`JWT_SECRET` 经 `.env` 注入（不入仓）；token 载荷存 `{ userId }`，有效期 7 天；中间件校验签名与过期。
- **输入校验**：`lib/validate.js` 在入库前校验必填字段与长度上限（username/password 长度、payload 大小上限防撑爆），防脏数据。
- **越权防护**：所有档案接口都过「目标档案 team_id === 当前用户 team_id」判定，单元测试专门覆盖跨队访问返回 403。
- **SQL 注入**：全部用 better-sqlite3 参数化预处理语句（`?` 占位），不拼字符串。
- **CORS**：开发期允许 Vite 源；生产期同源托管无需 CORS。
- **.gitignore**：补 `server/data/`（SQLite 文件）、`.env`。

---

## 6. 测试

沿用 Vitest，新增后端 service 层与 lib 单测，现有前端基线不回归。

- **`lib/token.js`**：签发的 token 能被自己校验通过；篡改/过期 token 校验失败。
- **`lib/validate.js`**：合法/非法请求体的边界用例。
- **`services/userService.js`**：注册后密码是哈希（非明文）且能校验通过；重复用户名报冲突；错误邀请码入队失败；正确邀请码写入 team_id。
- **`services/dossierService.js`**：建/读/改/删往返一致；**跨队访问被拒（核心安全用例）**；列表只返回本队档案。
- service 单测用**内存 SQLite**（`better-sqlite3` 传 `:memory:`），每例建全新库，不碰真实文件、不需 mock。
- **前端** `dossier.js` 改异步后，原 `mine-dossier.test.js` 相应改造（mock `api.js`），验证契约不变。
- 路由层（HTTP）本期用轻量 supertest 冒烟即可，重逻辑都在可单测的 service 层。

---

## 7. 落地步骤（供实现计划参考）

1. 装依赖（`express` / `better-sqlite3` / `bcryptjs` / `jsonwebtoken` / `supertest`）；补 `.gitignore` 与 `.env`。
2. `db/`：schema.sql + connection.js + migrate.js（幂等建表 + seed 5 支队邀请码）。
3. `lib/token.js`、`lib/validate.js` + 单测。
4. `services/userService.js`、`services/dossierService.js` + 单测（内存库）。
5. `middleware/auth.js`、`middleware/errorHandler.js`。
6. `routes/auth.js`、`routes/dossiers.js`；`server/index.js` 组装。
7. Vite proxy 配置 `/api` → 后端。
8. 前端：`mine/auth.js`、`mine/api.js`；改 `dossier.js` 为异步调 API；调用处加 await；登录门禁 UI；一次性迁移。
9. 全量 `vitest run` 不回归 + `vite build` 通过 + 手动走「注册→入队→建档→跨设备登录→档案仍在」闭环。
