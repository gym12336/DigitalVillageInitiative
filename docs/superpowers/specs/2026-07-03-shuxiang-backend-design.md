# 数乡计划 · 后端化(队员在线录入)设计文档

- 作者：gym
- 日期:2026-07-03
- 状态:已确认,待评审
- 关联:延续 [2026-07-02 数乡平台设计](2026-07-02-shuxiang-platform-design.md) 中预留的「远期后端化」

## 1. 背景与目标

现有平台是纯前端 Vue3 应用,村庄数据静态存放在 `src/data/villages.json`,由 6 个组件在编译时 `import` 读取。数据更新需要改代码、重新构建、重新部署。

本次目标:引入后端服务,让实践队员登录后在线新增/编辑村庄信息,保存后网站实时生效,无需改代码。远期(Phase 2)开放给村庄的村民录入。

### Phase 划分

- **Phase 1(本文档范围)**:队员账号登录,新增/编辑村庄(核心字段 + extra 各栏目),支持上传照片/视频,部署后实时更新。
- **Phase 2(远期,非本次范围)**:开放村民注册与录入;可能引入「每队/每村认领」的细粒度权限。数据模型已预留 `role` 字段与审计字段为其铺路。

### 非目标

- 删除村庄或删除历史记录(Phase 1 只做新增 + 编辑)。
- 细粒度权限(如「只能改自己认领的村」)。
- 对象存储 / CDN(Phase 1 用本地磁盘,见第 8 节升级路径)。

## 2. 技术选型

方案 A:**Node + Express + SQLite + 本地文件存储**,单进程跑在一台国内轻量云服务器上。

选型理由:

- 与前端同一语言/生态(团队已在用 Vite/npm),队员易上手。
- SQLite 零配置、单文件,备份即拷贝文件;对 50 人偶尔录入、数十到数百个村庄的规模绰绰有余。
- 单台轻量服务器月成本几十元,便于用学校经费报销。
- 为将来升级到方案 B(PostgreSQL + 对象存储 OSS)留平滑迁移路径(见第 8 节)。

放弃的方案:

- **方案 B(Postgres + OSS)**:对当前规模过度设计,多一套数据库和对象存储的运维与费用。留作 Phase 2 数据量增大后的升级目标。
- **方案 C(Supabase 等 BaaS)**:服务器在海外,面向国内村民访问慢/不稳;长期依赖境外第三方,不利于经费报销与数据自主。

## 3. 整体架构

```
DigitalVillageInitiative/
├── src/                # 现有前端 (Vue3)。改动:数据来源从静态 import 改为 API 调用
│   ├── lib/api.js      # 新增:统一数据层,封装 fetch
│   ├── views/LoginView.vue        # 新增:登录页
│   └── modules/admin/             # 新增:录入/编辑页
├── server/             # 新增后端 (Node + Express)
│   ├── index.js        # 入口,启动 Express,同时托管 API 与前端静态文件
│   ├── db.js           # SQLite 连接 + 建表 + 种子导入
│   ├── seed.js         # 首次启动时导入 villages.json 的逻辑
│   ├── routes/
│   │   ├── auth.js     # 登录、当前用户
│   │   └── villages.js # 村庄 增/改/查
│   ├── middleware/
│   │   └── auth.js     # 校验登录令牌 (JWT)
│   └── uploads/        # 上传的照片/视频(本地磁盘,git 忽略)
└── data.sqlite         # SQLite 数据库文件(git 忽略,服务器上持久化)
```

**运行方式**:一个 Express 进程同时:(1) 提供 `/api/*` 接口;(2) 托管前端 `npm run build` 产出的静态文件。单进程、单端口、单域名,部署最简单。

**数据流的关键变化**:6 个 Vue 组件由编译时 `import villages from '@/data/villages.json'` 改为运行时 `fetch('/api/villages')`。队员保存后,任何人刷新页面即见新数据,实现「部署后实时修改」。

**兼容性 / 种子数据**:后端首次启动且数据库为空时,自动把现有 `villages.json` 的 6 条数据导入 SQLite 作为种子。`villages.json` 保留作备份/回退,不再作为运行时数据源。

## 4. 数据库与数据模型

SQLite 两张表。

### users 表(账号)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| username | TEXT UNIQUE | 登录名(队员或分队),唯一 |
| password_hash | TEXT | 密码哈希(bcrypt,不存明文) |
| display_name | TEXT | 显示名,如「第 3 队 张三」 |
| role | TEXT | 角色:`member`/`villager`/`admin`。Phase 1 主要用 `member` 与 `admin`;字段现在就预留 |
| created_at | TEXT | 创建时间(ISO 字符串) |

### villages 表(村庄)

核心字段与现有 JSON 完全一致,`extra` 整块存为一列 JSON 文本:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 村庄标识(如 `xiaozhuwan`),沿用现有 id |
| name | TEXT | 村名 |
| fullName | TEXT | 全称 |
| province / city / district | TEXT | 省 / 市 / 区县 |
| adcode | TEXT | 行政区划代码 |
| coord | TEXT | 经纬度 `[lng,lat]`,存为 JSON 文本 |
| type | TEXT | 村庄类型 |
| summary | TEXT | 简介 |
| cover | TEXT | 封面图相对路径 |
| status | TEXT | 状态(样板试点/候选村等) |
| extra | TEXT | history/people/resources/media/route/outcomes 整体存为 JSON 文本 |
| updated_by | INTEGER | 最后修改者,关联 users.id |
| updated_at | TEXT | 最后修改时间(ISO 字符串) |

**为什么 extra 整存 JSON 而不拆表**:extra 是自由、嵌套的数组结构,拆表会带来大量 join 与维护成本,而对本项目规模无查询收益。整块读写 JSON 让前端拿到的数据结构与现在**完全一致**,6 个组件读取逻辑几乎不改。

**审计字段**:`updated_by` + `updated_at` 落实「改动可追溯是谁做的」。

**媒体文件**:media 条目中的照片/视频在表里只存**相对路径**(如 `/uploads/xxx.jpg`),真实文件存于 `server/uploads/` 磁盘。

## 5. API 接口

全部挂在 `/api` 下,JSON 通信。

### 认证

- `POST /api/auth/login` — body: `{ username, password }`;验证通过返回 `{ token, user }`(JWT)。前端存储 token,后续写操作携带 `Authorization: Bearer <token>`。
- `GET /api/auth/me` — 凭 token 返回当前用户 `{ id, username, display_name, role }`。

### 村庄

- `GET /api/villages` — 返回全部村庄列表。**公开**(游客可浏览地图与主页)。前端 6 个组件的数据来源。
- `GET /api/villages/:id` — 单个村庄详情。**公开**。
- `POST /api/villages` — 新增村庄。**需登录**。写库前用核心字段校验(复用 `validateVillages` 逻辑)。记录 `updated_by`。
- `PUT /api/villages/:id` — 编辑村庄,整体覆盖核心字段 + extra。**需登录**。更新 `updated_by` / `updated_at`。

### 文件

- `POST /api/upload` — 上传单个照片/视频文件(multipart)。**需登录**。返回 `{ path: "/uploads/xxx.jpg" }`。队员在录入界面选文件 → 先上传拿路径 → 再把路径填入 media 条目随村庄一起保存。

### 权限规则

- **读全部公开**(游客能浏览),**写全部需登录**。
- Phase 1:任何登录队员可编辑任何村(小团队,靠 `updated_by` 追溯即可)。「每队只能改认领的村」推迟到 Phase 2。

### 统一错误格式

- 响应体 `{ error: "信息" }`,配合 HTTP 状态码:400 参数错、401 未登录/令牌无效、404 找不到、500 服务器错。

## 6. 前端改动

- 新增登录页 `/login`。
- 新增录入/编辑页 `/admin/village/:id?`(带 id 编辑,不带新增)。表单按 extra 栏目分区(基本信息 / 历史 / 人物 / 资源 / 媒体 / 路线 / 成果);数组栏目支持增删条目行;媒体条目可选文件上传。
- 新增 `src/lib/api.js` 统一数据层,封装 fetch。现有 6 个组件(HomeView、VillageListView、VillageDetailView、MediaView、PeopleView、RankingView)把 `import villages.json` 改为调用 api.js。组件拿到的数据结构不变,改动集中于数据层。
- 登录令牌存 localStorage。录入页在路由导航守卫中检查登录态,未登录跳 `/login`。

## 7. 错误处理与测试

### 错误处理

- 后端:统一 `{ error }` + HTTP 状态码(见 5)。写库前校验核心字段。
- 前端:登录失败、保存失败给明确提示;网络错误时页面不白屏,退回「数据加载失败」占位(呼应原设计「扩展区为空不报错」的思路)。

### 测试

- 后端:**Vitest**(与前端同一套)+ supertest 测接口:登录、鉴权拦截、新增/编辑村、上传。使用临时 SQLite 文件,不触碰真实数据。
- 前端:沿用现有 Vitest;`api.js` 用 mock fetch 单测;录入表单测校验与提交。
- 现有纯函数测试(`villages.js`、`villageResources.js`)不受影响,继续通过。

## 8. 部署与升级路径

### 部署

- 一台国内轻量云服务器。`npm run build` 构建前端;Node 启动 `server/index.js`,同时托管 API 与静态文件。
- `data.sqlite` 与 `server/uploads/` 需在服务器上持久化并定期备份(拷贝文件即可)。
- 配置域名(注意国内公网服务通常需备案)。

### 升级到方案 B(Phase 2 及以后,数据量增大时)

- **数据库**:SQLite → PostgreSQL。因 extra 已整存 JSON、接口层已隔离,迁移主要是替换 `db.js` 的连接与建表,路由层基本不动。
- **文件**:本地 `uploads/` → 对象存储 OSS。因表里只存相对路径、上传逻辑集中在 `/api/upload`,只需改该接口的落盘目标与返回 URL。

## 9. 安全说明

- 密码用 bcrypt 哈希,绝不存明文。
- 写接口全部经 JWT 鉴权中间件。
- 上传接口需登录,并限制文件类型(图片/视频)与大小,防止滥用。
- JWT 密钥、管理员初始口令等通过环境变量注入,不写入代码仓库。
