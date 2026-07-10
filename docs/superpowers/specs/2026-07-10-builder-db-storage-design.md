# 搭建台数据存储迁移至数据库

**日期：** 2026-07-10
**状态：** 待审查

---

## 背景

当前搭建台（大组件编辑台 + 大屏展示工作台）的所有数据通过 3 个 localStorage key 储存在浏览器中：

| Key | 用途 |
|-----|------|
| `builder-save` | 大组件编辑台画布状态 |
| `builder-display-save` | 大屏展示工作台画布状态 |
| `builder-big-components` | 可复用的大组件模板库 |

这导致以下问题：
- 数据只存在于一台浏览器中，换设备即丢失
- 无法关联到具体的实践档案（dossier）
- 清除浏览器缓存会丢失所有成果

本次改造将储存从 localStorage 迁移到后端数据库（SQLite），并关联到实践档案（dossier）。

---

## 设计决策

| 决策点 | 选择 |
|--------|------|
| 关联层级 | 关联到 Dossier（实践档案），每个 dossier 拥有独立的搭建台数据 |
| 保存时机 | 手动保存（点击保存按钮） |
| 大组件模板作用域 | 按 dossier 隔离，每个实践档案独立的大组件库 |
| 入口方式 | 保留原 BuilderHub 入口 + 从实践模块进入自动带 dossierId |
| 存储模型 | 新增 `builder_documents` 表，遵循项目既有 JSON payload 模式 |

---

## 1. 数据库

### 新表 `builder_documents`

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

### Payload 格式

**type = `editor` / `display`**（画布状态）：

```json
{
  "components": [
    {
      "id": 1,
      "type": "text",
      "x": 100, "y": 200,
      "width": 300, "height": 96,
      "props": { "text": "...", "fontSize": 34, "color": "#1f2937", ... }
    }
  ],
  "pageWidth": 1920,
  "pageHeight": 1080,
  "pageBackground": "#ffffff",
  "nextId": 5
}
```

**type = `big-component`**（大组件模板）：

```json
{
  "children": [
    { "type": "text", "x": 0, "y": 50, "width": 300, "height": 96, "props": { ... } }
  ],
  "totalWidth": 870,
  "totalHeight": 320,
  "thumbnail": "",
  "createdAt": 1720000000000
}
```

### 约束

- 每 dossier 的 `editor` 和 `display` 类型各最多一条（upsert 语义）
- 每 dossier 的 `big-component` 类型可以有任意多条
- dossier 删除时级联删除所有关联的 builder_documents

---

## 2. API

### 路由前缀：`/api/builder`

全部需要 JWT 认证（`authMiddleware`）。

### GET `/api/builder/:dossierId/documents`

查询参数：`type`（必填，`editor` | `display` | `big-component`）

返回：该 dossier 下匹配 type 的文档列表（editor/display 返回最多 1 条；big-component 返回全部）

鉴权：通过 dossier 的 team_id → assertMember

### POST `/api/builder/:dossierId/documents`

请求体：`{ type, name?, payload, id? }`

逻辑：
- `editor` / `display`：同 dossier 同 type 已存在 → 覆盖（UPDATE payload, updated_at）；不存在 → 创建
- `big-component`：始终创建新记录

返回：`{ document: { id, type, name, payload, createdAt, updatedAt } }`

### DELETE `/api/builder/documents/:id`

仅允许删除 `big-component` 类型的文档；禁止删除 `editor` / `display`（通过 type 校验）

鉴权：通过文档所属 dossier 的 team_id → assertMember

### 服务层

新建 `server/services/builderService.js`，核心函数：

- `listByDossier(db, user, dossierId, type)` — 查询并鉴权
- `upsert(db, user, dossierId, { type, name, payload, id })` — 创建或覆盖
- `remove(db, user, documentId)` — 删除（仅 big-component）

授权模式复用：`dossierId` → 查出 `team_id` → `assertMember(db, userId, teamId)`

---

## 3. 前端

### 3.1 路由

保留原有路由，新增带 dossierId 的别名：

| 路径 | 组件 | 说明 |
|------|------|------|
| `/builder` | BuilderHub | 不变 |
| `/builder/editor` | BigComponentEditor | 无上下文（从 Hub 进入） |
| `/builder/editor/:dossierId` | BigComponentEditor | 绑定 dossier |
| `/builder/display` | DisplayWorkbench | 无上下文（从 Hub 进入） |
| `/builder/display/:dossierId` | DisplayWorkbench | 绑定 dossier |

### 3.2 实践模块入口改造

`StageResult.vue` 的「进入成果搭建台 DIY」按钮改为导航到 `/builder/display/:dossierId`。

### 3.3 Dossier 选择器

新建 `DossierPicker.vue` 组件，在 BigComponentEditor 和 DisplayWorkbench 顶部显示：

- 无 dossierId 时：显示下拉选择器，列出当前用户所有团队的实践档案（按团队分组）
- 有 dossierId 时：显示当前关联的 dossier 名称（只读标签），并提供一个「切换」按钮唤出选择器
- 选择/切换后用 `router.replace` 更新 URL 到带 dossierId 的路由，同时触发数据加载
- 未登录时：显示登录入口，复用 `AuthGate.vue`

下拉数据来源：`apiListDossiers(teamId)` 遍历用户所有团队（已有 API，从 `practice/mine/api.js` 引入）。

### 3.4 API 客户端

新建 `src/modules/builder/builderApi.js`。

**不提取公共模块**：直接将 `getToken()` 和 `request()` 从 `src/modules/practice/mine/api.js` 复制到 `builderApi.js`，保持模块独立性。两个模块使用相同的 token key（`sx.mine.token`）和相同的 JWT 认证机制。

导出的 API 函数：

```js
apiLoadDocuments(dossierId, type)            // GET -> [{ id, type, name, payload, ... }]
apiSaveDocument(dossierId, { type, name, payload, id })  // POST -> { document }
apiDeleteDocument(id)                        // DELETE -> {}
```

### 3.5 stageEditor.js 改造

- **移除** `save()` / `load()` 的 localStorage 逻辑
- **新增** `saveToDB(dossierId)` — 调用 `apiSaveDocument(dossierId, { type, payload })`，由调用方决定 type 是 `editor` 还是 `display`
- **新增** `loadFromDB(dossierId, type)` — 调用 `apiLoadDocuments` 并恢复 state
- `saveKey` prop 不再需要，改为使用 `documentType` prop（`'editor'` | `'display'`）

EditorCanvas.vue 的改造：
- `saveKey` prop → 改为 `documentType` prop
- `dossierId` 作为新的 prop 传入
- `onSave()` 调用 `saveToDB(props.dossierId)`
- `onMounted` 中若有 dossierId 则调用 `loadFromDB`

BigComponentEditor.vue 和 DisplayWorkbench.vue 的改造：
- 从 route params 读取 `dossierId`
- 传入 EditorCanvas：`documentType` 和 `dossierId`
- 若没有 dossierId，显示 DossierPicker

### 3.6 bigComponentStore.js 改造

- **移除** localStorage 读写
- **改为** 接收 `dossierId` 参数，调用 API
- `saveBigComponent(dossierId, name, children)` → `POST /api/builder/:dossierId/documents` with `type: 'big-component'`
- `loadBigComponents(dossierId)` → `GET /api/builder/:dossierId/documents?type=big-component`
- `deleteBigComponent(id)` → `DELETE /api/builder/documents/:id`

### 3.7 DisplayComponentLibrary.vue 改造

- 接收 `dossierId` prop
- 用 `dossierId` 调用 `loadBigComponents(dossierId)` 加载该 dossier 的大组件

---

## 4. 数据迁移

不强制——现有 localStorage 数据作为浏览器遗留，用户可以继续在浏览器中访问旧数据。数据库是一个新的存储层，首次使用时 data 为空，需用户手动保存。

如果将来需要迁移工具，可单独做一个「从 localStorage 导入」功能，但不在本次范围内。

---

## 5. 实施顺序

1. **数据库**：`schema.sql` 新表 + `migrate.js` 执行
2. **后端**：`builderService.js` + `builder` 路由 + `app.js` 注册
3. **前端基础设施**：`builderApi.js` + 提取共享 `request()`
4. **路由**：新增带 dossierId 的路由
5. **DossierPicker 组件**
6. **改造 EditorCanvas**：`saveKey` → `documentType` + `dossierId`
7. **改造 BigComponentEditor / DisplayWorkbench**：读 route params，传 props
8. **改造 bigComponentStore / DisplayComponentLibrary**：API 替代 localStorage
9. **实践模块入口**：StageResult 导航带 dossierId
10. **验证**：端到端测试保存/加载流程
