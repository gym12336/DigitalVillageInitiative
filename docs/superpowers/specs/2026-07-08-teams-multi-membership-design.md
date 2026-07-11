# 「实践队」多队成员与队伍中枢设计文档

- 作者：gym
- 日期：2026-07-08
- 落地：把「我的实践」从「一人一队」升级为「用户可随时建队/加入多个队，实践活动隶属对应队，队内可见队员信息」
- 关联：[「我的实践」后端与数据库设计](./2026-07-07-my-practice-backend-design.md)、[数乡计划内容规划](../../../设计文档.md)

---

## 0. 目标、范围与决策

### 目标

现有后端是「一人一队」：`users.team_id` 单一外键，队伍由固定邀请码 `TEAM-01..05` 预置，无建队、无队员可见性。本次升级让用户能**随时创建实践队或用邀请码加入**，**同时属于多个队**，实践活动在**对应队下**创建并隶属该队，队内可查看队员信息。

### 已确认的四项关键决策

1. **多队成员**：一个用户可同时属于多个实践队 → 引入 `memberships` 关联表（user↔team 多对多）。
2. **邀请码自动生成**：建队时后端生成唯一随机邀请码，建队人分享给队友。
3. **队员信息 = 基本信息 + 档案计数**：昵称/用户名、角色（建队人/队员）、加入时间，以及每人在本队建的档案数。
4. **进队后建档**：先进入某个队（当前队上下文），在该队内新建实践，档案自动归属当前队；建档表单不放选队下拉。

### 本期范围

**做：**

- `memberships` 关联表 + 从现有 `users.team_id` 的一次性数据迁移。
- 队伍域接口：建队（自动邀请码）、随时加入（幂等）、列我的队、队详情、队员列表（含档案计数）、退队。
- 档案接口适配多队：所有档案操作显式带 `teamId`，后端按 `memberships` 校验成员身份。
- 前端队伍中枢：登录 → 我的队伍列表（建队/加入/切换）→ 某队工作台（队内实践列表 + 队员信息 + 新建实践）→ 三阶段工作台（不变）。
- 后端 service/lib 与前端数据层的 Vitest 单测；现有基线不回归。

**不做（明确排除，留作后续）：**

- **owner 转让 / 解散队伍**：本期禁止建队人退队（提示「请先解散或转让」），转让与解散留后续。
- **队内角色权限细分**：`role` 仅用于「禁止建队人退队」这一处判定，不影响档案协作（同队皆可读写、仅建档人可删，与 role 无关）。
- **队员移除（踢人）、队伍改名 / 改邀请码**。
- **AI 三函数、成果可视化、文件上传**：延续原后端设计的非目标，不动。

### 成功标准

- 用户能建队并拿到可分享的邀请码；能用邀请码加入任意多个队；重复加入幂等不报错。
- 用户在「我的队伍」列表看到自己加入的所有队；进入某队看到该队实践列表与队员信息（含每人档案计数）。
- 实践档案在对应队下创建并隶属该队；跨队访问（非成员访问某队档案/队员列表）一律 403。
- 现有真实用户/档案经迁移后不丢，`users.team_id` 平滑搬入 `memberships`。
- 后端 service 层与前端数据层有单测；现有测试基线不回归。

---

## 1. 数据模型

在现有 `users` / `teams` / `dossiers` 三表基础上，引入 `memberships` 关联表，并从 `users` 移除单一 `team_id`。

```sql
-- 队伍：新增 created_by（建队人）；invite_code 改为随机生成
CREATE TABLE teams (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  invite_code  TEXT NOT NULL UNIQUE,                    -- 系统自动生成的随机码
  created_by   INTEGER NOT NULL REFERENCES users(id),   -- 建队人（审计 + 队员列表标记）
  created_at   TEXT NOT NULL
);

-- ★新增：成员关系（user ↔ team 多对多）
CREATE TABLE memberships (
  user_id    INTEGER NOT NULL REFERENCES users(id),
  team_id    INTEGER NOT NULL REFERENCES teams(id),
  role       TEXT NOT NULL DEFAULT 'member',            -- 'owner'（建队人）| 'member'
  joined_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, team_id)                        -- 同队不重复加入
);
CREATE INDEX idx_memberships_team ON memberships(team_id);
CREATE INDEX idx_memberships_user ON memberships(user_id);

-- 用户：移除 team_id（成员关系搬到 memberships）
CREATE TABLE users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT NOT NULL UNIQUE,
  password     TEXT NOT NULL,                           -- bcrypt 哈希
  display_name TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL
);

-- 实践档案：结构不变，team_id 仍是每份档案的归属队
CREATE TABLE dossiers (
  id          TEXT PRIMARY KEY,
  team_id     INTEGER NOT NULL REFERENCES teams(id),
  created_by  INTEGER NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL DEFAULT '',
  stage       TEXT NOT NULL DEFAULT 'plan',
  payload     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX idx_dossiers_team_updated ON dossiers(team_id, updated_at);
```

### 说明

- **`users.team_id` 移除**：成员关系全部由 `memberships` 表达，用户可在任意多个队里。这是「一人一队 → 多队」的核心结构变化。
- **`role` 字段**：建队人 `owner`，其余 `member`。本期 role 仅用于「禁止建队人退队」一处；队内档案协作权限不受 role 影响（全队共享读写、仅建档人可删）。
- **`dossiers` 表不动**：每份档案仍靠 `team_id` 归属某个队；变的只是「用户属于多个队」，故建档时要显式带上「当前队」的 id（见 §3）。
- **`teams.created_by` 新增**：建队人审计 + 队员列表标记「建队人」。
- **邀请码**：`invite_code` 仍 `UNIQUE`，值改为后端随机生成（见 §2 建队）。旧的固定码 `TEAM-01..05` 队伍在迁移中保留，仍可用。

---

## 2. API 接口

统一 JSON，错误一律 `{ error }` + 恰当 HTTP 状态码。除注册/登录外，全部需 `Authorization: Bearer <token>`。

### 认证域（`routes/auth.js`）

| 方法 | 路径 | 说明 | 变化 |
|---|---|---|---|
| POST | `/api/auth/register` | 注册 → 返回 token + user | 注册后不再自动属于任何队 |
| POST | `/api/auth/login` | 登录 → 返回 token + user | 不变 |
| GET | `/api/auth/me` | 取当前用户 | **改**：`user` 不再含单个 `team`，改含 `teams: [...]`（我加入的所有队，含 role） |

原 `POST /api/auth/join` **移走** → 归入队伍域 `POST /api/teams/join`（语义更清楚）。

### 队伍域（新增 `routes/teams.js`，全部需登录）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/teams` | 列出**我加入的**队（id/name/role/成员数/我在该队的档案数），供队列表页 |
| POST | `/api/teams` | 建队：`{ name }` → 自动生成 `invite_code`，建队人写入 memberships（role=owner），返回新队（含 invite_code） |
| POST | `/api/teams/join` | 入队：`{ inviteCode }` → 写 memberships（role=member）。已在队里则**幂等**返回，不报错 |
| GET | `/api/teams/:id` | 取单个队详情（校验我是成员），含 invite_code（供分享）、成员数 |
| GET | `/api/teams/:id/members` | 队员列表：每人昵称/用户名、role、joined_at、**在本队的档案计数**（校验我是成员，否则 403） |
| DELETE | `/api/teams/:id/leave` | 退队：删自己的 membership。**建队人（owner）禁止退队**，返回 403「请先解散或转让」 |

### 档案域（`routes/dossiers.js`）—— 适配多队

关键变化：过去「我的队」唯一，现在要**显式指定是哪个队**。

| 方法 | 路径 | 变化 |
|---|---|---|
| GET | `/api/dossiers?teamId=<id>` | **改**：必须带 `teamId`，列出该队档案（校验我是该队成员），含方案 A 预览字段 |
| POST | `/api/dossiers` | **改**：body 里带 `teamId`，校验我是该队成员，档案归属该队 |
| GET | `/api/dossiers/:id` | 权限判定从「单一 team_id 相等」改为「我是该档案所属队的成员」 |
| PUT | `/api/dossiers/:id` | 同上 |
| DELETE | `/api/dossiers/:id` | 同队成员判定之上，再要求 `created_by === 我`（仅建档人可删） |
| POST | `/api/dossiers/import` | **改**：带 `teamId`，导入到指定队；仍单事务全或无、每条重铸 id |

### 认证响应体形状（前后端契约）

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "username": "...",
    "displayName": "...",
    "teams": [
      { "id": 2, "name": "...", "role": "owner" },
      { "id": 5, "name": "...", "role": "member" }
    ]
  }
}
```

`teams` 为空数组表示尚未加入任何队，前端据此引导去建队或输邀请码。响应体绝不含 password。

### 建队人退队与删除档案（已确认默认）

- **建队人退队**：本期**禁止**。`DELETE /api/teams/:id/leave` 若请求者是该队 owner，返回 403「请先解散或转让」。转让/解散留后续。
- **删除档案权限**：维持「我是该档案所属队成员 **且** 我是建档人」才能删，与 role 无关。

---

## 3. 权限判定与鉴权规则

多队后，「我属于哪个队」不再是单值，判定改成**成员关系查询**。三条核心规则都在 service 层做成纯函数（可单测）。

### 中间件 `auth.js` 的变化

现在中间件解 token 后查 `users.team_id` 塞进 `req.user.teamId`。多队后**不再预取队伍**——没有唯一队。改为只放身份：

```js
req.user = { id, username }   // 只放身份，不放 teamId
```

「我是不是某队成员」交给 service 层按需查 `memberships`，中间件保持轻量、无隐式假设。

### 三条核心授权规则

1. **队成员判定** `assertMember(db, userId, teamId)`：查 `memberships` 是否有 `(userId, teamId)` 行。没有 → `403 你不是该队成员`。**所有**带 teamId 的接口（列档案、建档、看队员、看队详情）都过这一关。
2. **档案访问判定**：给定档案 id，先取它的 `team_id`，再 `assertMember(用户, 档案.team_id)`。取代旧的「`dossier.team_id === user.teamId`」。GET/PUT 走这级。
3. **删除额外判定**：在规则 2 之上，再要求 `dossier.created_by === user.id`，否则 `403 只能删除自己创建的档案`。

### 关键点

- **授权一律以后端为准**。前端的「当前队」只是 UI 上下文，每个请求都显式带 `teamId` 并由后端用 `memberships` 校验，前端选了哪个队不影响后端判定。
- **跨队隔离是核心安全用例**：非成员访问某队的档案/队员列表一律 403。单测专门覆盖「A 队成员访问 B 队档案」「非成员看 B 队队员列表」。
- **建队人 owner 特权极小**：本期 owner 仅用于「禁止退队」一处判定，不影响档案协作。

---

## 4. 前端流程与页面

现有前端是「登录 → 输邀请码入队 → 工作台」三态门禁。多队后，「入队」这一步扩成**队伍中枢**：能建队、能加入、能在多个队间切换。采用**干净拆分**：外层队伍中枢/队工作台，内层沿用现有三阶段逻辑。

### 导航层级

```
登录/注册
   ↓
我的队伍列表（新页）── 建队 / 输邀请码加入 / 点某个队进入
   ↓
某个队的工作台 ── 队内实践列表 + 队员信息 + 新建实践
   ↓
某份实践的三阶段工作台（不变）
```

### 页面/组件规划

- **`AuthGate.vue`（改）**：三态收窄为两态——未登录 → 登录/注册；已登录 → 渲染插槽。「输邀请码」从这里移走（不再是登录后唯一必经步骤）。
- **`TeamsView.vue`（新）**：我的队伍列表页。每张队卡显示队名、我的角色、成员数、我在该队的档案数。顶部动作「+ 建队」「输邀请码加入」。空态引导「创建你的第一个实践队」。建队成功后展示邀请码供复制分享。
- **`TeamWorkbench.vue`（新）**：进入某队后的容器。顶部队名 + 「队员」入口 + 邀请码分享按钮；主体是该队实践列表（复用现有卡片墙）+「新建实践」。持有「当前队 id」，向下传给档案接口。
- **`TeamMembers.vue`（新）**：队员列表（昵称、角色标记「建队人」、加入时间、档案计数）。
- **`NewPracticeView.vue`（改）**：建档时从路由/上下文拿「当前队 id」，POST 时带上。表单不加选队下拉（进队后建档）。
- **三个 Stage 视图不变**：纯展示，收 dossier prop、emit update。
- **`MyPracticeView.vue`（拆分）**：其「列表墙 + 三阶段工作台」逻辑拆为外层 `TeamWorkbench`（队上下文 + 队员 + 列表）+ 内层三阶段。

### 前端数据层改动

- **`auth.js`（改）**：`currentUser` 增加 `teams` 列表；新增 `createTeam` / `joinTeam` / `loadMyTeams`。登录态从「是否有 team」改为「是否有当前选中的队」。
- **`api.js`（改）**：新增 teams 域接口调用；档案接口都带 `teamId`。
- **`dossier.js`（改）**：`loadDossiers` / `addDossier` / `migrateLegacyDossiers` 签名加 `teamId` 参数。
- **路由（改）**：`/practice/mine` → 队伍列表；`/practice/mine/team/:teamId` → 该队工作台；`/practice/mine/team/:teamId/new` → 建档。

---

## 5. 迁移与测试策略

### 数据迁移（一次性、幂等）

库里已有真实用户和档案，`users.team_id` 列已存在，迁移必须平滑不丢数据：

1. **建 `memberships` 表**（幂等 `CREATE IF NOT EXISTS`）。
2. **teams 表加 `created_by` 列**（若不存在）。
3. **搬数据**（在删列之前读取旧 `users.team_id`）：遍历 `users` 里 `team_id` 非空的行，为每行插一条 `memberships(user_id, team_id, role, joined_at)`，`joined_at` 用 `users.created_at` 占位。每个老队的 `created_by` 回填为「该队 id 最小的成员」（确定性、可复现），该成员 role=`owner`，其余 `member`。**注意**：预置的 `TEAM-01..05` 若已有成员，也会按此规则产生一名 owner；这是可接受的副作用（这些队本就是实训占位，无真实建队人）。无成员的老队 `created_by` 暂留空占位，本期不强制。
4. **删 `users.team_id` 列**：SQLite 用「建新表 → 拷数据 → 换名」的标准方式，在 `better-sqlite3` 同步事务里做，全或无。
5. 迁移脚本在 `migrate.js` 里按版本/列存在性判断只跑一次；重复启动安全。

### 测试策略（Vitest + 内存库/supertest）

- **`teamService`**：建队生成唯一 invite_code；join 幂等（重复加入不报错、不重复行）；建队人 role=owner；建队人禁止退队。
- **`membershipService` 权限纯函数**：`assertMember` 命中/未命中；跨队访问 403（核心安全用例）。
- **`dossierService`（改造）**：建档/列表/改删按新 `assertMember` 判定；**A 队成员访问 B 队档案 403**；删除仍要求建档人本人。
- **队员列表**：档案计数正确（含 0 份的成员也出现）。
- **迁移脚本单测**：给一个「老 `users.team_id` 结构」的内存库，跑迁移，断言 memberships 正确生成、team_id 列已移除、档案不丢。
- **前端**：`api.js`/`auth.js`/`dossier.js` 的多队接口（mock fetch）；`TeamsView` 空态与建队/加入流程；`dossier.js` 各函数带 `teamId` 参数的契约。
- **路由层 supertest 冒烟**：注册 → 建队 → 拿邀请码 → 另一用户加入 → 双方都在队员列表 → 各自建档 → 跨队访问被拒。

---

## 6. 落地步骤（供实现计划参考）

1. `db/`：schema 加 `memberships` 表、`teams.created_by`、`users` 去 `team_id`；`migrate.js` 写一次性幂等迁移（搬 memberships + 删列）+ 迁移单测。
2. `lib/`：邀请码随机生成器（唯一性由 `UNIQUE` 约束 + 重试保证）+ teams 请求体校验 + 单测。
3. `services/teamService.js`（建队/加入/列我的队/队详情/队员列表含计数/退队）+ `assertMember` 纯函数 + 单测（内存库）。
4. `services/dossierService.js` 改造：授权改用 `assertMember`，接口带 teamId + 单测（跨队 403）。
5. `services/userService.js` + `routes/auth.js`：`/me` 返回 `teams`；移除 `join`。
6. `middleware/auth.js`：`req.user` 只放身份，不预取 teamId。
7. `routes/teams.js` + `routes/dossiers.js`（带 teamId）；`app.js` 挂 `/api/teams`。
8. 前端：`api.js`/`auth.js`/`dossier.js` 多队改造；`TeamsView` / `TeamWorkbench` / `TeamMembers` 新建；`AuthGate` 收窄两态；`MyPracticeView` 拆分；路由改造；对应单测。
9. 全量 `vitest run` 不回归 + `vite build` 通过 + 手动走「注册→建队→拿码→他人加入→各自建档→跨队被拒→看队员计数」闭环。
